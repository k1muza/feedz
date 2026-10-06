'use client';

import { useState } from 'react';
import { saveNewsletterSubscription } from '@/app/actions';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default function NewsletterSignup({ className = '' }: { className?: string }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  if (!isSupabaseConfigured) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    const result = await saveNewsletterSubscription(email);
    setIsSubmitting(false);
    if (result.success) {
      setEmail('');
      setStatus({ ok: true, message: 'Thanks. We’ll email you when we publish a new guide.' });
    } else {
      setStatus({ ok: false, message: result.error || 'Something went wrong. Please try again.' });
    }
  };

  return (
    <section className={`grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-center gap-5 rounded-[6px] border border-[#d9d4c7] bg-[#fbfaf6] p-[clamp(20px,3cqi,32px)] ${className}`}>
      <div>
        <h2 className="m-0 text-[22px] font-bold">Get new guides by email</h2>
        <p className="mb-0 mt-1.5 text-[15px] leading-[1.5] text-[#4f524b]">Practical feed and nutrition articles, about once a month. Unsubscribe any time.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <label htmlFor="newsletter-email" className="sr-only">Email address</label>
          <input id="newsletter-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@farm.co.zw" className="h-[46px] min-w-0 flex-1 rounded-[4px] border border-[#d9d4c7] bg-white px-3.5 text-[16px] outline-none focus:border-[#1d3a2a]" />
          <button type="submit" disabled={isSubmitting} className="h-[46px] shrink-0 rounded-[4px] bg-[#1d3a2a] px-4 text-[15px] font-semibold text-white disabled:opacity-60">{isSubmitting ? 'Subscribing…' : 'Subscribe'}</button>
        </div>
        {status && <p role="status" className={`m-0 text-[14px] ${status.ok ? 'text-[#1f5c38]' : 'text-[#8f3420]'}`}>{status.message}</p>}
      </form>
    </section>
  );
}
