'use server';

/**
 * @fileOverview Generates product details based on a product name.
 * 
 * - generateProductDetails - A function that generates product details.
 * - GenerateProductDetailsInput - The input type for the generateProductDetails function.
 * - GenerateProductDetailsOutput - The return type for the generateProductDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateProductDetailsInputSchema = z.object({
  productName: z.string().describe('The name of the feed ingredient or product.'),
});
export type GenerateProductDetailsInput = z.infer<typeof GenerateProductDetailsInputSchema>;

const GenerateProductDetailsOutputSchema = z.object({
  description: z.string().describe('A detailed and compelling product description suitable for an e-commerce page. Use markdown for formatting.'),
  category: z.enum(['protein-feeds', 'energy-feeds', 'minerals', 'amino-acids', 'forage-products', 'fiber-products']).describe('The most appropriate category for the product.'),
  keyBenefits: z.array(z.string()).describe('A list of 3-5 key benefits of the product for livestock.'),
  applications: z.array(z.string()).describe('A list of common animal types this product is used for (e.g., Poultry, Swine, Cattle).'),
  suggestedPackaging: z.string().describe('A common packaging format for this type of product (e.g., "50kg WPP Bags", "Bulk").'),
});
export type GenerateProductDetailsOutput = z.infer<typeof GenerateProductDetailsOutputSchema>;


export async function generateProductDetails(
  input: GenerateProductDetailsInput
): Promise<GenerateProductDetailsOutput> {
  return generateProductDetailsFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateProductDetailsPrompt',
  input: { schema: GenerateProductDetailsInputSchema },
  output: { schema: GenerateProductDetailsOutputSchema },
  prompt: `You are a world-class animal nutrition marketing expert. Your task is to generate compelling product information for a new feed ingredient.

Product Name: {{{productName}}}

Based on the product name, please generate the following information. Be concise and professional.
- A detailed product description.
- The most suitable product category.
- 3 to 5 key benefits.
- A list of typical applications (animal types).
- A suggested packaging format.
`,
});

const generateProductDetailsFlow = ai.defineFlow(
  {
    name: 'generateProductDetailsFlow',
    inputSchema: GenerateProductDetailsInputSchema,
    outputSchema: GenerateProductDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
