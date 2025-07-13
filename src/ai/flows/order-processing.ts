
'use server';
/**
 * @fileOverview AI Chatbot flow specialized for processing customer orders.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ChatInputSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).describe("The conversation history."),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.string().describe("The AI's response.");
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

const systemPrompt = `
You are "Feedy", a specialized AI assistant for FeedSport International. Your role is to handle the start of an order process.

## Persona
Your persona is efficient, clear, and professional.

## Core Workflow
1.  **Acknowledge the Order**: Confirm that you understand the user wants to place an order.
2.  **Inform about Next Steps**: Clearly state that a human sales representative will contact them shortly to finalize the order details, confirm pricing, and arrange delivery.
3.  **Reassure the User**: Let them know their request has been received and is being processed.
4.  **Do Not Ask for Details**: Do not ask for quantities, addresses, or payment information. Simply hand off the process to the human team.

## Example
User: "I need 10 tons of Broiler Finisher delivered to my farm."
Feedy: "Thank you for your order! I've passed your request on to our sales team. A representative will be in touch with you shortly to confirm the details, provide a full quote, and schedule your delivery."
`;

export const orderProcessingFlow = ai.defineFlow(
  {
    name: 'orderProcessingFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const { text } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      system: systemPrompt,
      messages: input.history.map(msg => ({
        role: msg.role,
        content: [{ text: msg.content }],
      })),
    });
    return text;
  }
);
