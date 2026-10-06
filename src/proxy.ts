import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from '@/lib/supabase/config';

// Refreshes the Supabase session cookie and keeps signed-out visitors out of /admin.
// The admin layout still checks admin membership on the server.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?redirect=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
