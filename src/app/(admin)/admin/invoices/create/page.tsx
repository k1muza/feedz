
import { InvoiceForm } from '@/components/admin/InvoiceForm';
import { getAllProducts } from '@/app/actions';

export default async function CreateInvoicePage() {
  const products = await getAllProducts();
  return (
    <div>
      <InvoiceForm products={products} />
    </div>
  );
}
