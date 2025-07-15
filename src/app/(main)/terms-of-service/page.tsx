
import SecondaryHero from '@/components/common/SecondaryHero';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the terms and conditions for using the FeedSport International website and services.',
  alternates: {
    canonical: '/terms-of-service',
  },
};

export default function TermsOfServicePage() {
  return (
    <>
      <SecondaryHero
        title="Terms of Service"
        subtitle="Please read these terms carefully before using our services."
        minimal
      />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 prose prose-lg max-w-none">
          <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using the FeedSport International website (the "Service"), you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services. Any participation in this service will constitute acceptance of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>
          
          <h2>2. Description of Service</h2>
          <p>
            Our Service provides information about our products, AI-driven recommendations, and a platform for communication. The Service is provided "as is" and we assume no responsibility for the timeliness, deletion, mis-delivery or failure to store any user communications or personalization settings.
          </p>

          <h2>3. Use of Our Services</h2>
          <p>
            You agree to use our Service for lawful purposes only. You agree not to use the service to:
          </p>
          <ul>
            <li>Post or transmit any material which violates or infringes in any way upon the rights of others.</li>
            <li>Engage in any conduct that would constitute a criminal offense, give rise to civil liability or otherwise violate any law.</li>
            <li>Impersonate any person or entity or falsely state or otherwise misrepresent your affiliation with a person or entity.</li>
          </ul>

          <h2>4. Intellectual Property</h2>
          <p>
            The Site and its original content, features, and functionality are owned by FeedSport International and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
          </p>
          
          <h2>5. Limitation of Liability</h2>
          <p>
            In no event shall FeedSport International, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
          </p>

          <h2>6. Governing Law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of Zimbabwe, without regard to its conflict of law provisions.
          </p>

          <h2>7. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </p>
          
          <h2>8. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at legal@feedsport.co.zw.
          </p>
        </div>
      </main>
    </>
  );
}
