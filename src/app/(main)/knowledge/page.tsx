import type { Metadata } from 'next';
import KnowledgeClient from './KnowledgeClient';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Knowledge Centre',
  description: 'Practical FeedSport guides for livestock nutrition, feed ingredients and on-farm formulation.',
  path: '/knowledge',
});

export default function KnowledgePage() {
  return <KnowledgeClient />;
}
