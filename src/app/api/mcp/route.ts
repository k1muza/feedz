import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { getIngredientPrices } from "@/lib/ingredient-prices";
import { createFeedSportMcpServer } from "@/lib/mcp/feedsport-mcp-server";

export const runtime = "nodejs";

/**
 * FeedSport MCP endpoint (Streamable HTTP, stateless, read-only).
 *
 * Each POST gets a fresh server and transport, so no session state is kept
 * between requests. v0.1 is unauthenticated and never writes data.
 */
export async function POST(request: Request) {
  const server = createFeedSportMcpServer(getIngredientPrices);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}

// Stateless servers have no server-initiated stream or session to delete.
function methodNotAllowed() {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed. Use POST." },
      id: null,
    },
    { status: 405, headers: { Allow: "POST" } },
  );
}

export { methodNotAllowed as GET, methodNotAllowed as DELETE };
