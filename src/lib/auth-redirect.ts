const CONTROL_OR_BACKSLASH = /[\\\u0000-\u001f\u007f-\u009f]/;

// These are the application routes the formulation studio can legitimately
// resume after authentication. Dynamic ids occupy one path segment only.
const APPROVED_AUTH_PATHS = [
  /^\/studio\/?$/,
  /^\/studio\/(?:new|workspace|nutrients|catalogue|login|signup|forgot-password|reset-password)\/?$/,
  /^\/studio\/formulations(?:\/[^/]+)?\/?$/,
  /^\/studio\/ingredients(?:\/[^/]+)?\/?$/,
  /^\/studio\/programmes(?:\/[^/]+(?:\/phases\/[^/]+)?)?\/?$/,
  // Approving an OAuth client (e.g. a Claude connector) after signing in.
  /^\/oauth\/consent\/?$/,
];

function hasUnsafeCharacters(value: string) {
  // Inspect a few decoding layers as searchParams has already decoded the
  // outer query value. This also rejects double-encoded backslashes/controls
  // before another router or proxy gets a chance to reinterpret them.
  let candidate = value;
  for (let depth = 0; depth < 3; depth += 1) {
    if (CONTROL_OR_BACKSLASH.test(candidate)) return true;
    try {
      const decoded = decodeURIComponent(candidate);
      if (decoded === candidate) return false;
      candidate = decoded;
    } catch {
      return true;
    }
  }
  return CONTROL_OR_BACKSLASH.test(candidate);
}
/** Returns a canonical approved same-origin path, or null for an unsafe target. */
export function safeAuthRedirect(value: string | null, origin: string): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || hasUnsafeCharacters(value)) return null;

  try {
    const base = new URL(origin);
    const resolved = new URL(value, base);
    if (resolved.origin !== base.origin || resolved.username || resolved.password) return null;
    if (!APPROVED_AUTH_PATHS.some((route) => route.test(resolved.pathname))) return null;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return null;
  }
}
