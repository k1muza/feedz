import { getAllLeads } from '@/app/actions';
import { LeadManagement } from '@/components/admin/LeadManagement';
import { Lead } from '@/types';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const leads: Lead[] = await getAllLeads();
  return (
    <div className="container mx-auto px-4">
      <LeadManagement initialLeads={leads} />
    </div>
  );
}
