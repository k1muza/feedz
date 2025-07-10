'use server';

/**
 * @fileOverview Recommends ingredient combinations based on animal type and nutritional goals.
 *
 * - recommendIngredientCombinations - A function that recommends ingredient combinations.
 * - RecommendIngredientCombinationsInput - The input type for the recommendIngredientCombinations function.
 * - RecommendIngredientCombinationsOutput - The return type for the recommendIngredientCombinations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendIngredientCombinationsInputSchema = z.object({
  animalType: z.string().describe('The type of animal for which to recommend ingredients.'),
  nutritionalGoals: z.string().describe('The nutritional goals for the animal (e.g., growth, maintenance, performance).'),
});
export type RecommendIngredientCombinationsInput = z.infer<typeof RecommendIngredientCombinationsInputSchema>;

const RecommendIngredientCombinationsOutputSchema = z.object({
  recommendedIngredients: z.array(z.string()).describe('A list of recommended ingredient combinations.'),
  reasoning: z.string().describe('The AI reasoning behind the ingredient recommendations.'),
});
export type RecommendIngredientCombinationsOutput = z.infer<typeof RecommendIngredientCombinationsOutputSchema>;

export async function recommendIngredientCombinations(
  input: RecommendIngredientCombinationsInput
): Promise<RecommendIngredientCombinationsOutput> {
  return recommendIngredientCombinationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendIngredientCombinationsPrompt',
  input: {schema: RecommendIngredientCombinationsInputSchema},
  output: {schema: RecommendIngredientCombinationsOutputSchema},
  prompt: `You are an expert animal nutritionist. Based on the animal type and nutritional goals, recommend a combination of feed ingredients.

Animal Type: {{{animalType}}}
Nutritional Goals: {{{nutritionalGoals}}}

Provide a list of recommended ingredients and explain your reasoning.`,
});

const recommendIngredientCombinationsFlow = ai.defineFlow(
  {
    name: 'recommendIngredientCombinationsFlow',
    inputSchema: RecommendIngredientCombinationsInputSchema,
    outputSchema: RecommendIngredientCombinationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
