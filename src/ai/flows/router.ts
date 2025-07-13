
'use server';
/**
 * @fileOverview The main router flow for the AI chatbot.
 * This flow classifies the user's intent and delegates to a specialized sub-flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { productInquiryFlow } from './product-inquiry';
import { salesFlow } from './sales';
import { recommendIngredientCombinations } from './recommend-ingredient-combinations';

const RouterInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).describe("The conversation history."),
});
export type RouterInput = z.infer<typeof RouterInputSchema>;

const RouterOutputSchema = z.string().describe("The AI's response.");
export type RouterOutput = z.infer<typeof RouterOutputSchema>;

export async function routeInquiry(input: RouterInput): Promise<RouterOutput> {
  return routerFlow(input);
}

const routerFlow = ai.defineFlow(
  {
    name: 'routerFlow',
    inputSchema: RouterInputSchema,
    outputSchema: RouterOutputSchema,
  },
  async (input) => {
    // Get the most recent user message
    const userMessage = input.history.findLast(m => m.role === 'user')?.content || '';

    const routingPrompt = `
    You are an expert at classifying customer inquiries for an animal feed company.
    Based on the latest user message, classify it into one of the following categories.
    Return ONLY the category name.

    Message: "${userMessage}"

    Categories:
    - "quick_product_inquiry": Direct questions about specific products, pricing, availability, or stock (e.g., "how much is corn?", "do you have soybean meal?", "is maize in stock?").
    - "formulation_advice": The user needs help creating a feed mix or wants a recommendation for what to feed their animals (e.g., "what should I feed my dairy cows?", "help me make a broiler starter feed").
    - "sales_inquiry": All other inquiries, including greetings, questions about the company, its location, policies, or general conversation.
    `;

    const { text: category } = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: routingPrompt,
        temperature: 0, // Be deterministic for routing
    });

    const flowType = category.trim();

    // Delegate to the appropriate sub-flow based on the classification
    switch (flowType) {
      case 'quick_product_inquiry':
        return productInquiryFlow(input);
      case 'formulation_advice':
        // The recommendIngredientCombinations flow needs a different input structure.
        // We'll extract the core request from the user's message for it.
        // This is a simplification; a more robust solution might extract entities.
        return recommendIngredientCombinations({
            animalType: 'unknown', // This could be extracted from history
            nutritionalGoals: userMessage,
        }).then(res => res.reasoning); // Just return the reasoning for now
      case 'sales_inquiry':
      default:
        return salesFlow(input);
    }
  }
);
