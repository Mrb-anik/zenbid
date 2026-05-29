/**
 * QuotaWarningBanner.tsx
 * ─────────────────────────────────────────────────────────────────
 * Inline, dismissible soft-warning banner for quota pressure.
 *
 * Appears inside pages (not globally) so it feels contextual.
 * Design: warm amber gradient, never alarming — always growth-framed.
 * ─────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import { TrendingUp, X, ArrowRight, Zap } from 'lucide-react';
import type { QuotaMetric } from '../../hooks/useQuotas';

interface QuotaWarningBannerProps {
  metrics: QuotaMetric[];
  onUpgradeClick: () => void;
  className?: string;
}

export function QuotaWarningBanner({ metrics, onUpgradeClick, className = '' }: QuotaWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || metrics.length === 0) return null;

  const topMetric = metrics[0];
  const hasGrace    = metrics.some(m => m.status === 'grace');
  const hasCritical = metrics.some(m => m.status === 'critical');

  const bgClass = hasGrace
    ? 'from-red-950/60 via-red-900/40 to-red-950/60 border-red-800/40'
    : hasCritical
    ? 'from-orange-950/60 via-orange-900/40 to-orange-950/60 border-orange-800/40'
    : 'from-amber-950/60 via-amber-900/40 to-amber-950/60 border-amber-800/40';

  const accentColor = hasGrace ? 'text-red-400' : hasCritical ? 'text-orange-400' : 'text-amber-400';
  const btnClass    = hasGrace
    ? 'bg-red-500 hover:bg-red-400'
    : hasCritical
    ? 'bg-orange-500 hover:bg-orange-400'
    : 'bg-amber-500 hover:bg-amber-400';

  const headline = hasGrace
    ? `You're in grace overage on ${topMetric.label} — keep growing by upgrading`
    : hasCritical
    ? `${topMetric.label} is at ${topMetric.pct}% — you're scaling fast!`
    : `${topMetric.label} is at ${topMetric.pct}% — time to think bigger`;

  return (
    <div className={`relative rounded-2xl border bg-gradient-to-r ${bgClass} px-5 py-4 flex items-center gap-4 ${className}`}>
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 ${accentColor}`}>
        {hasGrace ? <Zap className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${accentColor} leading-tight`}>{headline}</p>
        {metrics.length > 1 && (
          <p className="text-xs text-slate-400 mt-0.5">
            Also approaching limits on: {metrics.slice(1).map(m => m.label).join(', ')}
          </p>
        )}
        {/* Mini progress bars */}
        <div className="flex items-center gap-3 mt-2">
          {metrics.slice(0, 3).map(m => (
            <div key={m.label} className="flex items-center gap-1.5">
              <span className="text-[9px] text-slate-400 font-semibold">{m.label}</span>
              <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    m.status === 'grace'    ? 'bg-red-500'    :
                    m.status === 'critical' ? 'bg-orange-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, m.pct)}%` }}
                />
              </div>
              <span className={`text-[9px] font-black ${accentColor}`}>{m.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onUpgradeClick}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs shrink-0 transition-all shadow-lg ${btnClass}`}
      >
        Upgrade
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-all"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default QuotaWarningBanner;
