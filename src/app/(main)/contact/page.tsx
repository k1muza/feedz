import ContactPageClient from './ContactPageClient';
import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Contact Us',
  description: 'Contact FeedSport in Harare for feed ingredient availability, quotations and practical livestock nutrition support across Zimbabwe.',
  path: '/contact',
});

export default function ContactPage() {
  return <ContactPageClient />;
}
