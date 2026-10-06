import type { Policy, TeamMember } from '@/types';

// Fallback content shown until Supabase is connected, and the seed for its tables.

export const staticTeamMembers: TeamMember[] = [
  { id: 'nutrition', name: 'Nutrition & formulation', role: 'Technical team', image: '', bio: 'Practical ingredient selection, nutrient targets and formulation support for livestock producers.', social: {} },
  { id: 'supply', name: 'Ingredient supply', role: 'Procurement team', image: '', bio: 'Supplier coordination, batch specifications, stock planning and product quality checks.', social: {} },
  { id: 'support', name: 'Customer support', role: 'Sales & logistics', image: '', bio: 'Quotations, order coordination and delivery support across Zimbabwe.', social: {} },
];

export const staticPolicies: Policy[] = [
  {
    id: 'privacy',
    title: 'Privacy policy',
    lastUpdated: '2026-10-05',
    effectiveDate: '2026-10-05',
    content: '## Information we collect\n\nWe only use the contact details you choose to send through our contact form, by email, phone or WhatsApp to respond to your enquiry and fulfil an order. If you subscribe to updates, we store your email address to send them.\n\n## How we use it\n\nWe use enquiry details for quotations, product support, delivery coordination and customer service. We do not sell personal information.\n\n## Contact\n\nEmail [sales@feedsport.co.zw](mailto:sales@feedsport.co.zw) if you want us to correct or remove information you have sent us, or to unsubscribe.',
  },
  {
    id: 'supply',
    title: 'Supply and product information',
    lastUpdated: '2026-10-05',
    effectiveDate: '2026-10-05',
    content: '## Specifications\n\nPublished nutrient values are typical values unless a batch specification says otherwise. Confirm the current specification before formulation or purchase.\n\n## Availability\n\nStock status, minimum order quantities, packaging and lead times are confirmed when FeedSport issues a quotation.\n\n## Nutrition guidance\n\nWebsite formulation results are illustrative and should be reviewed for your animals, ingredients and production system.',
  },
];
