
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { FaGoogle, FaGithub, FaEnvelope, FaLock } from 'react-icons/fa';
import { getAppSettings, createUserProfile } from '@/app/actions';
import { AppSettings } from '@/types';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const settings = await getAppSettings();
      setAppSettings(settings);
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!loading && user) {
      const redirect = searchParams.get('redirect') || '/admin';
      router.push(redirect);
    }
  }, [user, loading, router, searchParams]);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    const auth = getAuth();
    
    try {
      if (isLoginView) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!appSettings?.registrationsOpen) {
          setError('New user registrations are currently disabled.');
          setIsProcessing(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(userCredential.user.uid, {
            email: userCredential.user.email,
            name: userCredential.user.displayName || 'New User',
            image: userCredential.user.photoURL
        });
      }
      // Redirect is handled by the useEffect hook
    } catch (err: any) {
      setError(err.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleProviderSignIn = async (provider: 'google' | 'github') => {
    if (!isLoginView && !appSettings?.registrationsOpen) {
        setError('New user registrations are currently disabled.');
        return;
    }
    setIsProcessing(true);
    setError(null);
    const auth = getAuth();
    const authProvider = provider === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();

    try {
        const result = await signInWithPopup(auth, authProvider);
        // Check if user profile exists, if not, create it
        await createUserProfile(result.user.uid, {
            email: result.user.email,
            name: result.user.displayName,
            image: result.user.photoURL
        });
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsProcessing(false);
    }
  };

  if (loading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <h1 className="text-3xl font-bold text-center text-white">
          {isLoginView ? 'Admin Login' : 'Create Account'}
        </h1>
        
        <form onSubmit={handleAuthAction} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-400" htmlFor="email">Email</label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400" htmlFor="password">Password</label>
             <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-semibold transition-colors disabled:bg-indigo-400"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : (isLoginView ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleProviderSignIn('google')} disabled={isProcessing} className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-md text-white">
                <FaGoogle /> Google
            </button>
             <button onClick={() => handleProviderSignIn('github')} disabled={isProcessing} className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-md text-white">
                <FaGithub /> GitHub
            </button>
        </div>

        <p className="text-center text-sm text-gray-400">
          {isLoginView ? "Don't have an account?" : "Already have an account?"}
          <button onClick={() => setIsLoginView(!isLoginView)} className="font-medium text-indigo-400 hover:underline ml-1">
            {isLoginView ? (appSettings?.registrationsOpen ? 'Sign up' : '') : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}
