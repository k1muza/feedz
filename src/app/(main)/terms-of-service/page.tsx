import type { Metadata } from 'next';
import LegalDocument, { type LegalSection } from '@/components/common/LegalDocument';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Terms of Service',
  description: 'Read the terms and conditions for using the FeedSport International website and services.',
  path: '/terms-of-service',
});

const sections: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of terms',
    content: 'By accessing and using the FeedSport International website (the "Service"), you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services. Any participation in this service will constitute acceptance of this agreement. If you do not agree to abide by the above, please do not use this service.',
  },
  {
    id: 'service',
    title: 'Description of service',
    content: 'Our Service provides information about our products, feed formulation tools, an automated chat assistant, and a platform for communication. The Service is provided "as is" and we assume no responsibility for the timeliness, deletion, mis-delivery or failure to store any user communications or personalization settings.',
  },
  {
    id: 'use',
    title: 'Use of our services',
    content: 'You agree to use our Service for lawful purposes only. You agree not to use the service to:\n\n- Post or transmit any material which violates or infringes in any way upon the rights of others.\n- Engage in any conduct that would constitute a criminal offense, give rise to civil liability or otherwise violate any law.\n- Impersonate any person or entity or falsely state or otherwise misrepresent your affiliation with a person or entity.',
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual property',
    content: 'The Site and its original content, features, and functionality are owned by FeedSport International and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.',
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    content: 'In no event shall FeedSport International, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.',
  },
  {
    id: 'governing-law',
    title: 'Governing law',
    content: 'These Terms shall be governed and construed in accordance with the laws of Zimbabwe, without regard to its conflict of law provisions.',
  },
  {
    id: 'changes',
    title: 'Changes to terms',
    content: "We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.",
  },
  {
    id: 'contact',
    title: 'Contact us',
    content: 'If you have any questions about these Terms, please contact us at [sales@feedsport.co.zw](mailto:sales@feedsport.co.zw).',
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title="Terms of Service"
      intro="Please read these terms carefully before using the FeedSport website, formulation tools and chat assistant."
      lastUpdated="2026-10-05"
      sections={sections}
    />
  );
}
