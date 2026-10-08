import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Where Supabase sends people back to the site: Google sign-in, sign-up
// confirmation emails and password-reset emails. Swap the one-time code for a
// session cookie, then continue to the page they were heading for. Failures
// go back to the studio sign-in page (or, for a reset link, the reset page,
// which explains that the link expired) with an error to show.

const DEFAULT_NEXT = "/studio";

// Only same-site paths, so the next parameter can't send people elsewhere.
const safeNext = (value: string | null) => (value && value.startsWith("/") && !value.startsWith("//") ? value : DEFAULT_NEXT);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    console.error("Auth callback failed:", error.message);
  }

  if (next.startsWith("/studio/reset-password")) return NextResponse.redirect(new URL(next, origin));
  const login = new URL("/studio/login", origin);
  login.searchParams.set("error", "link");
  if (next !== DEFAULT_NEXT) login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}
