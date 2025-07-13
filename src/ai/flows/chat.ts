
'use server';
/**
 * @fileOverview AI Chatbot flow for sales and nutrition advice.
 *
 * - chatWithSalesAgent - A function that handles the chat conversation.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import { routeInquiry, RouterInput } from '@/ai/flows/router';

export async function chatWithSalesAgent(input: RouterInput): Promise<string> {
  // For now, we are directly routing all inquiries.
  // This function can be expanded later if pre-processing is needed.
  return routeInquiry(input);
}
