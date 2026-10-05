
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type AppUser = { uid: string; email: string | null; displayName: string | null };

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const logout = () => {
    router.push('/');
  };

  const value = { user: null, loading: false, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
