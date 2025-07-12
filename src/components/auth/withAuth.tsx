
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  const AuthComponent = (props: P) => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
      if (!loading && !user) {
        router.push(`/login?redirect=${pathname}`);
      }
    }, [user, loading, router, pathname]);

    if (loading || !user) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-950">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
          <p className="ml-2 text-white">Authenticating...</p>
        </div>
      );
    }

    return <Component {...props} />;
  };
  return AuthComponent;
};

export default withAuth;
