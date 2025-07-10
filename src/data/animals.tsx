import { Animal } from "@/types/animals";
import ALL_ANIMALS from "./animals.json";
import { getNutrients } from "./nutrients";

export function getAnimals(): Animal[] {
  return ALL_ANIMALS.map(animal => {
    return {
      ...animal,
      programs: animal.programs.map(program => {
        return {
          ...program,
          stages: program.stages.map(stage => {
            return {
              ...stage,
              requirements: stage.requirements.map(requirement => {
                return {
                  ...requirement,
                  nutrient: getNutrients().find(nutrient => nutrient.id === requirement.nutrientId),
                  min: requirement.min?.valueOf() ?? 0, // use optional chaining to handle undefined min
                  max: requirement.max?.valueOf(),
                  value: requirement.value?.valueOf() ?? 0
                }
              })
            }
          })
        }
      })
    }
  })
}
