// Read as literal process.env references so Next can inline them into client bundles.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Until a project is connected the site runs on the in-code content and forms report that saving is unavailable.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabaseNotConfiguredError = 'The FeedSport database is not connected yet.';
