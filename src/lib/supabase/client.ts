import { createBrowserClient } from '@supabase/ssr';
import { supabaseKey, supabaseUrl } from './config';

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
