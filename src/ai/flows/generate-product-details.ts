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
import { getNutrients } from '@/data/nutrients';

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
  compositions: z.array(z.object({
    nutrientName: z.string().describe('The name of the nutrient, which must be one of the provided valid nutrient names.'),
    value: z.number().describe('The typical value for this nutrient in the specified product.'),
  })).describe('A list of 5-7 key nutritional compositions. Only include the most common and important nutrients for this type of product.'),
});
export type GenerateProductDetailsOutput = z.infer<typeof GenerateProductDetailsOutputSchema>;


export async function generateProductDetails(
  input: GenerateProductDetailsInput
): Promise<GenerateProductDetailsOutput> {
  return generateProductDetailsFlow(input);
}

const allNutrients = getNutrients();
const validNutrientNames = allNutrients.map(n => n.name).join(', ');

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
- A list of 5-7 key nutritional compositions.

Valid nutrient names are: ${validNutrientNames}. You must only use nutrient names from this list.
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
