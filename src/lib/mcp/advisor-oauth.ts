import "server-only";

import { buildOAuthProtectedResourceMetadata, type OAuthMetadata, type OAuthProtectedResourceMetadata } from "@modelcontextprotocol/server";

import { supabaseUrl } from "@/lib/supabase/config";
import { createSecretClient } from "@/lib/supabase/secret";
import { createPublicClient } from "@/lib/supabase/server";

import type { AdvisorDirectory } from "./advisor-auth";

// Supabase Auth's OAuth 2.1 server signs advisors in; this app is only the
// resource server plus the consent page (/oauth/consent). See the OAuth
// section of README.md for the dashboard settings this relies on.

export const ADVISOR_MCP_PATH = "/api/mcp/advisor";

export const authorizationServerIssuer = () => `${supabaseUrl}/auth/v1`;

/** The advisor endpoint's public URL, from the origin the request arrived on. */
export const advisorResourceUrl = (request: Request) => new URL(ADVISOR_MCP_PATH, new URL(request.url).origin);

export const supabaseAdvisorDirectory: AdvisorDirectory = {
  async verifyToken(token) {
    // Checks the signature against Supabase's published keys (or asks Supabase
    // Auth, for projects on a shared secret) and rejects expired tokens.
    const { data, error } = await createPublicClient().auth.getClaims(token);
    if (error || !data?.claims.sub || typeof data.claims.exp !== "number") return null;
    const { claims } = data;
    return {
      userId: claims.sub,
      email: typeof claims.email === "string" ? claims.email : undefined,
      clientId: typeof claims.client_id === "string" ? claims.client_id : undefined,
      expiresAt: claims.exp,
    };
  },
  async isAdvisor(userId) {
    const supabase = createSecretClient();
    if (!supabase) return false;
    const [advisors, admins] = await Promise.all([
      supabase.from("advisor_users").select("user_id").eq("user_id", userId).maybeSingle(),
      supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle(),
    ]);
    if (advisors.error) throw new Error(advisors.error.message);
    if (admins.error) throw new Error(admins.error.message);
    return Boolean(advisors.data || admins.data);
  },
};

const METADATA_TTL_MS = 60 * 60 * 1000;
let cachedMetadata: { value: OAuthMetadata; at: number } | null = null;

/** Supabase Auth's RFC 8414 metadata, cached for an hour. */
export async function authorizationServerMetadata(): Promise<OAuthMetadata> {
  if (cachedMetadata && Date.now() - cachedMetadata.at < METADATA_TTL_MS) return cachedMetadata.value;
  const response = await fetch(`${supabaseUrl}/.well-known/oauth-authorization-server/auth/v1`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Supabase OAuth metadata returned ${response.status}. Is the OAuth server enabled under Authentication > OAuth Server?`);
  }
  const value = (await response.json()) as OAuthMetadata;
  cachedMetadata = { value, at: Date.now() };
  return value;
}

export async function advisorResourceMetadata(request: Request): Promise<OAuthProtectedResourceMetadata> {
  return buildOAuthProtectedResourceMetadata({
    oauthMetadata: await authorizationServerMetadata(),
    resourceServerUrl: advisorResourceUrl(request),
    resourceName: "FeedSport advisor",
    // Local Supabase (supabase start) serves its issuer over plain HTTP.
    dangerouslyAllowInsecureIssuerUrl: process.env.NODE_ENV !== "production",
  });
}
