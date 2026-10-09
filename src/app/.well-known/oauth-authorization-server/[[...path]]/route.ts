import { authorizationServerMetadata } from "@/lib/mcp/advisor-oauth";

export const runtime = "nodejs";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

/**
 * Supabase Auth's authorization server metadata, passed through for older MCP
 * clients that look for it on the MCP server's own origin. Every endpoint in
 * it is Supabase's, so sign-in still happens there.
 */
export async function GET() {
  try {
    return Response.json(await authorizationServerMetadata(), { headers: { ...CORS, "Cache-Control": "public, max-age=3600" } });
  } catch (error) {
    console.error("Authorization server metadata failed:", error);
    return Response.json({ error: "server_error" }, { status: 503, headers: CORS });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
