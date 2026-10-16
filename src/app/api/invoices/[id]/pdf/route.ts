import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getInvoiceById } from '@/app/actions';
import { invoiceLinkSecret, verifyInvoicePdfToken } from '@/lib/invoice-links';
import { invoicePdfFilename, renderInvoicePdf } from '@/lib/invoice-pdf';
import { rowToInvoice, type InvoiceRow } from '@/lib/invoices';
import { createSecretClient } from '@/lib/supabase/secret';

export const runtime = 'nodejs';

/** Loads the invoice a signed link names (see src/lib/invoice-links.ts); null when the link is not valid for it. */
async function getInvoiceForSignedLink(id: string, token: string) {
  const secret = invoiceLinkSecret();
  if (!secret || !z.string().uuid().safeParse(id).success || !verifyInvoicePdfToken(secret, id, token)) return null;
  const supabase = createSecretClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
  if (error) console.error('Error loading invoice:', error.message);
  return data ? rowToInvoice(data as InvoiceRow) : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get('token');
  // Without a signed link, getInvoiceById only returns invoices to signed-in admins.
  const invoice = token ? await getInvoiceForSignedLink(id, token) : await getInvoiceById(id);
  if (!invoice) return NextResponse.json({ error: token ? 'This invoice link is invalid or has expired.' : 'Invoice not found' }, { status: 404 });

  const bytes = await renderInvoicePdf(invoice);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoicePdfFilename(invoice)}"`,
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
