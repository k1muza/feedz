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
