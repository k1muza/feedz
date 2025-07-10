import { Nutrient } from "@/types";
import nutrients from "../data/nutrients.json"

export const getNutrients = (): Nutrient[] => {
  return nutrients
}

export const getNutrientById = (id: string): Nutrient|undefined => getNutrients().find(n => n.id === id)
