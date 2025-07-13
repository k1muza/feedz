
import { getAllInvoices } from '@/app/actions';
import { InvoicesManagement } from '@/components/admin/InvoicesManagement';
import { Invoice } from '@/types';

export default async function InvoicesPage() {
  const invoices: Invoice[] = await getAllInvoices();
  return (
    <div className="container mx-auto px-4">
      <InvoicesManagement initialInvoices={invoices} />
    </div>
  );
}
