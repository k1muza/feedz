import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Admin login',
  robots: { index: false, follow: false, nocache: true },
};

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#191b18] p-5 text-[#f3f0e8]">
      <section className="w-full max-w-[440px] rounded-[8px] border border-[#45473f] bg-[#2b2d29] p-8">
        <p className="fs-label mb-3 text-[#b9b6ab]">FeedSport admin</p>
        <h1 className="m-0 text-[32px] font-bold tracking-[-.03em]">Sign in</h1>
        {isSupabaseConfigured ? (
          <Suspense><LoginForm /></Suspense>
        ) : (
          <p className="my-5 text-[16px] leading-[1.55] text-[#d0cdc3]">The database is not connected yet. Add the Supabase environment variables to enable admin sign-in.</p>
        )}
        <Link href="/" className="mt-6 inline-block text-[14px] text-[#b9b6ab]">← Back to FeedSport</Link>
      </section>
    </main>
  );
}
