
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut, signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // This listener is for the main app authentication (admin users)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // We only care about non-anonymous users for the main app context
      if (user && !user.isAnonymous) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    const wasAnonymous = auth.currentUser?.isAnonymous;
    await signOut(auth);
    // After logging out, if the user was anonymous, we sign them back in
    // so the chat widget session persists. Otherwise, send to login page.
    if (!wasAnonymous) {
        router.push('/login');
    } else {
        await signInAnonymously(auth);
    }
  };

  const value = { user, loading, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
