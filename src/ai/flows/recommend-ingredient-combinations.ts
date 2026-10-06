
'use server';

/**
 * @fileOverview Recommends ingredient combinations based on animal type and nutritional goals.
 * It only recommends products listed in the published catalogue.
 *
 * - recommendIngredientCombinations - A function that recommends ingredient combinations.
 * - RecommendIngredientCombinationsInput - The input type for the recommendIngredientCombinations function.
 * - RecommendIngredientCombinationsOutput - The return type for the recommendIngredientCombinations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getPublishedProducts } from '@/lib/products';

const RecommendIngredientCombinationsInputSchema = z.object({
  animalType: z.string().describe('The type of animal for which to recommend ingredients.'),
  nutritionalGoals: z.string().describe('The nutritional goals for the animal (e.g., growth, maintenance, performance).'),
});
export type RecommendIngredientCombinationsInput = z.infer<typeof RecommendIngredientCombinationsInputSchema>;

const RecommendIngredientCombinationsOutputSchema = z.object({
  recommendedIngredients: z.array(z.string()).describe('A list of recommended ingredient combinations using ONLY the listed catalogue ingredients.'),
  reasoning: z.string().describe('The AI reasoning behind the ingredient recommendations, explaining why the chosen ingredients meet the user goals.'),
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
    // Recommend only from the published catalogue, with each product's availability status.
    const products = await getPublishedProducts();
    const catalogueList = products.map((p) => `${p.name} (${p.status})`).join(', ');

    const prompt = `You are an expert animal nutritionist for FeedSport International.
A customer needs a feed formulation recommendation. Your most important rule is to **ONLY recommend ingredients from FeedSport's catalogue listed below.**

**Catalogue ingredients (availability status):**
${catalogueList}

Do not mention, suggest, or allude to any ingredient that is NOT in the list above. FeedSport sources from suppliers and does not hold warehouse stock, so never describe an ingredient as "in stock".

Here are the customer's requirements:
- **Animal Type:** ${input.animalType}
- **Nutritional Goals:** ${input.nutritionalGoals}

Your task:
1.  Provide a list of recommended ingredient combinations using ONLY the catalogue ingredients.
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
