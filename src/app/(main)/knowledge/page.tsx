import type { Metadata } from 'next';
import KnowledgeClient from './KnowledgeClient';

export const metadata: Metadata = {
  title: 'Knowledge Centre',
  description: 'Practical FeedSport guides for livestock nutrition, feed ingredients and on-farm formulation.',
  alternates: { canonical: '/knowledge' },
};

export default function KnowledgePage() {
  return <KnowledgeClient />;
}
