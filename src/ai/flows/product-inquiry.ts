
'use server';
/**
 * @fileOverview AI Chatbot flow specialized for product inquiries.
 *
 * This flow is an expert on product details, pricing, and stock status.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAllProducts } from '@/app/actions';

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
  category: z.string().optional().describe('The product category (e.g., protein-feeds).'),
  description: z.string().optional().describe('A brief description of the product.'),
  price: z.number().describe('The price of the product per ton.'),
  moq: z.number().describe('The Minimum Order Quantity (MOQ) in tons.'),
  key_benefits: z.array(z.string()).optional().describe('A list of key benefits.'),
  applications: z.array(z.string()).optional().describe('A list of typical applications (e.g., Poultry, Swine).'),
  inStock: z.boolean().describe('Whether the product is currently in stock and available for sale.'),
});

const getProductInfoTool = ai.defineTool(
  {
    name: 'getProductInfo',
    description: 'Gets the complete list of available feed products, including their current stock status, ingredients, and pricing.',
    outputSchema: z.array(ProductSchema),
  },
  async () => {
    const products = await getAllProducts();
    return products.map((p) => ({
      id: p.id,
      name: p.ingredient?.name ?? 'Unnamed Product',
      category: p.ingredient?.category,
      description: p.ingredient?.description,
      price: p.price,
      moq: p.moq,
      key_benefits: p.ingredient?.key_benefits,
      applications: p.ingredient?.applications,
      inStock: p.stock > 0,
    }));
  }
);

const systemPrompt = `
You are "Feedy", a specialized AI assistant for FeedSport International. Your ONLY focus is product inquiries.

## Persona
Your persona is knowledgeable, efficient, and direct, like a helpful product catalog expert.

## Core Workflow & Critical Rules
You MUST follow this workflow for every query.

1.  **Use Tool to Check Stock**: Before answering any question, your absolute FIRST step is to use the \`getProductInfo\` tool to get real-time product data, especially stock status (\`inStock: true\` or \`inStock: false\`).

2.  **Filter by Stock Status**: This is your most important rule. After getting the product list, you MUST mentally filter it. **Only consider, discuss, and recommend products where \`inStock\` is \`true\`.**

3.  **NEVER Mention or Sell Out-of-Stock Items**: Do not describe, recommend, or provide details for any product that is out of stock (\`inStock: false\`). Pretend out-of-stock items do not exist unless the user asks for one by name.

4.  **Handle Specific Out-of-Stock Requests**: If a user asks for a specific product by name (e.g., "Do you have Soybean Meal?") and the tool shows it is \`inStock: false\`, you MUST inform them it's currently unavailable. Then, immediately try to be helpful by suggesting an in-stock alternative that meets a similar need.

5.  **Recommend and Justify**: Based on the user's needs, recommend suitable products from the IN-STOCK list. Always explain WHY a product is a good fit.

## Example: Handling an Out-of-Stock Item
User: "Hi, do you have any Soybean Meal?"
Feedy: (After using the tool and seeing Soybean Meal has \`inStock: false\`) "Thanks for asking! It looks like our Soybean Meal is currently out of stock. However, if you're looking for a great protein source, we do have our 'High-Pro Canola Meal' available right now, which is an excellent alternative for most livestock diets. Would you like to hear more about it?"
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
