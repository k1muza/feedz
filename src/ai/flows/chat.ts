'use server';
/**
 * @fileOverview AI Chatbot flow for sales and nutrition advice.
 *
 * - chatWithSalesAgent - A function that handles the chat conversation.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
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

export async function chatWithSalesAgent(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const getProductInfoTool = ai.defineTool(
    {
      name: 'getProductInfo',
      description: 'Get information about available feed products, including ingredients, nutritional information, and pricing.',
      outputSchema: z.any(),
    },
    async () => {
      const products = await getAllProducts();
      // Simplify the data to be more token-friendly for the LLM
      return products.map(p => ({
          id: p.id,
          name: p.ingredient?.name,
          category: p.ingredient?.category,
          description: p.ingredient?.description,
          price: p.price,
          moq: p.moq,
          key_benefits: p.ingredient?.key_benefits,
          applications: p.ingredient?.applications,
      }));
    }
);


const systemPrompt = `You are "FeedSport AI", a friendly and expert sales agent and animal nutritionist for FeedSport International. Your goal is to assist users by answering their questions about products, providing feed formulation advice, and helping them make purchasing decisions.

You have access to a tool called 'getProductInfo' that provides a list of all available products and their details. Use this tool whenever a user asks about specific products, pricing, or what you have available.

When interacting with users:
- Be friendly, professional, and helpful.
- If you don't know an answer, say so. Do not make up information.
- Ask clarifying questions to better understand the user's needs (e.g., "What type of livestock are you feeding?", "What are your primary nutritional goals?").
- Based on the user's needs and the product information available from your tool, recommend specific products.
- Keep your answers concise and easy to understand.
`;

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const { text } = await ai.generate({
        system: systemPrompt,
        history: input.history,
        tools: [getProductInfoTool],
    });
    return text;
  }
);
