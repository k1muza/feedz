import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from './config';

// The secret key bypasses row-level security. Never import this from client code.
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const isSecretClientConfigured = Boolean(supabaseUrl && secretKey);

/** Server-only client that can read and write every user's rows, or null when no secret key is set. */
export function createSecretClient() {
  if (!isSecretClientConfigured) return null;
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
