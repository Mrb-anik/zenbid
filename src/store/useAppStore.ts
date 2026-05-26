import { create } from 'zustand';
import type { Profile } from '../types';
import { supabase } from '../api/supabase';

interface AppState {
  profile: Profile | null;
  loading: boolean;
  // Agency masquerade — when set, the admin is "acting as" this user
  impersonatedProfile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  // Agency Owner actions
  startImpersonation: (target: Profile) => void;
  stopImpersonation: () => void;
  /** The profile whose data is currently visible (impersonated if active, otherwise own) */
  activeProfile: () => Profile | null;
  /** The user_id to scope DB queries to */
  activeUserId: () => string | null;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  loading: false,
  impersonatedProfile: null,

  setProfile: (profile) => set({ profile }),

  fetchProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ loading: true });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      set({ profile: data as Profile });
    }
    set({ loading: false });
  },

  updateProfile: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      set({ profile: data as Profile });
    }
  },

  startImpersonation: (target: Profile) => {
    set({ impersonatedProfile: target });
  },

  stopImpersonation: () => {
    set({ impersonatedProfile: null });
  },

  activeProfile: () => {
    const { impersonatedProfile, profile } = get();
    return impersonatedProfile ?? profile;
  },

  activeUserId: () => {
    const { impersonatedProfile, profile } = get();
    return (impersonatedProfile ?? profile)?.id ?? null;
  },
}));
