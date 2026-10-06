'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Only allow same-site paths so the redirect parameter can't send people elsewhere.
const safeRedirect = (value: string | null) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/admin');

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(searchParams.get('error') === 'not-admin' ? 'This account does not have admin access.' : null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials' ? 'Incorrect email or password.'
        : signInError.name === 'AuthRetryableFetchError' ? 'Could not reach the sign-in service. Check your connection and try again.'
        : signInError.message,
      );
      setSubmitting(false);
      return;
    }
    router.replace(safeRedirect(searchParams.get('redirect')));
    router.refresh();
  };

  const inputClass = 'h-12 w-full rounded-[4px] border border-[#45473f] bg-[#191b18] px-3.5 text-[16px] text-[#f3f0e8] outline-none focus:border-[#d99a2b]';

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-[14px] text-[#d0cdc3]">Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
      <label className="flex flex-col gap-1.5 text-[14px] text-[#d0cdc3]">Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} /></label>
      {error && <p role="alert" className="m-0 rounded-[4px] border border-[#8f3420] bg-[#3a1d16] px-3 py-2 text-[14px] text-[#f6e0d9]">{error}</p>}
      <button type="submit" disabled={submitting} className="mt-1 inline-flex h-[48px] items-center justify-center rounded-[4px] bg-[#d99a2b] px-5 font-semibold text-[#191b18] disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
