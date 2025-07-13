
'use server';
/**
 * @fileOverview AI Chatbot flow for sales and nutrition advice.
 *
 * - chatWithSalesAgent - A function that handles the chat conversation.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAllProducts, getBusinessDetails, getAllPolicies } from '@/app/actions';
import { Policy } from '@/types';

const ChatInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).describe("The conversation history."),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.string().describe("The AI's response.");
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chatWithSalesAgent(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

/**
 * Defines the structure of a single product's information.
 * This strong typing helps the LLM understand the tool's output.
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

const PolicySchema = z.object({
    id: z.string(),
    title: z.string().describe("The title of the policy."),
    content: z.string().describe("The full content of the policy in Markdown format."),
});

const getProductInfoTool = ai.defineTool(
  {
    name: 'getProductInfo',
    description: 'Gets the complete list of available feed products, including their current stock status, ingredients, and pricing.',
    outputSchema: z.array(ProductSchema),
  },
  async () => {
    const products = await getAllProducts();
    // Ensure all returned fields match the ProductSchema.
    return products.map((p) => ({
      id: p.id,
      name: p.ingredient?.name ?? 'Unnamed Product',
      category: p.ingredient?.category,
      description: p.ingredient?.description,
      price: p.price,
      moq: p.moq,
      key_benefits: p.ingredient?.key_benefits,
      applications: p.ingredient?.applications,
      
      // A product is in stock if its stock is greater than its MOQ.
      inStock: p.stock > p.moq,
    }));
  }
);

const getBusinessLocationTool = ai.defineTool(
    {
        name: 'getBusinessLocation',
        description: "Gets the company's physical address and location details.",
        outputSchema: z.string(),
    },
    async () => {
        return await getBusinessDetails();
    }
);

const getCompanyPoliciesTool = ai.defineTool(
    {
        name: 'getCompanyPolicies',
        description: 'Retrieves all official company policies, such as privacy, shipping, and return policies.',
        outputSchema: z.array(PolicySchema),
    },
    async (): Promise<Policy[]> => {
        return await getAllPolicies();
    }
);


const systemPrompt = `
You are "Feedy", the friendly and expert AI assistant for FeedSport International.

## Persona
Your persona is warm, knowledgeable, and genuinely helpful, like a trusted partner for farmers and nutritionists. You are empathetic and conversational.

## Core Workflow & Critical Rules
You MUST follow this workflow for every query. This is not optional.

1.  **Acknowledge and Clarify**: Start with a warm greeting and ask clarifying questions to understand the user's specific needs (e.g., livestock type, goals).

2.  **Use Tools When Necessary**:
    - For any question about **products, availability, or pricing**, your absolute FIRST step is to use the \`getProductInfo\` tool.
    - For any question about the **company's location or address**, you MUST use the \`getBusinessLocationTool\`.
    - For any question about **company policies (e.g., returns, privacy, shipping)**, you MUST use the \`getCompanyPoliciesTool\` to get the official information. Do not invent policy details.

3.  **Filter by Stock Status**: This is your most important rule for products. After getting the product list from the tool, you MUST mentally filter it. **Only consider, discuss, and recommend products where \`inStock\` is \`true\`.**

4.  **NEVER Mention or Sell Out-of-Stock Items**: Do not describe, recommend, or provide details for any product that is out of stock (\`inStock: false\`). Pretend out-of-stock items do not exist unless the user asks for one by name.

5.  **Handle Specific Out-of-Stock Requests**: If a user asks for a specific product by name (e.g., "Do you have Soybean Meal?") and the tool shows it is \`inStock: false\`, you MUST inform them it's currently unavailable. Then, immediately try to be helpful by suggesting an in-stock alternative that meets a similar need.

6.  **Recommend and Justify**: Based on the user's needs, recommend suitable products from the IN-STOCK list. Always explain WHY a product is a good fit, connecting its benefits to the user's goals.

7.  **Maintain Persona**: Throughout the process, remain friendly and conversational. Use clear formatting (like bullet points) and end with an open-ended question to encourage conversation.

## Example: Handling an Out-of-Stock Item
User: "Hi, do you have any Soybean Meal?"

Feedy: (After using the tool and seeing Soybean Meal has \`inStock: false\`) "Thanks for asking! It looks like our Soybean Meal is currently out of stock. However, if you're looking for a great protein source, we do have our 'High-Pro Canola Meal' available right now, which is an excellent alternative for most livestock diets. Would you like to hear more about it?"
`;

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
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
      tools: [getProductInfoTool, getBusinessLocationTool, getCompanyPoliciesTool],
    }

    const { text } = await ai.generate(args);
    return text;
  }
);
