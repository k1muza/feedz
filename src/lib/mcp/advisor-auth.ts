import { createHash, timingSafeEqual } from "node:crypto";

import { OAuthError, OAuthErrorCode, type AuthInfo, type OAuthTokenVerifier } from "@modelcontextprotocol/server";

/**
 * Who may use the advisor MCP endpoint (/api/mcp/advisor).
 *
 * Clients sign in with OAuth: Supabase Auth is the authorization server, so an
 * access token is a Supabase JWT for a FeedSport account, and that account
 * must be an advisor (or admin). For scripts and clients without OAuth, the
 * static FEEDSPORT_MCP_ADVISOR_TOKEN (at least 32 characters) is also
 * accepted when it is set.
 */
export const MIN_ADVISOR_TOKEN_LENGTH = 32;
const STATIC_TOKEN_CLIENT = "feedsport-advisor-token";
const STATIC_TOKEN_LIFETIME_S = 3600;

/** A verified Supabase access token. */
export interface SupabaseTokenClaims {
  userId: string;
  email?: string;
  /** The OAuth client the token was issued to; absent for ordinary sign-in sessions. */
  clientId?: string;
  /** Seconds since the epoch. */
  expiresAt: number;
}

export interface AdvisorDirectory {
  /** Verifies the token's signature and expiry; null when it is not a valid Supabase token. */
  verifyToken(token: string): Promise<SupabaseTokenClaims | null>;
  isAdvisor(userId: string): Promise<boolean>;
}

/** A valid sign-in for an account that is not an advisor. */
export class NotAdvisorError extends Error {
  constructor(readonly email?: string) {
    super(`${email ?? "This account"} is not a FeedSport advisor. Ask a FeedSport admin to add it to advisor_users.`);
  }
}

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Hashing first gives equal-length buffers, so the comparison leaks nothing about length. */
export function matchesStaticToken(token: string, staticToken: string) {
  return staticToken.length >= MIN_ADVISOR_TOKEN_LENGTH && timingSafeEqual(digest(token), digest(staticToken));
}

export function createAdvisorVerifier(options: {
  directory: AdvisorDirectory;
  staticToken?: string;
  now?: () => number;
}): OAuthTokenVerifier {
  const now = options.now ?? (() => Math.floor(Date.now() / 1000));
  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      if (options.staticToken && matchesStaticToken(token, options.staticToken)) {
        return { token, clientId: STATIC_TOKEN_CLIENT, scopes: [], expiresAt: now() + STATIC_TOKEN_LIFETIME_S, extra: { via: "static-token" } };
      }
      const claims = await options.directory.verifyToken(token);
      if (!claims) throw new OAuthError(OAuthErrorCode.InvalidToken, "The access token is invalid or has expired.");
      if (!(await options.directory.isAdvisor(claims.userId))) throw new NotAdvisorError(claims.email);
      return {
        token,
        clientId: claims.clientId ?? "supabase-session",
        scopes: [],
        expiresAt: claims.expiresAt,
        extra: { via: "oauth", userId: claims.userId, ...(claims.email ? { email: claims.email } : {}) },
      };
    },
  };
}
