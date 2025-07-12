
'use server';

/**
 * @fileOverview Recommends ingredient combinations based on animal type and nutritional goals.
 * This flow is stock-aware and will only recommend products that are currently in stock.
 *
 * - recommendIngredientCombinations - A function that recommends ingredient combinations.
 * - RecommendIngredientCombinationsInput - The input type for the recommendIngredientCombinations function.
 * - RecommendIngredientCombinationsOutput - The return type for the recommendIngredientCombinations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getAllProducts } from '@/app/actions';
import { Product } from '@/types';

const RecommendIngredientCombinationsInputSchema = z.object({
  animalType: z.string().describe('The type of animal for which to recommend ingredients.'),
  nutritionalGoals: z.string().describe('The nutritional goals for the animal (e.g., growth, maintenance, performance).'),
});
export type RecommendIngredientCombinationsInput = z.infer<typeof RecommendIngredientCombinationsInputSchema>;

// The output remains the same, but the recommendations will be stock-aware.
const RecommendIngredientCombinationsOutputSchema = z.object({
  recommendedIngredients: z.array(z.string()).describe('A list of recommended ingredient combinations using ONLY the provided in-stock ingredients.'),
  reasoning: z.string().describe('The AI reasoning behind the ingredient recommendations, explaining why the chosen in-stock ingredients meet the user goals.'),
});
export type RecommendIngredientCombinationsOutput = z.infer<typeof RecommendIngredientCombinationsOutputSchema>;

export async function recommendIngredientCombinations(
  input: RecommendIngredientCombinationsInput
): Promise<RecommendIngredientCombinationsOutput> {
  return recommendIngredientCombinationsFlow(input);
}

// We no longer define the prompt separately, as it's now dynamically generated inside the flow.
const recommendIngredientCombinationsFlow = ai.defineFlow(
  {
    name: 'recommendIngredientCombinationsFlow',
    inputSchema: RecommendIngredientCombinationsInputSchema,
    outputSchema: RecommendIngredientCombinationsOutputSchema,
  },
  async (input) => {
    // 1. Fetch all products to determine stock status.
    const allProducts = await getAllProducts();

    // 2. Filter for products that are in stock (stock > MOQ).
    const inStockProducts = allProducts.filter(p => p.stock > p.moq);
    const inStockProductNames = inStockProducts.map(p => p.ingredient?.name).filter(Boolean).join(', ');

    // 3. Define the dynamic prompt with the list of in-stock products.
    const prompt = `You are an expert animal nutritionist for FeedSport International.
A customer needs a feed formulation recommendation. Your most important rule is to **ONLY recommend ingredients from the list of products that are currently in stock.**

**Available In-Stock Ingredients:**
${inStockProductNames}

Do not mention, suggest, or allude to any ingredient that is NOT in the list above. Base your entire recommendation on what is available.

Here are the customer's requirements:
- **Animal Type:** ${input.animalType}
- **Nutritional Goals:** ${input.nutritionalGoals}

Your task:
1.  Provide a list of recommended ingredient combinations using ONLY the available in-stock ingredients.
2.  Explain your reasoning, detailing how the selected combination meets the specified nutritional goals for the given animal type.`;

    const { output } = await ai.generate({
      prompt: prompt,
      output: {
        schema: RecommendIngredientCombinationsOutputSchema,
      },
    });

    return output!;
  }
);
