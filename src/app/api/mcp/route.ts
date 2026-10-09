import { createMcpHandler } from "@modelcontextprotocol/server";

import { getIngredientPrices } from "@/lib/ingredient-prices";
import { createFeedSportMcpServer } from "@/lib/mcp/feedsport-mcp-server";

export const runtime = "nodejs";

/**
 * FeedSport MCP endpoint (Streamable HTTP, public, read-only).
 *
 * Serves the 2026-07-28 protocol revision with a fresh server per request,
 * and falls back to stateless serving for 2025-era clients. It needs no
 * credentials and never writes data. Users' saved formulations are served
 * separately, behind OAuth, at /api/mcp/advisor.
 */
const handler = createMcpHandler(() => createFeedSportMcpServer(getIngredientPrices), {
  onerror: (error) => console.error("FeedSport MCP error:", error),
});

function handle(request: Request) {
  return handler.fetch(request);
}

export { handle as GET, handle as POST, handle as DELETE };
