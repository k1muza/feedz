

import { getAllTeamMembers } from '@/app/actions';
import { TeamManagement } from '@/components/admin/TeamManagement';
import { TeamMember } from '@/types';

export default async function TeamPage() {
  const members: TeamMember[] = await getAllTeamMembers();
  return (
    <div className="container mx-auto px-4">
      <TeamManagement initialMembers={members} />
    </div>
  );
}
