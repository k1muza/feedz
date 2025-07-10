'use server';

import { recommendIngredientCombinations } from '@/ai/flows/recommend-ingredient-combinations';
import type {
  RecommendIngredientCombinationsInput,
  RecommendIngredientCombinationsOutput,
} from '@/ai/flows/recommend-ingredient-combinations';

export async function getRecommendations(
  input: RecommendIngredientCombinationsInput
): Promise<RecommendIngredientCombinationsOutput> {
  try {
    const result = await recommendIngredientCombinations(input);
    return result;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    // In a real app, you'd want more robust error handling and logging.
    throw new Error('Failed to get recommendations from AI.');
  }
}
