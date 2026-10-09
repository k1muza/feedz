import {
  commercialPremixById,
  commercialPremixForProgramme,
  commercialPremixCompatibleWithProgramme,
} from "./commercial-premixes";
import type { Pool, PoolEntry } from "@/components/formulation-studio/engine";

/** Premixes participate in the same ingredient pool as maize, lysine or salt.
 * Their additional species, dose and manufacturer-recipe rules belong to the
 * ingredient, and are validated before the LP request AND on the server.
 */
function activeProduct(pool: Pool, programmeId: string) {
  return Object.entries(pool)
    .filter(([id, row]) => row.role !== "excluded" &&
      commercialPremixById(id) && commercialPremixCompatibleWithProgramme(commercialPremixById(id)!, programmeId))
    .map(([id]) => commercialPremixById(id)!)[0];
}

function unlockedAfterManufacturerRecipe(pool: Pool): Pool {
  const next: Pool = { ...pool };
  const former = Object.entries(pool)
    .map(([id]) => commercialPremixById(id))
    .find((p) => p?.manufacturerRecipe);
  if (!former?.manufacturerRecipe) return next;
  for (const item of former.manufacturerRecipe) {
    if (item.ingredientId === former.id) continue;
    const old = pool[item.ingredientId];
    if (old?.role === "fixed") next[item.ingredientId] = {
      role: "available",
      ...(old.price != null ? { price: old.price } : {}),
    };
  }
  for (const id of ["limestone-ground", "dicalcium-phosphate", "sodium-chloride", "l-lysine-hcl", "dl-methionine"]) {
    next[id] ??= { role: "available" };
  }
  return next;
}

export function poolWithProgrammePremix(pool: Pool, programmeId: string, preferredId?: string): Pool {
  const previous = unlockedAfterManufacturerRecipe(pool);
  const next: Pool = Object.fromEntries(Object.entries(previous)
    .filter(([id]) => !commercialPremixById(id)));
  const preferred = preferredId ? commercialPremixById(preferredId) : undefined;
  const chosen = preferred && commercialPremixCompatibleWithProgramme(preferred, programmeId)
    ? preferred
    : activeProduct(pool, programmeId) ?? commercialPremixForProgramme(programmeId);
  if (!chosen) return next;
  if (chosen.manufacturerRecipe) {
    // Manufacturer-restricted SKUs are still first-class ingredients, but
    // choosing one imposes a fixed *whole recipe*, not merely a dose.
    return Object.fromEntries(chosen.manufacturerRecipe.map((part): [string, PoolEntry] => [
      part.ingredientId, {
        role: "fixed", fixed: part.percent,
        ...(pool[part.ingredientId]?.price != null ? { price: pool[part.ingredientId].price } : {}),
      },
    ]));
  }
  return {
    ...next,
    [chosen.id]: {
      role: "fixed", fixed: chosen.inclusionPct,
      ...(pool[chosen.id]?.price != null ? { price: pool[chosen.id].price } : {}),
    },
  };
}

/** Ingredient-picker eligibility: cereals are unrestricted here (other limits
 * apply later), while commercial products require stage-specific approval.
 */
export function canAddStudioIngredient(ingredientId: string, programmeId: string): boolean {
  const product = commercialPremixById(ingredientId);
  return !product || commercialPremixCompatibleWithProgramme(product, programmeId);
}

export function selectStudioIngredient(pool: Pool, ingredientId: string, programmeId: string): Pool {
  if (!canAddStudioIngredient(ingredientId, programmeId)) {
    throw new Error(`Ingredient ${ingredientId} is not eligible for ${programmeId}.`);
  }
  if (commercialPremixById(ingredientId)) return poolWithProgrammePremix(pool, programmeId, ingredientId);
  return poolWithProgrammePremix({
    ...pool, [ingredientId]: pool[ingredientId] ?? { role: "available" },
  }, programmeId);
}

/** Legacy stored formulations are never allowed to bypass product rules. */
export function studioPremixProblems(pool: Pool, programmeId: string): string[] {
  const selected = Object.entries(pool).filter(([id, row]) =>
    commercialPremixById(id) && row.role !== "excluded");
  if (selected.length > 1) return ["Only one commercial premix may be included in a formulation."];
  if (selected.length === 0) return [];
  const [id, row] = selected[0];
  const product = commercialPremixById(id)!;
  if (!commercialPremixCompatibleWithProgramme(product, programmeId))
    return [`${product.name} is not suitable for ${programmeId}. Choose a compatible premix ingredient.`];
  if (row.role !== "fixed" || Math.abs(Number(row.fixed) - product.inclusionPct) > 1e-6)
    return [`${product.name} must be fixed at its manufacturer dose of ${product.inclusionKgPerTonne} kg/t.`];
  if (product.manufacturerRecipe) {
    const recipe = product.manufacturerRecipe;
    if (Object.keys(pool).length !== recipe.length || !recipe.every((part) => {
      const entry = pool[part.ingredientId];
      return entry?.role === "fixed" && Math.abs(Number(entry.fixed) - part.percent) < 1e-6;
    })) return [`${product.name} requires the manufacturer's complete fixed recipe. Do not alter ratios or ingredients.`];
  }
  return [];
}
