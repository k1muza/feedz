import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isSupabaseConfigured) redirect('/login');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/admin');

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) redirect('/login?error=not-admin');

  return <>{children}</>;
}
