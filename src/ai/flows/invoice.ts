
'use server';

/**
 * @fileOverview AI Chatbot flow specialized for creating customer invoices.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAllProducts, createInvoice } from '@/app/actions';
import { Timestamp } from 'firebase/firestore';
import { ClientInfo } from '@/types';

// Define schemas for Zod
const ProductInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
});

const InvoiceLineItemSchema = z.object({
  productName: z.string().describe("The name of the product being ordered."),
  quantity: z.number().describe("The quantity of the product being ordered."),
});

const ClientInfoInputSchema = z.object({
    name: z.string().describe("The full name of the customer placing the order."),
    email: z.string().email().describe("The email address of the customer."),
    address: z.string().describe("The customer's physical address."),
    city: z.string().describe("The customer's city and state/province."),
    phone: z.string().describe("The customer's phone number."),
});

const CreateInvoiceInputSchema = z.object({
  client: ClientInfoInputSchema.describe("The customer's contact and address details."),
  lineItems: z.array(InvoiceLineItemSchema).describe("A list of products and quantities for the invoice."),
});

// Define tool for getting product info
const getProductInfoTool = ai.defineTool(
  {
    name: 'getProductInfo',
    description: 'Gets the list of available products and their prices to help construct an invoice.',
    outputSchema: z.array(ProductInfoSchema),
  },
  async () => {
    const products = await getAllProducts();
    return products.map(p => ({
      id: p.id,
      name: p.ingredient?.name ?? 'Unknown',
      price: p.price,
    }));
  }
);

// Define tool for creating the invoice in the database
const createInvoiceTool = ai.defineTool(
  {
    name: 'createInvoiceInDatabase',
    description: 'Saves the finalized invoice to the database. This is the final step.',
    inputSchema: CreateInvoiceInputSchema,
    outputSchema: z.object({ invoiceId: z.string() }),
  },
  async (input) => {
    const products = await getAllProducts();
    const productMap = new Map(products.map(p => [p.ingredient?.name, p]));
    let totalAmount = 0;

    const invoiceItems = input.lineItems.map(item => {
      const product = productMap.get(item.productName);
      if (!product) {
        throw new Error(`Product "${item.productName}" not found for invoice.`);
      }
      const itemTotal = item.quantity * product.price;
      totalAmount += itemTotal;
      return {
        id: product.id,
        description: item.productName,
        quantity: item.quantity,
        price: product.price,
      };
    });

    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(issueDate.getDate() + 30);

    const result = await createInvoice({
      client: input.client,
      items: invoiceItems,
      totalAmount,
      date: Timestamp.fromDate(issueDate),
      dueDate: Timestamp.fromDate(dueDate),
      status: 'draft',
      taxRate: 0.15, // Default tax rate
      notes: 'Thank you for your business!',
      paymentTerms: 'Payment due within 30 days.',
      bank: {
          name: 'NMB Bank',
          accountName: 'FeedSport Enterprises',
          accountNumber: '0123456789',
          branch: 'Borrowdale Branch'
      },
    });

    if (!result.success || !result.id) {
      throw new Error(result.error || 'Failed to create invoice in database.');
    }

    return { invoiceId: result.id };
  }
);

const systemPrompt = `
You are "Feedy", a specialized AI assistant for FeedSport International. Your role is to act as a sales agent and create draft invoices for customers.

## Core Workflow
1.  **Acknowledge**: Confirm the user wants to create an order/invoice.
2.  **Gather Information**: Politely ask for any missing information required to create the invoice. You MUST have the customer's full name, email, phone number, address, city, and a list of products with quantities.
3.  **Use Tools**:
    *   You MUST use the \`getProductInfo\` tool to see available products and their prices. DO NOT invent products or prices.
    *   Once all information is gathered, you MUST use the \`createInvoiceInDatabase\` tool to save the invoice.
4.  **Confirm**: After creating the invoice, confirm to the user that a draft invoice has been created and that the sales team will send it to their email for final confirmation and payment details.
5.  **Be Clear**: Do not ask for payment information. State that this will be handled by the sales team.

## Example
User: "I'd like to order 10 tons of Soybean Meal and 5 tons of Maize Meal. My name is John Doe, email is john@example.com, phone is 555-1234, and I'm at 123 Farm Rd, Harare."
Feedy: (Uses getProductInfo to check stock/prices). "Great! I can create a draft invoice for 10 tons of Soybean Meal and 5 tons of Maize Meal for John Doe. I'm just saving that now." (Uses createInvoiceInDatabase). "All set! I've created a draft invoice. Our sales team will email it to john@example.com shortly with the final details for confirmation and payment."
`;

export const invoiceFlow = ai.defineFlow(
  {
    name: 'invoiceFlow',
    inputSchema: z.any(), // Using any for simplicity with chat history
    outputSchema: z.string(),
  },
  async (input) => {
    const { text } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      system: systemPrompt,
      messages: input.history.map((msg: any) => ({
        role: msg.role,
        content: [{ text: msg.content }],
      })),
      tools: [getProductInfoTool, createInvoiceTool],
      cache: { enabled: false },
    });
    return text;
  }
);
