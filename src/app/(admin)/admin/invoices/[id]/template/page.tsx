
import { getInvoiceById } from '@/app/actions';
import InvoiceTemplate from '@/components/invoice/InvoiceTemplate';
import { notFound } from 'next/navigation';

export default async function InvoiceTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();

  return (
    <div className="min-h-screen print:mx-0 print:p-0 print:border-0 print:bg-white">
      <InvoiceTemplate invoiceData={{
        ...invoice,
        date: String(invoice.date).slice(0, 10),
        dueDate: String(invoice.dueDate).slice(0, 10),
      }} />
    </div>
  );
}
