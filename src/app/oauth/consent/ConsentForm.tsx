"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { OAuthAuthorizationDetails } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type View =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; details: OAuthAuthorizationDetails; advisor: boolean }
  | { state: "redirecting" };

const SCOPE_TEXT: Record<string, string> = {
  openid: "Confirm who you are",
  email: "See your email address",
  profile: "See your name",
  phone: "See your phone number",
};

export function ConsentForm() {
  const authorizationId = useSearchParams().get("authorization_id");
  const [view, setView] = useState<View>({ state: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authorizationId) {
      setView({ state: "error", message: "This sign-in link is incomplete. Start connecting again from the app." });
      return;
    }
    const supabase = createClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const next = "/oauth/consent?" + new URLSearchParams({ authorization_id: authorizationId });
        window.location.replace("/studio/login?" + new URLSearchParams({ next }));
        return;
      }
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (error || !data) {
        setView({ state: "error", message: "This request has expired or was already answered. Start connecting again from the app." });
        return;
      }
      if (!("authorization_id" in data)) {
        // Already approved before: Supabase sends the app its code straight away.
        setView({ state: "redirecting" });
        window.location.replace(data.redirect_url);
        return;
      }
      const { data: advisor } = await supabase.rpc("is_advisor");
      setView({ state: "ready", details: data, advisor: advisor === true });
    })();
  }, [authorizationId]);

  const answer = async (approve: boolean) => {
    if (!authorizationId) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
    if (error || !data) {
      setBusy(false);
      setView({ state: "error", message: "Couldn’t send your answer. Start connecting again from the app." });
      return;
    }
    setView({ state: "redirecting" });
    window.location.assign(data.redirect_url);
  };

  const switchAccount = async () => {
    await createClient().auth.signOut();
    window.location.reload();
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-[#e2dfd6] bg-white p-6 shadow-sm sm:p-8">
      <p className="font-mono text-xs uppercase tracking-wider text-[#64665c]">FeedSport</p>
      {view.state === "loading" && <p className="mt-4 text-sm text-[#64665c]">Checking the request…</p>}
      {view.state === "redirecting" && <p className="mt-4 text-sm text-[#64665c]">Returning you to the app…</p>}
      {view.state === "error" && (
        <>
          <h1 className="mt-2 text-xl font-semibold">Can’t authorize this app</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#45473f]">{view.message}</p>
        </>
      )}
      {view.state === "ready" && (
        <>
          <h1 className="mt-2 text-xl font-semibold leading-snug">
            Allow {view.details.client.name || "this app"} to use your FeedSport account?
          </h1>
          <p className="mt-2 text-sm text-[#64665c]">
            Signed in as <span className="font-medium text-[#222420]">{view.details.user.email}</span>.{" "}
            <button type="button" onClick={switchAccount} className="underline underline-offset-2">
              Use another account
            </button>
          </p>

          <div className="mt-5 rounded-lg border border-[#ece8df] bg-[#faf8f3] p-4 text-sm leading-relaxed">
            <p className="font-medium">It will be able to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[#45473f]">
              {view.advisor ? (
                <>
                  <li>Read every user’s saved formulations and their account details</li>
                  <li>Leave advice on users’ formulations in your name</li>
                </>
              ) : (
                <li>Use FeedSport on your behalf</li>
              )}
              {view.details.scope
                .split(" ")
                .filter((scope) => SCOPE_TEXT[scope])
                .map((scope) => (
                  <li key={scope}>{SCOPE_TEXT[scope]}</li>
                ))}
            </ul>
          </div>

          {!view.advisor && (
            <p className="mt-4 rounded-lg border border-[#f0c97f] bg-[#fdf6e8] p-3 text-sm leading-relaxed text-[#5c4012]">
              This account isn’t a FeedSport advisor, so the advisor connector will refuse it. Ask a FeedSport admin for access, or use another account.
            </p>
          )}

          <p className="mt-4 break-all text-xs text-[#64665c]">After you answer, you’ll return to {view.details.redirect_uri}</p>

          <div className="mt-6 flex gap-3">
            <Button className="flex-1" disabled={busy} onClick={() => answer(true)}>
              Allow
            </Button>
            <Button className="flex-1" variant="outline" disabled={busy} onClick={() => answer(false)}>
              Deny
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
