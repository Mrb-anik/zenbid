/**
 * useQuotas.ts
 * ─────────────────────────────────────────────────────────────────
 * Enterprise quota management hook.
 *
 * Design philosophy:
 *   - NO harsh "access denied" flows — always allow with grace
 *   - Soft warnings at 80% usage, premium prompts at 90%
 *   - Grace overages at 100% with upgrade CTA
 *   - Track expansion signals for Super Admin revenue intelligence
 *
 * Tracks:
 *   estimates · seats · storage · automations · AI · API · comms
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { useOrganization } from '../providers/OrganizationProvider';

// ─── Types ─────────────────────────────────────────────────────────

export interface QuotaMetric {
  used: number;
  limit: number;
  /** 0–100 */
  pct: number;
  /** 'ok' | 'warning' | 'critical' | 'grace' */
  status: QuotaStatus;
  /** User-facing label */
  label: string;
  /** Icon name from lucide-react */
  icon: string;
}

export type QuotaStatus = 'ok' | 'warning' | 'critical' | 'grace';

export interface OrgQuotas {
  estimates: QuotaMetric;
  seats: QuotaMetric;
  storage: QuotaMetric;
  automations: QuotaMetric;
  ai: QuotaMetric;
  api: QuotaMetric;
  communications: QuotaMetric;
  expansionScore: number;
  upgradeLikelihood: 'low' | 'medium' | 'high' | 'critical';
  billingTier: string;
}

// ─── Status helpers ─────────────────────────────────────────────────

function calcStatus(pct: number): QuotaStatus {
  if (pct >= 100) return 'grace';
  if (pct >= 90)  return 'critical';
  if (pct >= 80)  return 'warning';
  return 'ok';
}

function calcMetric(used: number, limit: number, label: string, icon: string): QuotaMetric {
  if (limit <= 0) {
    return { used, limit, pct: 0, status: 'ok', label, icon };
  }
  const pct = Math.min(110, Math.round((used / limit) * 100)); // allow 10% grace overage in UI
  return { used, limit, pct, status: calcStatus(pct), label, icon };
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useQuotas() {
  const { organization } = useOrganization();
  const [quotas, setQuotas] = useState<OrgQuotas | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuotas = useCallback(async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organization_quotas')
        .select('*')
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setLoading(false);
        return;
      }

      const estimates    = calcMetric(data.estimates_this_month, data.max_estimates_per_month, 'Estimates', 'FileText');
      const seats        = calcMetric(data.current_users, data.max_users, 'Team Seats', 'Users');
      const storage      = calcMetric(data.storage_used_mb, data.storage_limit_mb, 'Storage', 'HardDrive');
      const automations  = calcMetric(data.automations_used ?? 0, data.max_automations ?? 5, 'Automations', 'Zap');
      const ai           = calcMetric(data.monthly_usage_cents, data.monthly_limit_cents, 'AI Credits', 'Bot');
      const api          = calcMetric(data.api_requests_this_month ?? 0, data.max_api_requests_per_month ?? 1000, 'API Calls', 'Code');
      const communications = calcMetric(data.communications_this_month ?? 0, data.max_communications_per_month ?? 500, 'Communications', 'Mail');

      // Expansion score — how close is this org to outgrowing their plan?
      const scores = [estimates, seats, ai, automations].map(m => m.pct);
      const expansionScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      const upgradeLikelihood: OrgQuotas['upgradeLikelihood'] =
        expansionScore >= 90 ? 'critical' :
        expansionScore >= 70 ? 'high'     :
        expansionScore >= 50 ? 'medium'   : 'low';

      setQuotas({
        estimates,
        seats,
        storage,
        automations,
        ai,
        api,
        communications,
        expansionScore,
        upgradeLikelihood,
        billingTier: organization.billing_tier ?? 'free',
      });
    } catch (err) {
      console.error('[useQuotas]', err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id, organization?.billing_tier]);

  useEffect(() => { fetchQuotas(); }, [fetchQuotas]);

  // ── Gated action helpers ────────────────────────────────────────

  /**
   * Returns true if the user can create an estimate.
   * Always returns true for Enterprise (grace unlimited).
   * In grace zone (100%+): returns true but sets shouldShowUpgrade = true.
   */
  const canCreateEstimate = (): { allowed: boolean; shouldShowUpgrade: boolean; status: QuotaStatus } => {
    if (!quotas) return { allowed: true, shouldShowUpgrade: false, status: 'ok' };
    if (quotas.billingTier === 'enterprise') return { allowed: true, shouldShowUpgrade: false, status: 'ok' };

    const { status } = quotas.estimates;
    return {
      allowed: true,                           // never hard-block — always grace
      shouldShowUpgrade: status === 'grace' || status === 'critical',
      status,
    };
  };

  const canAddSeat = (): { allowed: boolean; shouldShowUpgrade: boolean; status: QuotaStatus } => {
    if (!quotas) return { allowed: true, shouldShowUpgrade: false, status: 'ok' };
    const { status } = quotas.seats;
    return {
      allowed: status !== 'grace',
      shouldShowUpgrade: status === 'grace' || status === 'critical',
      status,
    };
  };

  /**
   * Which metrics are currently in warning/critical/grace?
   * Used for the contextual upgrade nudge.
   */
  const pressurePoints = (): QuotaMetric[] => {
    if (!quotas) return [];
    return Object.values({
      estimates: quotas.estimates,
      seats: quotas.seats,
      storage: quotas.storage,
      automations: quotas.automations,
      ai: quotas.ai,
      api: quotas.api,
      communications: quotas.communications,
    }).filter(m => m.status !== 'ok');
  };

  return {
    quotas,
    loading,
    refetch: fetchQuotas,
    canCreateEstimate,
    canAddSeat,
    pressurePoints,
  };
}
