
import { getAllProducts, getInvoiceById } from '@/app/actions';
import { InvoiceForm } from '@/components/admin/InvoiceForm';
import { notFound } from 'next/navigation';

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice, products] = await Promise.all([getInvoiceById(id), getAllProducts()]);
  if (!invoice) notFound();

  return (
    <div>
      <InvoiceForm invoice={invoice} products={products} />
    </div>
  );
}
