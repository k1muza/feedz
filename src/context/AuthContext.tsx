'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

type AppUser = { uid: string; email: string | null; displayName: string | null };

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toAppUser = (user: User | null | undefined): AppUser | null =>
  user ? { uid: user.id, email: user.email ?? null, displayName: (user.user_metadata?.full_name as string | undefined) ?? null } : null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => (isSupabaseConfigured ? createClient() : null), []);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    // getSession reads the local cookie only, so anonymous visitors make no network request.
    supabase.auth.getSession().then(({ data }) => {
      setUser(toAppUser(data.session?.user));
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(toAppUser(session?.user)));
    return () => subscription.unsubscribe();
  }, [supabase]);

  const logout = async () => {
    await supabase?.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return <AuthContext.Provider value={{ user, loading, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
