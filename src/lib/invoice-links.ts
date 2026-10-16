import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// Short-lived signed links to one invoice's PDF, minted by the advisor MCP
// endpoint for an admin who is already authorised to read that invoice. The
// link lets the admin's AI client download the same PDF the web app serves
// without a browser session. It names one invoice, expires, and cannot be
// widened to another invoice.

export const INVOICE_LINK_TTL_S = 15 * 60;

/**
 * The signing key: FEEDSPORT_INVOICE_LINK_SECRET when set, otherwise derived
 * from the Supabase secret key (never the key itself). Null when neither is set,
 * in which case no links are issued.
 */
export function invoiceLinkSecret(env: Record<string, string | undefined> = process.env): Buffer | null {
  const explicit = env.FEEDSPORT_INVOICE_LINK_SECRET;
  if (explicit && explicit.length >= 32) return createHash('sha256').update(explicit).digest();
  const secretKey = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) return null;
  return createHash('sha256').update(`feedsport-invoice-pdf-link:${secretKey}`).digest();
}

const signature = (secret: Buffer, invoiceId: string, expiresAt: number) =>
  createHmac('sha256', secret).update(`invoice-pdf:${invoiceId}:${expiresAt}`).digest('base64url');

/** A token for invoiceId's PDF, valid until expiresAt (seconds since the epoch). */
export function signInvoicePdfToken(secret: Buffer, invoiceId: string, expiresAt: number) {
  return `${expiresAt}.${signature(secret, invoiceId, expiresAt)}`;
}

export function verifyInvoicePdfToken(secret: Buffer, invoiceId: string, token: string, now = Math.floor(Date.now() / 1000)) {
  const match = /^(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return false;
  const expiresAt = Number(match[1]);
  if (expiresAt <= now || expiresAt > now + INVOICE_LINK_TTL_S) return false;
  const expected = Buffer.from(signature(secret, invoiceId, expiresAt));
  const given = Buffer.from(match[2]);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** The invoice's PDF URL on origin, signed for INVOICE_LINK_TTL_S seconds. */
export function signedInvoicePdfUrl(origin: string | URL, secret: Buffer, invoiceId: string, now = Math.floor(Date.now() / 1000)) {
  const expiresAt = now + INVOICE_LINK_TTL_S;
  const url = new URL(`/api/invoices/${encodeURIComponent(invoiceId)}/pdf`, origin);
  url.searchParams.set('token', signInvoicePdfToken(secret, invoiceId, expiresAt));
  return { url: url.toString(), expiresAt: new Date(expiresAt * 1000).toISOString() };
}
