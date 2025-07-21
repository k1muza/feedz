
import { Metadata } from 'next';
import Image from 'next/image';
import { FaEnvelope, FaLinkedinIn } from 'react-icons/fa6';
import SecondaryHero from '@/components/common/SecondaryHero';

export const metadata: Metadata = {
  title: 'Our Team',
  description: 'Meet the dedicated team of nutritionists, scientists, and professionals behind FeedSport International.',
  alternates: {
    canonical: '/team',
  },
};

const teamMembers = [
  {
    name: 'Dr. Evelyn Reed',
    role: 'Chief Nutritionist',
    image: 'https://placehold.co/400x400.png',
    dataAiHint: 'woman portrait professional',
    bio: 'With over 20 years of experience in animal science, Dr. Reed leads our research and development, ensuring every formulation is backed by the latest scientific findings.',
    social: {
      linkedin: '#',
      email: 'mailto:e.reed@feedsport.co.zw',
    },
  },
  {
    name: 'Ben Carter',
    role: 'Head of Operations',
    image: 'https://placehold.co/400x400.png',
    dataAiHint: 'man portrait professional',
    bio: 'Ben oversees our state-of-the-art production facilities, guaranteeing the highest standards of quality control and operational efficiency from sourcing to delivery.',
    social: {
      linkedin: '#',
      email: 'mailto:b.carter@feedsport.co.zw',
    },
  },
  {
    name: 'Amina Khan',
    role: 'Lead Formulation Scientist',
    image: 'https://placehold.co/400x400.png',
    dataAiHint: 'woman portrait scientist',
    bio: 'Amina specializes in creating custom feed solutions, working directly with farmers to address unique nutritional challenges and optimize for specific performance goals.',
    social: {
      linkedin: '#',
      email: 'mailto:a.khan@feedsport.co.zw',
    },
  },
  {
    name: 'Samuel Jones',
    role: 'Logistics Manager',
    image: 'https://placehold.co/400x400.png',
    dataAiHint: 'man portrait logistics',
    bio: 'Samuel orchestrates our nationwide distribution network, ensuring reliable, on-time delivery so our clients never miss a feeding schedule.',
    social: {
      linkedin: '#',
      email: 'mailto:s.jones@feedsport.co.zw',
    },
  },
   {
    name: 'Chloe Davis',
    role: 'Quality Assurance Lead',
    image: 'https://placehold.co/400x400.png',
    dataAiHint: 'woman portrait inspector',
    bio: 'Chloe implements our rigorous testing protocols, from raw material inspection to final product analysis, guaranteeing every bag meets our exceptional standards.',
    social: {
      linkedin: '#',
      email: 'mailto:c.davis@feedsport.co.zw',
    },
  },
   {
    name: 'Marcus Chen',
    role: 'Customer Success Manager',
    image: 'https://placehold.co/400x400.png',
    dataAiHint: 'man portrait customer service',
    bio: 'Marcus is the primary point of contact for our farming partners, providing expert support and ensuring their success with our products.',
    social: {
      linkedin: '#',
      email: 'mailto:m.chen@feedsport.co.zw',
    },
  },
];

export default function TeamPage() {
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
                    data-ai-hint={member.dataAiHint}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
                  <p className="text-green-600 font-medium mb-3">{member.role}</p>
                  <p className="text-gray-600 text-sm mb-4 min-h-[100px]">{member.bio}</p>
                  <div className="flex justify-center space-x-4">
                    <a href={member.social.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-700 transition-colors">
                      <FaLinkedinIn className="w-5 h-5" />
                    </a>
                    <a href={member.social.email} className="text-gray-400 hover:text-green-600 transition-colors">
                      <FaEnvelope className="w-5 h-5" />
                    </a>
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
