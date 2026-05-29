/**
 * UpgradeModal.tsx
 * ─────────────────────────────────────────────────────────────────
 * Premium upgrade experience — growth-oriented, revenue-focused.
 *
 * Design principles:
 *   - NEVER feels like an "access denied" wall
 *   - Leads with VALUE: what they unlock, not what they're losing
 *   - Shows which specific limit triggered the nudge
 *   - One-click upgrade CTA with Stripe integration hook
 *   - Animated, premium glassmorphism aesthetic
 * ─────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from 'react';
import {
  X, Sparkles, Zap, Users, FileText, HardDrive,
  Bot, Code, Mail, ArrowRight, TrendingUp, Shield,
  CheckCircle2, Crown,
} from 'lucide-react';
import type { QuotaMetric, QuotaStatus } from '../../hooks/useQuotas';

// ─── Types ─────────────────────────────────────────────────────────

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The specific metric that triggered this modal */
  triggerMetric?: QuotaMetric;
  /** Current billing tier */
  currentTier?: string;
  /** Called when user clicks upgrade */
  onUpgrade?: (tier: 'pro' | 'enterprise') => void;
}

// ─── Icon resolver ─────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  FileText, Users, HardDrive, Zap, Bot, Code, Mail,
};

function MetricIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Sparkles;
  return <Icon className={className} />;
}

// ─── Plan features ─────────────────────────────────────────────────

const PRO_FEATURES = [
  '250 estimates / month',
  '10 team seats',
  'AI-powered proposal drafting',
  '5 automations',
  'Priority support',
  'Custom branding',
];

const ENTERPRISE_FEATURES = [
  'Unlimited estimates',
  'Unlimited team seats',
  'White-label custom domain',
  'Advanced analytics & forecasting',
  'API access (10K req/mo)',
  'Dedicated CSM',
  'SSO / SAML',
  'SLA guarantee',
];

// ─── Status copy ────────────────────────────────────────────────────

function getStatusCopy(status: QuotaStatus, label: string) {
  switch (status) {
    case 'grace':
      return {
        headline: `You're growing fast! 🚀`,
        sub: `Your ${label} usage has exceeded your plan limit. You're in a grace period — upgrade now to keep everything running smoothly.`,
      };
    case 'critical':
      return {
        headline: `Almost at your ${label} limit`,
        sub: `You're at 90%+ usage. Upgrade now to avoid any service interruptions and unlock more capacity.`,
      };
    case 'warning':
      return {
        headline: `Growing quickly on ${label}`,
        sub: `You've used 80% of your ${label} allocation. See how Pro or Enterprise unlocks serious scale.`,
      };
    default:
      return {
        headline: 'Ready for the next level?',
        sub: 'Unlock more power, automation, and scale with a PeakEstimator upgrade.',
      };
  }
}

// ─── Component ─────────────────────────────────────────────────────

export function UpgradeModal({
  isOpen,
  onClose,
  triggerMetric,
  currentTier = 'free',
  onUpgrade,
}: UpgradeModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copy = triggerMetric
    ? getStatusCopy(triggerMetric.status, triggerMetric.label)
    : getStatusCopy('ok', '');

  const targetTier = currentTier === 'free' ? 'pro' : 'enterprise';

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl animate-scale-in">
        {/* Ambient glow */}
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-amber-500/30 via-copper/20 to-blue-500/20 blur-xl" />

        <div className="relative rounded-3xl bg-slate-900 border border-white/10 overflow-hidden shadow-2xl">
          {/* Header gradient band */}
          <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-slate-900 via-navy-900 to-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Crown badge */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-0.5">
                  {targetTier === 'enterprise' ? 'Enterprise Plan' : 'Pro Plan'}
                </div>
                <div className="text-white font-black text-lg leading-tight">{copy.headline}</div>
              </div>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed max-w-lg">{copy.sub}</p>

            {/* Triggered metric bar */}
            {triggerMetric && (
              <div className="mt-5 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <MetricIcon name={triggerMetric.icon} className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white">{triggerMetric.label}</span>
                    <span className={`text-xs font-black ${
                      triggerMetric.status === 'grace'    ? 'text-red-400'    :
                      triggerMetric.status === 'critical' ? 'text-orange-400' : 'text-amber-400'
                    }`}>
                      {triggerMetric.used.toLocaleString()} / {triggerMetric.limit.toLocaleString()}
                      {' '}({triggerMetric.pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        triggerMetric.status === 'grace'    ? 'bg-red-500'    :
                        triggerMetric.status === 'critical' ? 'bg-orange-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, triggerMetric.pct)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Plan grid */}
          <div className="px-8 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pro */}
              <div className={`rounded-2xl border p-5 transition-all ${
                currentTier === 'free'
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-white/10 bg-white/5 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Pro</div>
                    <div className="text-white font-black text-2xl mt-0.5">
                      $99<span className="text-sm font-normal text-slate-400">/mo</span>
                    </div>
                  </div>
                  {currentTier === 'pro' && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-black uppercase">Current</span>
                  )}
                </div>
                <ul className="space-y-2">
                  {PRO_FEATURES.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Enterprise */}
              <div className="relative rounded-2xl border border-blue-500/40 bg-blue-500/5 p-5">
                <div className="absolute -top-2.5 left-4">
                  <span className="text-[9px] px-2.5 py-1 rounded-full bg-blue-500 text-white font-black uppercase tracking-wide shadow">
                    Most Popular
                  </span>
                </div>
                <div className="flex items-center justify-between mb-4 mt-1">
                  <div>
                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Enterprise</div>
                    <div className="text-white font-black text-2xl mt-0.5">
                      $299<span className="text-sm font-normal text-slate-400">/mo</span>
                    </div>
                  </div>
                  {currentTier === 'enterprise' && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-black uppercase">Current</span>
                  )}
                </div>
                <ul className="space-y-2">
                  {ENTERPRISE_FEATURES.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Value props */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, label: 'Scale without limits', color: 'text-emerald-400' },
                { icon: Shield,     label: 'Enterprise security',  color: 'text-blue-400'    },
                { icon: Sparkles,   label: 'Priority AI access',   color: 'text-amber-400'   },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 text-center p-3 rounded-xl bg-white/5">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-[10px] text-slate-400 font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onUpgrade?.('enterprise')}
                className="flex-1 group flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-sm shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:scale-[1.01]"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Enterprise
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              {currentTier === 'free' && (
                <button
                  onClick={() => onUpgrade?.('pro')}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-sm transition-all"
                >
                  Start with Pro — $99/mo
                </button>
              )}
            </div>

            <p className="mt-3 text-center text-[10px] text-slate-500">
              No contracts · Cancel anytime · 14-day money-back guarantee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
