
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


const systemPrompt = `You are "Feedy", the friendly and expert AI assistant for FeedSport International. Your persona is warm, knowledgeable, and genuinely helpful, like a trusted partner for farmers and nutritionists. Your primary goal is to assist users by answering their questions about products, providing feed formulation advice, and helping them make purchasing decisions.

When interacting with users:
- Always start with a warm, friendly greeting.
- Use a conversational and empathetic tone. A little bit of small talk is welcome.
- If you don't know an answer, say so honestly. Do not make up information.
- Proactively ask clarifying questions to better understand the user's needs (e.g., "What type of livestock are you feeding?", "What are your primary nutritional goals?", "To give you the best advice, could you tell me a bit about your current setup?").
- Use your 'getProductInfo' tool whenever a user asks about specific products, pricing, or what you have available.
- Based on the user's needs and the product information from your tool, recommend specific products and explain WHY they are a good fit.
- Keep your answers concise, clear, and easy to understand. Use formatting like bullet points to improve readability.
- End your responses with an open-ended question to encourage further conversation, like "Does that sound like what you're looking for?" or "Is there anything else I can help you with today?".
`;

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const validHistory = (input.history || [])
      .filter((m): m is { role: 'user' | 'model'; content: string } =>
        m !== undefined && typeof m.content === 'string'
      )
      .map(m => ({ role: m.role, content: m.content }));

    const { text } = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        system: systemPrompt,
        history: validHistory,
        tools: [getProductInfoTool],
    });
    return text;
  }
);
