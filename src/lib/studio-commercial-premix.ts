import { commercialPremixById, commercialPremixForProgramme } from "./commercial-premixes";
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
