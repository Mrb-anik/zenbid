/**
 * CustomDomainSettings.tsx
 * ─────────────────────────────────────────────────────────────────
 * White-label custom domain configuration panel.
 *
 * Architecture:
 *   - Cloudflare Custom Hostnames handles SSL + routing
 *   - Vercel frontend serves all custom domains via wildcard
 *   - We store domain + verification status in organizations table
 *   - Admin enters domain → we show DNS instructions → poll for verify
 *
 * DNS Setup required from tenant:
 *   CNAME portal.theirdomain.com → cname.vercel-dns.com (or similar)
 *   TXT _cf-custom-hostname.portal.theirdomain.com → <verification_id>
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import {
  Globe, CheckCircle2, XCircle, Clock, Copy, RefreshCw,
  ExternalLink, Shield, Zap, AlertTriangle, Info,
} from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useOrganization } from '../../providers/OrganizationProvider';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────

interface DomainState {
  custom_domain: string | null;
  custom_domain_verified: boolean;
  cloudflare_ssl_status: string | null;
}

// ─── Component ─────────────────────────────────────────────────────

export function CustomDomainSettings() {
  const { organization, refreshOrganization } = useOrganization();
  const [domainInput, setDomainInput] = useState('');
  const [domainState, setDomainState] = useState<DomainState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Load current domain config
  useEffect(() => {
    if (!organization?.id) return;
    supabase
      .from('organizations')
      .select('custom_domain, custom_domain_verified, cloudflare_ssl_status')
      .eq('id', organization.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDomainState(data as DomainState);
          setDomainInput(data.custom_domain ?? '');
        }
        setLoading(false);
      });
  }, [organization?.id]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveDomain = async () => {
    if (!organization?.id || !domainInput.trim()) return;

    // Basic format validation
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
    if (!domainRegex.test(domainInput.trim())) {
      toast.error('Invalid domain format. Use: portal.yourdomain.com');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          custom_domain: domainInput.trim().toLowerCase(),
          custom_domain_verified: false,
          cloudflare_ssl_status: 'pending',
        })
        .eq('id', organization.id);

      if (error) throw error;

      setDomainState({
        custom_domain: domainInput.trim().toLowerCase(),
        custom_domain_verified: false,
        cloudflare_ssl_status: 'pending',
      });

      await refreshOrganization();
      toast.success('Domain saved. Follow the DNS instructions below to verify.');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save domain');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!organization?.id) return;
    setVerifying(true);
    try {
      // In production this calls a Supabase Edge Function which
      // queries Cloudflare Custom Hostnames API to check status.
      // For now we simulate a check by re-fetching.
      const { data, error } = await supabase
        .from('organizations')
        .select('custom_domain_verified, cloudflare_ssl_status')
        .eq('id', organization.id)
        .single();

      if (error) throw error;

      setDomainState(prev => prev ? { ...prev, ...data } : null);

      if (data?.custom_domain_verified) {
        toast.success('Domain verified! Your white-label portal is live.');
        await refreshOrganization();
      } else {
        toast.info('Domain not yet verified. DNS changes can take up to 48 hours to propagate.');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Verification check failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!organization?.id) return;
    if (!confirm('Remove custom domain? Your white-label portal will be disabled.')) return;

    setRemoving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          custom_domain: null,
          custom_domain_verified: false,
          cloudflare_ssl_status: null,
        })
        .eq('id', organization.id);

      if (error) throw error;

      setDomainState({ custom_domain: null, custom_domain_verified: false, cloudflare_ssl_status: null });
      setDomainInput('');
      await refreshOrganization();
      toast.success('Custom domain removed');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to remove domain');
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-5 h-5 animate-spin text-copper" />
      </div>
    );
  }

  const hasDomain = !!domainState?.custom_domain;
  const isVerified = domainState?.custom_domain_verified === true;
  const sslStatus = domainState?.cloudflare_ssl_status;

  const cnameTarget = 'cname.vercel-dns.com';
  const verifyTxtRecord = `_cf-custom-hostname.${domainState?.custom_domain ?? 'yourdomain.com'}`;

  return (
    <div className="space-y-5">

      {/* Section title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Globe className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">White-Label Custom Domain</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Serve your portal at your own domain with full SSL via Cloudflare
          </p>
        </div>
        {hasDomain && (
          <div className="ml-auto flex items-center gap-1.5">
            {isVerified ? (
              <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                <CheckCircle2 className="w-3 h-3" /> Verified & Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                <Clock className="w-3 h-3" /> Pending DNS
              </span>
            )}
          </div>
        )}
      </div>

      {/* Domain input */}
      <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900/50 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-2">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Custom Domain
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={domainInput}
                  onChange={e => setDomainInput(e.target.value.toLowerCase())}
                  placeholder="portal.yourcompany.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-navy border border-slate-200 dark:border-navy-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-copper focus:ring-1 focus:ring-copper/30 transition-all"
                />
              </div>
              <button
                onClick={handleSaveDomain}
                disabled={saving || !domainInput.trim()}
                className="px-4 py-2.5 bg-copper hover:bg-copper-hover text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-sm hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Domain'}
              </button>
            </div>
          </div>
        </div>

        {/* Architecture info */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <p><span className="text-blue-300 font-semibold">Cloudflare Custom Hostnames</span> handles SSL provisioning, WAF, and edge protection automatically.</p>
            <p>Your frontend is served from Vercel's global edge network with zero downtime deployments.</p>
          </div>
        </div>
      </div>

      {/* DNS Instructions — shown only after domain is saved */}
      {hasDomain && (
        <div className="rounded-2xl border border-slate-200 dark:border-navy-700 overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-navy-900/80 border-b border-slate-200 dark:border-navy-700 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-copper" /> DNS Configuration Required
            </h4>
            {!isVerified && (
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg bg-copper/10 text-copper hover:bg-copper/20 font-bold transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${verifying ? 'animate-spin' : ''}`} />
                Check Verification
              </button>
            )}
          </div>

          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add these DNS records at your domain registrar or DNS provider. Changes can take up to 48 hours to propagate.
            </p>

            {/* DNS Records Table */}
            <div className="space-y-3">
              {/* CNAME Record */}
              <div className="rounded-xl border border-slate-200 dark:border-navy-700 overflow-hidden">
                <div className="px-4 py-2 bg-emerald-500/5 border-b border-slate-200 dark:border-navy-700 flex items-center gap-2">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">Step 1: CNAME Record</span>
                </div>
                <div className="p-4 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Type</div>
                    <code className="text-slate-900 dark:text-white font-mono font-bold">CNAME</code>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Name / Host</div>
                    <div className="flex items-center gap-1.5">
                      <code className="text-slate-900 dark:text-white font-mono text-[11px] truncate">{domainState?.custom_domain}</code>
                      <button onClick={() => handleCopy(domainState?.custom_domain ?? '', 'cname-name')} className="shrink-0 text-slate-400 hover:text-copper">
                        {copied === 'cname-name' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Value / Target</div>
                    <div className="flex items-center gap-1.5">
                      <code className="text-slate-900 dark:text-white font-mono text-[11px] truncate">{cnameTarget}</code>
                      <button onClick={() => handleCopy(cnameTarget, 'cname-val')} className="shrink-0 text-slate-400 hover:text-copper">
                        {copied === 'cname-val' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* TXT Verification Record */}
              <div className="rounded-xl border border-slate-200 dark:border-navy-700 overflow-hidden">
                <div className="px-4 py-2 bg-blue-500/5 border-b border-slate-200 dark:border-navy-700 flex items-center gap-2">
                  <Shield className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">Step 2: TXT Verification Record</span>
                </div>
                <div className="p-4 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Type</div>
                    <code className="text-slate-900 dark:text-white font-mono font-bold">TXT</code>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Name / Host</div>
                    <div className="flex items-center gap-1.5">
                      <code className="text-slate-900 dark:text-white font-mono text-[11px] break-all">{verifyTxtRecord}</code>
                      <button onClick={() => handleCopy(verifyTxtRecord, 'txt-name')} className="shrink-0 text-slate-400 hover:text-copper">
                        {copied === 'txt-name' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Value</div>
                    <code className="text-[10px] text-slate-500 italic">Auto-generated on verification</code>
                  </div>
                </div>
              </div>
            </div>

            {/* SSL Status */}
            {sslStatus && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-xs ${
                isVerified          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                sslStatus === 'pending' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' :
                'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                {isVerified ? <CheckCircle2 className="w-4 h-4" /> : sslStatus === 'pending' ? <Clock className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span className="font-semibold">
                  {isVerified
                    ? 'SSL active — your portal is live at ' + domainState?.custom_domain
                    : sslStatus === 'pending'
                    ? 'SSL provisioning in progress via Cloudflare...'
                    : 'SSL verification failed — check DNS records'}
                </span>
              </div>
            )}

            {/* Cloudflare info box */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-navy-700">
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-400">
                <span className="text-slate-300 font-semibold">Powered by Cloudflare Custom Hostnames.</span>{' '}
                Wildcard SSL, WAF protection, DDoS mitigation, and global edge caching are all automatically provisioned. No additional setup needed on your end.
              </p>
            </div>

            {/* Remove domain */}
            {!isVerified && (
              <div className="pt-2 border-t border-slate-100 dark:border-navy-800">
                <button
                  onClick={handleRemoveDomain}
                  disabled={removing}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold transition-colors flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {removing ? 'Removing...' : 'Remove custom domain'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Not available on free plan notice */}
      {organization?.billing_tier === 'free' && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">
            <span className="font-bold">Enterprise feature.</span> Custom domains and white-label portals are available on the Enterprise plan.
          </p>
        </div>
      )}
    </div>
  );
}

export default CustomDomainSettings;
