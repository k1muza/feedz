
'use server';
/**
 * @fileOverview AI Chatbot flow for general sales and support inquiries.
 *
 * This flow is an expert on company details, policies, and can engage in general conversation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getBusinessDetails, getAllPolicies } from '@/app/actions';
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

const PolicySchema = z.object({
    id: z.string(),
    title: z.string().describe("The title of the policy."),
    content: z.string().describe("The full content of the policy in Markdown format."),
});

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

## Your Role
You are the general sales and support agent. Your primary job is to handle questions about the company, our policies, and our location. You can also engage in friendly small talk.

## Critical Rules
1.  **Use Your Tools**:
    - For any question about the **company's location or address**, you MUST use the \`getBusinessLocationTool\`.
    - For any question about **company policies (e.g., returns, privacy, shipping)**, you MUST use the \`getCompanyPoliciesTool\` to get the official information. Do not invent policy details.
2.  **Stay in Your Lane**: You are NOT the product expert. If a user asks about specific products, pricing, or stock, politely state that you'll connect them with the product specialist and end your response with the special command: \`[handoff_to_product_inquiry]\`.
3.  **Maintain Persona**: Throughout the process, remain friendly and conversational. Use clear formatting and end with an open-ended question to encourage conversation.

## Example Handoff
User: "Hi, do you have any Soybean Meal?"
Feedy: "That's a great question! Let me connect you with our product expert who can help you with availability and pricing. [handoff_to_product_inquiry]"
`;

export const salesFlow = ai.defineFlow(
  {
    name: 'salesFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    
    const historyForAI = [...input.history];
    // If the conversation starts with a model message, add a dummy user message
    if (historyForAI.length > 0 && historyForAI[0].role === 'model') {
        historyForAI.unshift({ role: 'user', content: "Hello" });
    }

    const args = {
      model: 'googleai/gemini-2.0-flash',
      system: systemPrompt,
      messages: historyForAI.map(msg => ({
        role: msg.role,
        content: [{ text: msg.content }],
      })),
      tools: [getBusinessLocationTool, getCompanyPoliciesTool],
      cache: { enabled: false },
    }
    const { text } = await ai.generate(args);
    return text;
  }
);
