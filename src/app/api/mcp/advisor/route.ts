import {
  OAuthError,
  bearerAuthChallengeResponse,
  createMcpHandler,
  getOAuthProtectedResourceMetadataUrl,
  verifyBearerToken,
} from "@modelcontextprotocol/server";

import { getIngredientPrices } from "@/lib/ingredient-prices";
import { NotAdvisorError, createAdvisorVerifier } from "@/lib/mcp/advisor-auth";
import { advisorResourceUrl, supabaseAdvisorDirectory } from "@/lib/mcp/advisor-oauth";
import { createSupabaseFeaturedStore } from "@/lib/mcp/feedsport-featured";
import { createSupabaseFormulationStore } from "@/lib/mcp/feedsport-formulations";
import { createFeedSportMcpServer } from "@/lib/mcp/feedsport-mcp-server";
import { createSecretClient } from "@/lib/supabase/secret";

export const runtime = "nodejs";

/**
 * FeedSport advisor MCP endpoint: the public tools plus every user's saved
 * formulations and advice. Every request needs a bearer token — a Supabase
 * OAuth access token for an advisor or admin account, or the static
 * FEEDSPORT_MCP_ADVISOR_TOKEN. Without one it answers 401 with a pointer to
 * the protected-resource metadata, which is how OAuth clients such as
 * claude.ai discover where to sign in.
 */
const handler = createMcpHandler(
  () => {
    const supabase = createSecretClient();
    return createFeedSportMcpServer(getIngredientPrices, {
      formulations: supabase ? createSupabaseFormulationStore(supabase) : null,
      featured: supabase ? createSupabaseFeaturedStore(supabase) : null,
    });
  },
  { onerror: (error) => console.error("FeedSport advisor MCP error:", error) },
);

const verifier = createAdvisorVerifier({
  directory: supabaseAdvisorDirectory,
  staticToken: process.env.FEEDSPORT_MCP_ADVISOR_TOKEN,
});

async function handle(request: Request) {
  const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(advisorResourceUrl(request));
  try {
    const authInfo = await verifyBearerToken(request.headers.get("authorization"), { verifier, resourceMetadataUrl });
    return handler.fetch(request, { authInfo });
  } catch (error) {
    if (error instanceof NotAdvisorError) {
      return Response.json({ error: "access_denied", error_description: error.message }, { status: 403 });
    }
    if (!(error instanceof OAuthError)) console.error("FeedSport advisor MCP auth failed:", error);
    return bearerAuthChallengeResponse(error, { resourceMetadataUrl });
  }
}

export { handle as GET, handle as POST, handle as DELETE };
