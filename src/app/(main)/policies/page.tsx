
import { getAllPolicies } from '@/app/actions';
import SecondaryHero from '@/components/common/SecondaryHero';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const metadata: Metadata = {
  title: 'Company Policies',
  description: 'Read the official policies of FeedSport International regarding privacy, returns, and terms of service.',
  alternates: {
    canonical: '/policies',
  },
};

export default async function PoliciesPage() {
  const policies = await getAllPolicies();

  return (
    <>
      <SecondaryHero
        title="Company Policies"
        subtitle="Our commitment to transparency and our customers."
        minimal
      />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
            <Accordion type="single" collapsible className="w-full">
            {policies.map(policy => (
                <AccordionItem key={policy.id} value={`item-${policy.id}`}>
                    <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                        {policy.title}
                    </AccordionTrigger>
                    <AccordionContent className="prose prose-lg max-w-none pt-4 prose-headings:text-gray-800 prose-a:text-green-600">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{policy.content}</ReactMarkdown>
                    </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
            {policies.length === 0 && (
                <div className="text-center py-10">
                    <h3 className="text-xl text-gray-700">No policies have been published yet.</h3>
                    <p className="text-gray-500 mt-2">Please check back later.</p>
                </div>
            )}
        </div>
      </main>
    </>
  );
}
