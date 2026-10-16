import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseKey, supabaseUrl } from './config';

/**
 * A client that acts as the user who holds accessToken (a Supabase access
 * token, e.g. from the advisor MCP OAuth sign-in), so row-level security
 * applies exactly as it does to that user's web session.
 */
export function createUserTokenClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseKey, {
    accessToken: async () => accessToken,
  });
}
