
import { getAllPolicies } from '@/app/actions';
import { PolicyManagement } from '@/components/admin/PolicyManagement';
import { Policy } from '@/types';

export default async function PoliciesAdminPage() {
  const policies: Policy[] = await getAllPolicies();
  return (
    <div className="container mx-auto px-4">
      <PolicyManagement initialPolicies={policies} />
    </div>
  );
}
