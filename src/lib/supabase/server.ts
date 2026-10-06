import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabaseKey, supabaseUrl } from './config';

/** Session-aware client for admin reads and writes; row-level security decides what it can touch. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only; the proxy refreshes the session.
        }
      },
    },
  });
}

/** Cookie-less anonymous client for public reads and visitor submissions, so pages can stay static. */
export function createPublicClient() {
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Returns the signed-in admin's client, or null when the visitor is not an admin. */
export async function getAdminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isAdmin } = await supabase.rpc('is_admin');
  return isAdmin ? { supabase, user } : null;
}
