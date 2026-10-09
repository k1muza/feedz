import type { Metadata } from 'next';
import LegalDocument from '@/components/common/LegalDocument';
import { getPolicies } from '@/lib/content';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Company Policies',
  description: 'Read FeedSport International policies on privacy, product specifications, availability and nutrition guidance.',
  path: '/policies',
});

export const revalidate = 3600;

export default async function PoliciesPage() {
  const policies = await getPolicies();
  const lastUpdated = policies.map((policy) => policy.lastUpdated).filter(Boolean).sort().at(-1);
  return (
    <LegalDocument
      eyebrow="Privacy and policies"
      title="How we handle your information"
      intro="These policies cover the personal details you share with FeedSport and how to read the product, availability and nutrition information on this site."
      lastUpdated={lastUpdated}
      sections={policies}
      emptyMessage="We are preparing our company policies. Please check back later, or contact us if you have a question in the meantime."
    />
  );
}
