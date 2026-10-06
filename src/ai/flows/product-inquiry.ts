
'use server';
/**
 * @fileOverview AI Chatbot flow specialized for product inquiries.
 *
 * This flow is an expert on product details, pricing, and availability.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { PRODUCT_STATUSES } from '@/data/feedProducts';
import { getPublishedProducts } from '@/lib/products';

const ChatInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).describe("The conversation history."),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.string().describe("The AI's response.");
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

/**
 * Defines the structure of a single product's information for the tool.
 */
const ProductSchema = z.object({
  id: z.string().describe('The unique product identifier.'),
  name: z.string().describe('The name of the product or ingredient.'),
  category: z.string().describe('The product category (e.g., Protein feeds).'),
  grade: z.string().describe('The grade or headline specification.'),
  description: z.string().describe('A brief description of the product.'),
  key_specs: z.array(z.string()).describe('Key nutrient values from the published specification.'),
  animals: z.array(z.string()).describe('Animals the ingredient is typically used for.'),
  packaging: z.string().describe('How the product is packed.'),
  price: z.number().optional().describe('The price of one pack of the product (see pack_size_kg).'),
  currency: z.string().optional(),
  pack_size_kg: z.number().optional().describe('The pack size in kg that the price is quoted for, e.g. 50 for a 50 kg bag.'),
  moq: z.string().describe('The minimum order quantity.'),
  availability: z.enum(PRODUCT_STATUSES).describe('Availability status. FeedSport sources from suppliers and does not hold warehouse stock.'),
});

const getProductInfoTool = ai.defineTool(
  {
    name: 'getProductInfo',
    description: 'Gets the published feed product catalogue, including availability status, key specifications and pricing.',
    outputSchema: z.array(ProductSchema),
  },
  async () => {
    const products = await getPublishedProducts();
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      grade: p.grade,
      description: p.description,
      key_specs: p.specs.map((spec) => `${spec.label}: ${spec.value}${spec.unit ? ` ${spec.unit}` : ''}`),
      animals: p.animals,
      packaging: p.packaging,
      price: p.price,
      currency: p.currency,
      pack_size_kg: p.packSizeKg,
      moq: p.moq,
      availability: p.status,
    }));
  }
);

const systemPrompt = `
You are "Feedy", a specialized AI assistant for FeedSport International. Your ONLY focus is product inquiries.

## Persona
Your persona is knowledgeable, efficient, and direct, like a helpful product catalog expert.

## Core Workflow & Critical Rules
You MUST follow this workflow for every query.

1.  **Use the Tool First**: Before answering any question, use the \`getProductInfo\` tool to get the current catalogue. Only discuss products it returns, and quote specifications, prices and MOQs exactly as given. Never invent figures.

2.  **Describe Availability Accurately**: FeedSport sources ingredients from suppliers and does not hold warehouse stock. Never say a product is "in stock" or ready for immediate collection. Use the \`availability\` value:
    - "Readily available": can be sourced at short notice.
    - "Limited": supply is tight; suggest confirming quantities with the team.
    - "Available to order": sourced on request, so lead times are longer.

3.  **Unknown Products**: If a user asks for something the catalogue does not list, say FeedSport does not currently list it and suggest a listed alternative that meets a similar need, or offer to have the team check.

4.  **Recommend and Justify**: Based on the user's needs, recommend suitable listed products and explain WHY each is a good fit, using the published specifications. For a firm quote or delivery date, direct the user to WhatsApp or call +263 77 468 4534.

## Example: Availability Question
User: "Do you have soybean meal in stock?"
Feedy: (After using the tool and seeing Soybean meal is "Readily available") "Soybean meal is readily available. We source it at short notice rather than holding it in a warehouse, so send us your quantity on WhatsApp (+263 77 468 4534) and the team will confirm a quote and delivery date."
`;

export const productInquiryFlow = ai.defineFlow(
  {
    name: 'productInquiryFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const args = {
      model: 'googleai/gemini-2.0-flash',
      system: systemPrompt,
      messages: input.history.map(msg => ({
        role: msg.role,
        content: [{ text: msg.content }],
      })),
      tools: [getProductInfoTool],
      cache: { enabled: false },
    }
    const { text } = await ai.generate(args);
    return text;
  }
);
