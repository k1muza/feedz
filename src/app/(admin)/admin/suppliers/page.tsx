import { getAllSuppliers } from '@/app/actions';
import { SupplierManagement } from '@/components/admin/SupplierManagement';
import { Supplier } from '@/types';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
  const suppliers: Supplier[] = await getAllSuppliers();
  return (
    <div className="container mx-auto px-4">
      <SupplierManagement initialSuppliers={suppliers} />
    </div>
  );
}
