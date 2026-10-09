import { commercialPremixById, commercialPremixForProgramme, commercialPremixCompatibleWithProgramme } from "./commercial-premixes";
import type { Pool, PoolEntry } from "@/components/formulation-studio/engine";

/**
 * Studio uses the same real supplier catalogue as the public calculator/MCP.
 * Replace an old animal's commercial premix when the selected programme
 * changes. Never substitute a sow product for boars.
 */
export function poolWithProgrammePremix(pool: Pool, programmeId: string): Pool {
  const next: Pool = Object.fromEntries(Object.entries(pool).filter(([id]) => !commercialPremixById(id)));
  const product = commercialPremixForProgramme(programmeId);
  // Leaving CJ's restricted recipe: no basal ingredient may retain a locked
  // percentage from the previous animal. Restore their availability and
  // existing prices, then offer usual mineral/amino candidates for the new
  // animal. These are optional candidates, NOT invented recipe amounts.
  if (pool["cj-s174-boar-premix"] && product?.id !== "cj-s174-boar-premix") {
    for (const item of commercialPremixById("cj-s174-boar-premix")?.manufacturerRecipe ?? []) {
      if (item.ingredientId === "cj-s174-boar-premix") continue;
      const prior = next[item.ingredientId];
      if (prior) next[item.ingredientId] = {
        role: "available",
        ...(prior.price != null ? { price: prior.price } : {}),
      };
    }
    for (const id of ["limestone-ground", "dicalcium-phosphate", "sodium-chloride", "l-lysine-hcl", "dl-methionine"]) {
      if (!next[id]) next[id] = { role: "available" };
    }
  }
  if (!product) return next;
  if (product.manufacturerRecipe) {
    // CJ authorises only the published recipe. Keep any existing prices; lock
    // the source-provided proportions instead of inviting LP substitutions.
    return Object.fromEntries(product.manufacturerRecipe.map((item): [string, PoolEntry] => [
      item.ingredientId,
      { role: "fixed", fixed: item.percent, ...(pool[item.ingredientId]?.price != null
        ? { price: pool[item.ingredientId].price }
        : {}) },
    ]));
  }
  return {
    ...next,
    [product.id]: {
      role: "fixed",
      fixed: product.inclusionPct,
      ...(pool[product.id]?.price != null ? { price: pool[product.id].price } : {}),
    },
  };
}

/** A premix is a dedicated programme choice, never an unrestricted ingredient. */
export function canAddStudioIngredient(ingredientId: string, programmeId: string): boolean {
  // All commercial premixes are auto-selected in the programme selector.
  // Adding them through the regular ingredient picker bypasses required fixed
  // dose, supplier restrictions and one-product-per-recipe checks.
  return commercialPremixById(ingredientId) === undefined;
}

/** Validate old imported/saved snapshots before a network request. */
export function studioPremixProblems(pool: Pool, programmeId: string): string[] {
  const products = Object.entries(pool).filter(([id, row]) =>
    commercialPremixById(id) && row.role !== "excluded");
  const chosen = commercialPremixForProgramme(programmeId);
  if (products.length > 1) return ["Only one commercial premix may be included in a formulation."];
  if (products.length === 0) return [];
  const [id, row] = products[0];
  const product = commercialPremixById(id)!;
  if (!commercialPremixCompatibleWithProgramme(product, programmeId))
    return [`${product.name} is not suitable for this programme. Select the appropriate premix by changing programme.`];
  if (row.role !== "fixed" || Math.abs(Number(row.fixed) - product.inclusionPct) > 1e-6)
    return [`${product.name} must be fixed at its manufacturer dose of ${product.inclusionKgPerTonne} kg/t.`];
  if (chosen?.formulationCompatibility === "manufacturer_recipe_only") {
    const recipe = chosen.manufacturerRecipe ?? [];
    if (Object.keys(pool).length !== recipe.length || !recipe.every((part) => {
      const entry = pool[part.ingredientId];
      return entry?.role === "fixed" && Math.abs(Number(entry.fixed) - part.percent) < 1e-6;
    })) return [`${chosen.name} must use the manufacturer's complete fixed recipe. Do not alter ingredients or ratios.`];
  }
  return [];
}
