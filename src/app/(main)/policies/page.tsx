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
import { FileText, Clock, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Company Policies',
  description: 'Read the official policies of FeedSport International regarding privacy, returns, and terms of service.',
  alternates: {
    canonical: '/policies',
  },
};

// Custom markdown components that integrate with your design system
const MarkdownComponents = {
  // Headings with consistent styling
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6 first:mt-0 border-b border-gray-200 pb-2">
      {children}
    </h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-5 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-lg font-medium text-gray-700 mb-2 mt-4 first:mt-0">
      {children}
    </h3>
  ),
  
  // Paragraphs with proper spacing
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="text-gray-600 leading-relaxed mb-4 last:mb-0">
      {children}
    </p>
  ),
  
  // Lists with consistent styling
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="text-gray-600 mb-4 space-y-2 pl-4">
      {children}
    </ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="text-gray-600 mb-4 space-y-2 pl-4 list-decimal">
      {children}
    </ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="leading-relaxed">
      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></span>
      <span className="inline-block">{children}</span>
    </li>
  ),
  
  // Links that match your brand colors
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <a 
      href={href} 
      className="text-green-600 hover:text-green-700 underline decoration-green-300 hover:decoration-green-500 transition-colors"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  
  // Code blocks with proper styling
  code: ({ children }: { children: React.ReactNode }) => (
    <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">
      {children}
    </code>
  ),
  
  // Block quotes for important information
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-4 border-green-500 bg-green-50 pl-4 py-2 mb-4 italic text-gray-700">
      {children}
    </blockquote>
  ),
  
  // Tables with proper styling
  table: ({ children }: { children: React.ReactNode }) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border-collapse border border-gray-200">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: { children: React.ReactNode }) => (
    <th className="border border-gray-200 bg-gray-50 px-4 py-2 text-left font-semibold text-gray-800">
      {children}
    </th>
  ),
  td: ({ children }: { children: React.ReactNode }) => (
    <td className="border border-gray-200 px-4 py-2 text-gray-600">
      {children}
    </td>
  ),
  
  // Horizontal rules
  hr: () => (
    <hr className="my-6 border-gray-200" />
  ),
  
  // Strong and emphasis tags
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-semibold text-gray-800">{children}</strong>
  ),
  em: ({ children }: { children: React.ReactNode }) => (
    <em className="italic text-gray-700">{children}</em>
  ),
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
        {/* Introduction section for better context */}
        <div className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Important Information
                </h3>
                <p className="text-blue-800 leading-relaxed">
                  These policies govern your use of FeedSport International's services and products. 
                  Please read them carefully as they contain important information about your rights and obligations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main policies content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {policies.length === 0 ? (
            // Enhanced empty state
            <div className="text-center py-16 px-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No policies have been published yet
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                We're working on preparing our company policies. Please check back later or contact us if you have any questions.
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {policies.map((policy, index) => (
                <AccordionItem 
                  key={policy.id} 
                  value={`item-${policy.id}`}
                  className="border-gray-200 last:border-b-0"
                >
                  <AccordionTrigger className="px-8 py-6 text-left hover:no-underline hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold text-gray-900 mb-1">
                          {policy.title}
                        </h2>
                        {policy.lastUpdated && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            Last updated: {new Date(policy.lastUpdated).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-8 pb-8 pt-2">
                    {/* Content wrapper with better spacing and typography */}
                    <div className="border-t border-gray-100 pt-6">
                      <div className="max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={MarkdownComponents}
                        >
                          {policy.content}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Footer with additional context */}
                      <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>
                            Policy ID: {policy.id}
                          </span>
                          {policy.effectiveDate && (
                            <span>
                              Effective: {new Date(policy.effectiveDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        {/* Contact section for policy questions */}
        <div className="mt-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Questions about our policies?
            </h3>
            <p className="text-gray-600 mb-4">
              If you have any questions or concerns about our policies, please don't hesitate to contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a 
                href="/contact" 
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Contact Support
              </a>
              <a 
                href="mailto:legal@feedsport.com" 
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Email Legal Team
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
