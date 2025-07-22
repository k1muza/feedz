

import { Metadata } from 'next';
import Image from 'next/image';
import { FaEnvelope, FaLinkedinIn } from 'react-icons/fa6';
import SecondaryHero from '@/components/common/SecondaryHero';
import { getAllTeamMembers } from '@/app/actions';

export const metadata: Metadata = {
  title: 'Our Team',
  description: 'Meet the dedicated team of nutritionists, scientists, and professionals behind FeedSport International.',
  alternates: {
    canonical: '/team',
  },
};

export default async function TeamPage() {
  const teamMembers = await getAllTeamMembers();

  return (
    <>
      <SecondaryHero
        title="Meet Our Experts"
        subtitle="A dedicated team of scientists, nutritionists, and logistics professionals committed to your success."
      />

      <main className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden text-center group transform hover:-translate-y-2 transition-transform duration-300"
              >
                <div className="relative h-56 bg-gray-100">
                  <Image
                    src={member.image}
                    alt={`Portrait of ${member.name}`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                  <p className="text-green-600 font-medium mb-3">{member.role}</p>
                  <p className="text-gray-600 text-sm mb-4 min-h-[100px]">{member.bio}</p>
                  <div className="flex justify-center space-x-4">
                    {member.social?.linkedin && (
                         <a href={member.social.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-700 transition-colors">
                          <FaLinkedinIn className="w-5 h-5" />
                        </a>
                    )}
                   {member.social?.email && (
                     <a href={`mailto:${member.social.email}`} className="text-gray-400 hover:text-green-600 transition-colors">
                      <FaEnvelope className="w-5 h-5" />
                    </a>
                   )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
