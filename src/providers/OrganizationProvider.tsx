/**
 * OrganizationProvider.tsx
 * ─────────────────────────────────────────────────────────────────
 * Provides the active organization context to the entire app.
 *
 * Tenant isolation is enforced here:
 *   - Resolves the user's organization from profiles.organization_id
 *   - Exposes org data, plan, feature flags, and RBAC role
 *   - Impersonation is managed here — toggling impersonation
 *     replaces the active org/role without touching auth state
 *
 * Components consume via useOrganization().
 * ─────────────────────────────────────────────────────────────────
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from './AuthProvider';
import type {
  Organization,
  Profile,
  FeatureFlag,
  UserRole,
  OrganizationMember,
} from '../types';

// ─── Types ─────────────────────────────────────────────────────────

export interface ImpersonationState {
  targetProfile: Profile;
  targetOrg: Organization | null;
  startedAt: string;
}

export interface OrganizationContextValue {
  // Active org (impersonated org if impersonating, else own org)
  organization: Organization | null;
  // True own org (never overridden by impersonation)
  ownOrganization: Organization | null;
  // Active role in the org
  role: UserRole | null;
  // All feature flags for the active org
  featureFlags: FeatureFlag[];
  loading: boolean;
  // Impersonation
  impersonation: ImpersonationState | null;
  startImpersonation: (targetProfile: Profile) => Promise<void>;
  stopImpersonation: () => void;
  activeProfile: Profile | null;
  activeUserId: string | null;
  // Current member permissions & overrides
  memberContext: OrganizationMember | null;
  // Refresh org data
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [ownOrganization, setOwnOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [memberContext, setMemberContext] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(null);
  const [impersonationLogId, setImpersonationLogId] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Fetch org + flags for a given profile ──────────────────────
  const fetchOrgForProfile = useCallback(async (p: Profile): Promise<{
    org: Organization | null;
    flags: FeatureFlag[];
    member: OrganizationMember | null;
  }> => {
    if (!p.organization_id) return { org: null, flags: [], member: null };

    const [orgResult, flagsResult, memberResult] = await Promise.all([
      supabase
        .from('organizations')
        .select('*')
        .eq('id', p.organization_id)
        .single(),
      supabase
        .from('feature_flags')
        .select('*')
        .eq('organization_id', p.organization_id),
      supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', p.organization_id)
        .eq('profile_id', p.id)
        .maybeSingle(),
    ]);

    return {
      org: orgResult.error ? null : (orgResult.data as Organization),
      flags: flagsResult.error ? [] : (flagsResult.data as FeatureFlag[]),
      member: memberResult.error ? null : (memberResult.data as OrganizationMember),
    };
  }, []);

  // ── Load own org when profile changes ─────────────────────────
  useEffect(() => {
    if (!profile) {
      setOrganization(null);
      setOwnOrganization(null);
      setRole(null);
      setFeatureFlags([]);
      setMemberContext(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetchOrgForProfile(profile).then(({ org, flags, member }) => {
      if (!mountedRef.current) return;

      // Only update "live" org if not impersonating
      if (!impersonation) {
        setOrganization(org);
        setFeatureFlags(flags);
        setRole((member?.role || profile.role) as UserRole ?? 'viewer');
        setMemberContext(member);
      }
      setOwnOrganization(org);
      setLoading(false);
    });
  }, [profile, fetchOrgForProfile, impersonation]);

  const refreshOrganization = useCallback(async () => {
    const p = impersonation?.targetProfile ?? profile;
    if (!p) return;
    const { org, flags, member } = await fetchOrgForProfile(p);
    if (mountedRef.current) {
      setOrganization(org);
      setFeatureFlags(flags);
      setRole((member?.role || p.role) as UserRole ?? 'viewer');
      setMemberContext(member);
    }
  }, [impersonation, profile, fetchOrgForProfile]);

  // ── Impersonation ──────────────────────────────────────────────
  const startImpersonation = useCallback(async (targetProfile: Profile) => {
    // Only parent-level operators can impersonate child accounts.
    if (!['platform_owner', 'super_admin', 'agency_admin'].includes(profile?.role ?? '') && !profile?.is_admin) {
      console.error('[OrganizationProvider] Impersonation denied — insufficient role');
      return;
    }

    const { org, flags, member } = await fetchOrgForProfile(targetProfile);

    if (!mountedRef.current) return;

    const impersonationState: ImpersonationState = {
      targetProfile,
      targetOrg: org,
      startedAt: new Date().toISOString(),
    };
    setImpersonation(impersonationState);

    // Override active org to target
    setOrganization(org);
    setFeatureFlags(flags);
    setRole((member?.role || targetProfile.role) as UserRole ?? 'viewer');
    setMemberContext(member);

    // Audit log — non-blocking
    supabase.functions.invoke('impersonation-log', {
      body: {
        action: 'start',
        targetUserId: targetProfile.id,
        targetOrgId: org?.id ?? null,
        reason: 'Admin portal impersonation',
      },
    }).then(({ data }) => {
      if (data?.logId) setImpersonationLogId(data.logId);
    }).catch(err => console.error('[OrganizationProvider] impersonation log error:', err));
  }, [profile, fetchOrgForProfile]);

  const stopImpersonation = useCallback(() => {
    setImpersonation(null);

    // Restore own org
    setOrganization(ownOrganization);
    if (profile) {
      setRole((profile.role as UserRole) ?? 'viewer');
      // Restore own flags
      if (profile.organization_id) {
        supabase
          .from('feature_flags')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .then(({ data }) => {
            if (data && mountedRef.current) {
              setFeatureFlags(data as FeatureFlag[]);
            }
          });
        supabase
          .from('organization_members')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .eq('profile_id', profile.id)
          .maybeSingle()
          .then(({ data }) => {
             if (data && mountedRef.current) {
               setMemberContext(data as OrganizationMember);
               setRole(data.role as UserRole);
             }
          });
      }
    }

    // Close audit log — non-blocking
    if (impersonationLogId) {
      supabase.functions.invoke('impersonation-log', {
        body: { action: 'stop', logId: impersonationLogId },
      }).catch(err => console.error('[OrganizationProvider] stop impersonation log error:', err));
      setImpersonationLogId(null);
    }
  }, [ownOrganization, profile, impersonationLogId]);

  // ── Derived values ─────────────────────────────────────────────
  const activeProfile = impersonation?.targetProfile ?? profile ?? null;
  const activeUserId = activeProfile?.id ?? null;

  const value: OrganizationContextValue = {
    organization,
    ownOrganization,
    role,
    featureFlags,
    loading,
    impersonation,
    startImpersonation,
    stopImpersonation,
    activeProfile,
    activeUserId,
    memberContext,
    refreshOrganization,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error('useOrganization() must be used inside <OrganizationProvider>.');
  }
  return ctx;
}
