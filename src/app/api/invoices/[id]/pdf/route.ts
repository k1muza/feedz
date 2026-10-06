import { NextResponse } from 'next/server';

import { getInvoiceById } from '@/app/actions';
import { invoiceDocumentTitle, renderInvoicePdf } from '@/lib/invoice-pdf';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // getInvoiceById only returns invoices to signed-in admins.
  const invoice = await getInvoiceById(id);
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  const bytes = await renderInvoicePdf(invoice);
  const filename = `feedsport-${invoiceDocumentTitle(invoice).toLowerCase().replace(' ', '-')}-${invoice.invoiceNumber.replace(/[^A-Za-z0-9-]+/g, '-')}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
