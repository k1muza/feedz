import { Metadata } from 'next';
import DesignPlaceholder from '@/components/common/DesignPlaceholder';
import { getTeamMembers } from '@/lib/content';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Our Team: Nutrition, Supply and Customer Support',
  description: 'Meet the FeedSport team supporting feed ingredient quality, animal nutrition, quotations and deliveries in Zimbabwe.',
  path: '/team',
});

export const revalidate = 3600;

export default async function TeamPage() {
  const team = await getTeamMembers();
  return (
    <main className="fs-page bg-[#f3f0e8] text-[#191b18] [container-type:inline-size]">
      <p className="fs-label mb-2.5 text-[#4f524b]">Company</p>
      <h1 className="fs-page-title">The people behind FeedSport</h1>
      <p className="mb-8 mt-4 max-w-[720px] text-[17px] leading-[1.55] text-[#3d403a]">A practical team focused on ingredient quality, useful nutrition advice and dependable supply.</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
        {team.map((member) => <article key={member.id} className="fs-card flex flex-col">{member.image && <DesignPlaceholder label={`${member.name} portrait`} image={{ id: member.id, src: member.image, alt: `${member.name}, ${member.role}`, photographer: '' }} sizes="(min-width: 1024px) 33vw, 100vw" className="aspect-[4/3] rounded-none" />}<div className="p-5"><span className="fs-label text-[#4f524b]">{member.role}</span><h2 className="mb-2 mt-1 text-[22px] font-bold">{member.name}</h2><p className="m-0 text-[15px] leading-[1.55] text-[#4f524b]">{member.bio}</p></div></article>)}
      </div>
    </main>
  );
}
