import { getAllSuppliers, getSupplierCatalogue } from '@/app/actions';
import { SupplierManagement } from '@/components/admin/SupplierManagement';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
  const [suppliers, catalogue] = await Promise.all([getAllSuppliers(), getSupplierCatalogue()]);
  return (
    <div className="container mx-auto px-4">
      <SupplierManagement initialSuppliers={suppliers} catalogue={catalogue} />
    </div>
  );
}
