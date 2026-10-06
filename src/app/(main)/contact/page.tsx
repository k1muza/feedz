import ContactPageClient from './ContactPageClient';
import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Contact Us: Feed Ingredient Quotes in Harare',
  description: 'Contact FeedSport at 2 William Pollet Road, Borrowdale, Harare. Call or WhatsApp +263 77 468 4534 for feed ingredient quotes, availability and livestock nutrition support across Zimbabwe.',
  path: '/contact',
});

export default function ContactPage() {
  return <ContactPageClient />;
}
