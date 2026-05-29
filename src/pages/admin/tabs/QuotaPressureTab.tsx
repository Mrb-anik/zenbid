/**
 * QuotaPressureTab.tsx — Super Admin Quota Intelligence Dashboard
 * ─────────────────────────────────────────────────────────────────
 * Monitors quota pressure, upgrade likelihood, and expansion revenue
 * opportunities across all tenant organizations.
 *
 * Revenue signals:
 *   - Expansion score per org (composite of all quota usage)
 *   - Upgrade likelihood (low → critical)
 *   - Which specific metrics are at pressure points
 *   - Estimated expansion revenue if orgs upgrade
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, RefreshCw, Crown, AlertTriangle,
  Zap, FileText, Users, HardDrive, Bot, ArrowUp,
  DollarSign, Target, Flame, BarChart3, ChevronRight,
} from 'lucide-react';
import { supabase } from '../../../api/supabase';
import { toast } from 'sonner';
import { formatCurrency } from '../../../lib/currency';

// ─── Types ─────────────────────────────────────────────────────────

interface OrgPressureRow {
  id: string;
  name: string;
  billing_tier: string;
  expansion_score: number;
  upgrade_likelihood: 'low' | 'medium' | 'high' | 'critical';
  estimates_pct: number;
  seats_pct: number;
  ai_pct: number;
  automations_pct: number;
  potential_mrr_uplift: number;
}

interface PressureSummary {
  total_orgs: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  total_expansion_mrr: number;
  avg_expansion_score: number;
}

// ─── Constants ─────────────────────────────────────────────────────

const UPGRADE_MRR: Record<string, number> = {
  free: 99,       // free → pro
  pro:  200,      // pro → enterprise
};

const LIKELIHOOD_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low:      'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const LIKELIHOOD_ICONS: Record<string, React.ElementType> = {
  critical: Flame,
  high:     AlertTriangle,
  medium:   TrendingUp,
  low:      BarChart3,
};

function PctBar({ pct, label }: { pct: number; label: string }) {
  const color = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-orange-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[9px] text-slate-400 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className={`text-[9px] font-black w-7 text-right ${pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-orange-400' : 'text-slate-400'}`}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────

export default function QuotaPressureTab() {
  const [rows, setRows] = useState<OrgPressureRow[]>([]);
  const [summary, setSummary] = useState<PressureSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterLikelihood, setFilterLikelihood] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'mrr' | 'name'>('score');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: orgs, error: orgsErr } = await supabase
        .from('organizations')
        .select('id, name, billing_tier');
      if (orgsErr) throw orgsErr;

      const { data: quotas, error: quotasErr } = await supabase
        .from('organization_quotas')
        .select('*');
      if (quotasErr) throw quotasErr;

      const quotaMap = new Map((quotas ?? []).map(q => [q.organization_id, q]));

      const pressureRows: OrgPressureRow[] = (orgs ?? []).map(org => {
        const q = quotaMap.get(org.id);
        const estimates_pct = q && q.max_estimates_per_month > 0
          ? Math.round((q.estimates_this_month / q.max_estimates_per_month) * 100) : 0;
        const seats_pct = q && q.max_users > 0
          ? Math.round((q.current_users / q.max_users) * 100) : 0;
        const ai_pct = q && q.monthly_limit_cents > 0
          ? Math.round((q.monthly_usage_cents / q.monthly_limit_cents) * 100) : 0;
        const automations_pct = q && (q.max_automations ?? 5) > 0
          ? Math.round(((q.automations_used ?? 0) / (q.max_automations ?? 5)) * 100) : 0;

        const expansion_score = q?.expansion_score
          ?? Math.round((estimates_pct + seats_pct + ai_pct + automations_pct) / 4);

        const upgrade_likelihood: OrgPressureRow['upgrade_likelihood'] =
          q?.upgrade_likelihood ??
          (expansion_score >= 90 ? 'critical' :
           expansion_score >= 70 ? 'high'     :
           expansion_score >= 50 ? 'medium'   : 'low');

        const potential_mrr_uplift = UPGRADE_MRR[org.billing_tier ?? 'free'] ?? 0;

        return {
          id: org.id,
          name: org.name,
          billing_tier: org.billing_tier ?? 'free',
          expansion_score,
          upgrade_likelihood,
          estimates_pct,
          seats_pct,
          ai_pct,
          automations_pct,
          potential_mrr_uplift,
        };
      });

      // Sort
      const sorted = [...pressureRows].sort((a, b) => {
        if (sortBy === 'score') return b.expansion_score - a.expansion_score;
        if (sortBy === 'mrr')   return b.potential_mrr_uplift - a.potential_mrr_uplift;
        return a.name.localeCompare(b.name);
      });

      setRows(sorted);

      // Summary
      const criticalOrgs = sorted.filter(r => r.upgrade_likelihood === 'critical');
      const highOrgs     = sorted.filter(r => r.upgrade_likelihood === 'high');
      const mediumOrgs   = sorted.filter(r => r.upgrade_likelihood === 'medium');
      const totalMrr     = sorted
        .filter(r => r.upgrade_likelihood !== 'low')
        .reduce((sum, r) => sum + r.potential_mrr_uplift, 0);

      setSummary({
        total_orgs: sorted.length,
        critical_count: criticalOrgs.length,
        high_count: highOrgs.length,
        medium_count: mediumOrgs.length,
        total_expansion_mrr: totalMrr,
        avg_expansion_score: sorted.length > 0
          ? Math.round(sorted.reduce((s, r) => s + r.expansion_score, 0) / sorted.length)
          : 0,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load quota data');
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredRows = filterLikelihood === 'all'
    ? rows
    : rows.filter(r => r.upgrade_likelihood === filterLikelihood);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-6 h-6 animate-spin text-copper" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-sora font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-copper" /> Quota Pressure & Expansion Intelligence
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Revenue opportunities ranked by upgrade likelihood and expansion score
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-navy-800 text-xs font-bold text-slate-500 hover:border-copper hover:text-copper transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            {
              label: 'Expansion MRR Opportunity',
              value: formatCurrency(summary.total_expansion_mrr),
              sub: 'If all non-low orgs upgrade',
              icon: DollarSign,
              color: 'text-emerald-400',
              highlight: true,
            },
            {
              label: 'Critical Orgs',
              value: summary.critical_count,
              sub: 'Immediate outreach needed',
              icon: Flame,
              color: 'text-red-400',
              highlight: false,
            },
            {
              label: 'High Likelihood',
              value: summary.high_count,
              sub: 'Strong expansion signals',
              icon: AlertTriangle,
              color: 'text-orange-400',
              highlight: false,
            },
            {
              label: 'Medium Likelihood',
              value: summary.medium_count,
              sub: 'Nurture & educate',
              icon: TrendingUp,
              color: 'text-amber-400',
              highlight: false,
            },
            {
              label: 'Avg Expansion Score',
              value: `${summary.avg_expansion_score}%`,
              sub: 'Platform-wide health',
              icon: BarChart3,
              color: 'text-blue-400',
              highlight: false,
            },
          ].map(kpi => (
            <div
              key={kpi.label}
              className={`rounded-2xl p-4 border ${
                kpi.highlight
                  ? 'bg-emerald-950/30 border-emerald-800/40'
                  : 'bg-white dark:bg-navy border-app-border dark:border-navy-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide leading-tight">{kpi.label}</span>
                <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
              </div>
              <div className={`text-xl font-black ${kpi.highlight ? 'text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                {kpi.value}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter + Sort bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-navy-900 rounded-xl p-1">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map(lh => (
            <button
              key={lh}
              onClick={() => setFilterLikelihood(lh)}
              className={`text-[10px] px-3 py-1 rounded-lg font-bold capitalize transition-all ${
                filterLikelihood === lh
                  ? 'bg-copper text-white shadow'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lh === 'all' ? 'All Orgs' : lh}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] text-slate-400">Sort:</span>
          {(['score', 'mrr', 'name'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`text-[10px] px-2 py-0.5 rounded-lg font-bold capitalize transition-all ${
                sortBy === s ? 'bg-copper text-white' : 'text-slate-400 hover:text-copper'
              }`}
            >
              {s === 'score' ? 'Expansion Score' : s === 'mrr' ? 'MRR Uplift' : 'Name'}
            </button>
          ))}
        </div>
      </div>

      {/* Orgs Table */}
      <div className="bg-white dark:bg-navy border border-app-border dark:border-navy-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-app-border dark:border-navy-800">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
            Organization Expansion Intelligence
            <span className="ml-2 text-[10px] text-slate-400 font-normal">
              ({filteredRows.length} org{filteredRows.length !== 1 ? 's' : ''})
            </span>
          </h3>
        </div>
        <div className="divide-y divide-app-border dark:divide-navy-800">
          {filteredRows.map(org => {
            const LhIcon = LIKELIHOOD_ICONS[org.upgrade_likelihood] ?? BarChart3;
            return (
              <div key={org.id} className="px-5 py-4 hover:bg-slate-50/40 dark:hover:bg-navy-950/30 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Org info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{org.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wide ${
                        org.billing_tier === 'enterprise' ? 'bg-amber-500/20 text-amber-500' :
                        org.billing_tier === 'pro'        ? 'bg-blue-500/20 text-blue-400'   :
                        'bg-slate-100 text-slate-500 dark:bg-navy-900 dark:text-slate-400'
                      }`}>
                        {org.billing_tier}
                      </span>
                    </div>
                    {/* Usage bars */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 mt-2">
                      <PctBar pct={org.estimates_pct}    label="Estimates" />
                      <PctBar pct={org.seats_pct}        label="Seats"     />
                      <PctBar pct={org.ai_pct}           label="AI Credits" />
                      <PctBar pct={org.automations_pct}  label="Automations" />
                    </div>
                  </div>

                  {/* Right side: score + likelihood + MRR */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {/* Expansion score */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Expansion</span>
                      <div className="relative w-10 h-10">
                        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-navy-800" />
                          <circle
                            cx="18" cy="18" r="15.9" fill="none" strokeWidth="3"
                            stroke={org.expansion_score >= 90 ? '#ef4444' : org.expansion_score >= 70 ? '#f97316' : org.expansion_score >= 50 ? '#f59e0b' : '#10b981'}
                            strokeDasharray={`${org.expansion_score} 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-900 dark:text-white">
                          {org.expansion_score}
                        </span>
                      </div>
                    </div>

                    {/* Upgrade likelihood badge */}
                    <span className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-black uppercase tracking-wide ${LIKELIHOOD_COLORS[org.upgrade_likelihood]}`}>
                      <LhIcon className="w-2.5 h-2.5" />
                      {org.upgrade_likelihood}
                    </span>

                    {/* MRR uplift */}
                    {org.potential_mrr_uplift > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                        <ArrowUp className="w-3 h-3" />
                        +{formatCurrency(org.potential_mrr_uplift)}/mo
                      </div>
                    )}

                    {/* Action */}
                    <button className="flex items-center gap-1 text-[9px] text-copper hover:text-copper/80 font-bold transition-colors">
                      Contact <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredRows.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">
              No organizations match the selected filter
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400">
        <span className="font-bold">Upgrade Likelihood:</span>
        {(['critical', 'high', 'medium', 'low'] as const).map(lh => (
          <span key={lh} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${LIKELIHOOD_COLORS[lh]}`}>
            {lh}
          </span>
        ))}
        <span className="ml-auto">Expansion Score = avg % usage across estimates, seats, AI & automations</span>
      </div>
    </div>
  );
}
