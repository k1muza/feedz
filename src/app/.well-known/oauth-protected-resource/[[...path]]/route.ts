import { ADVISOR_MCP_PATH, advisorResourceMetadata } from "@/lib/mcp/advisor-oauth";

export const runtime = "nodejs";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

/**
 * RFC 9728 Protected Resource Metadata for the advisor MCP endpoint: tells
 * OAuth clients that Supabase Auth issues its tokens. Clients ask for it at
 * /.well-known/oauth-protected-resource/api/mcp/advisor; the bare path is
 * answered too for clients that only probe the origin.
 */
export async function GET(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const resourcePath = "/" + path.join("/");
  if (path.length && resourcePath !== ADVISOR_MCP_PATH) {
    return Response.json({ error: "not_found" }, { status: 404, headers: CORS });
  }
  try {
    return Response.json(await advisorResourceMetadata(request), { headers: { ...CORS, "Cache-Control": "public, max-age=3600" } });
  } catch (error) {
    console.error("Protected resource metadata failed:", error);
    return Response.json({ error: "server_error" }, { status: 503, headers: CORS });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
