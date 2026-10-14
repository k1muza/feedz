import {
  commercialPremixById,
  commercialPremixForProgramme,
  commercialPremixCompatibleWithProgramme,
  eligibleCommercialPremixes,
  type CommercialPremix,
} from "./commercial-premixes";
import { feedProgrammePhaseById } from "./feed-programmes";
import type { Pool, PoolEntry } from "@/components/formulation-studio/engine";
import { INCLUSION_TOLERANCE_PCT } from "./numerical-tolerance";

/** Premixes participate in the same ingredient pool as maize, lysine or salt.
 * Their additional species, dose and manufacturer-recipe rules belong to the
 * ingredient, and are validated before the LP request AND on the server.
 */
function activeProduct(pool: Pool, programmeId: string, phaseId?: string) {
  return Object.entries(pool)
    .filter(([id, row]) => row.role !== "excluded" &&
      commercialPremixById(id) && commercialPremixCompatibleWithProgramme(commercialPremixById(id)!, programmeId, phaseId))
    .map(([id]) => commercialPremixById(id)!)[0];
}

function unlockedAfterManufacturerRecipe(
  pool: Pool,
  former = Object.keys(pool).map((id) => commercialPremixById(id)).find((p) => p?.manufacturerRecipe),
): Pool {
  const next: Pool = { ...pool };
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

export function poolWithProgrammePremix(pool: Pool, programmeId: string, preferredId?: string, phaseId?: string): Pool {
  const previous = unlockedAfterManufacturerRecipe(pool);
  const next: Pool = Object.fromEntries(Object.entries(previous)
    .filter(([id]) => !commercialPremixById(id)));
  const preferred = preferredId ? commercialPremixById(preferredId) : undefined;
  const chosen = preferred && commercialPremixCompatibleWithProgramme(preferred, programmeId, phaseId)
    ? preferred
    : activeProduct(pool, programmeId, phaseId) ?? commercialPremixForProgramme(programmeId, phaseId);
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

/** Applies the farmer's explicit premix choice from Studio. Unlike
 * poolWithProgrammePremix, null means "no premix" and must not fall back to
 * the programme default.
 */
export function poolWithPremixSelection(pool: Pool, programmeId: string, premixId: string | null, phaseId?: string): Pool {
  if (premixId) {
    const product = commercialPremixById(premixId);
    if (!product || !commercialPremixCompatibleWithProgramme(product, programmeId, phaseId)) {
      throw new Error(`Premix ${premixId} is not eligible for ${programmeId}.`);
    }
    return poolWithProgrammePremix(pool, programmeId, premixId, phaseId);
  }

  const unlocked = unlockedAfterManufacturerRecipe(pool);
  return Object.fromEntries(Object.entries(unlocked).filter(([id]) => !commercialPremixById(id)));
}

/** Replaces the basal ingredient source, or moves to another programme or
 * stage, while carrying the premix choice made in Studio's separate selector.
 * An eligible premix is re-asserted at its manufacturer dose with its price.
 * One that is no longer eligible is carried unchanged, never dropped or
 * swapped: studioPremixConflict then asks the farmer to decide. This also
 * preserves an explicit no-premix choice while a suggestion list arrives.
 */
export function poolWithCarriedPremixSelection(nextPool: Pool, currentPool: Pool, programmeId: string, phaseId?: string): Pool {
  const selected = Object.entries(currentPool)
    .find(([id, row]) => row.role !== "excluded" && !!commercialPremixById(id));
  const product = selected ? commercialPremixById(selected[0]) : undefined;
  if (!selected || !product || commercialPremixCompatibleWithProgramme(product, programmeId, phaseId)) {
    return poolWithPremixSelection(nextPool, programmeId, selected?.[0] ?? null, phaseId);
  }
  const basal = Object.fromEntries(Object.entries(nextPool).filter(([id]) => !commercialPremixById(id)));
  return { ...basal, [selected[0]]: selected[1] };
}

/** A selected premix the current programme phase does not permit. */
export type StudioPremixConflict = {
  premix: CommercialPremix;
  /** Why it is ineligible, in the farmer's terms. */
  reason: string;
  /** Eligible products for this phase; the programme default comes first. */
  eligible: CommercialPremix[];
};

/** The selected premix when it no longer fits this programme phase, e.g. after
 * a stage change. Re-formulating waits until the farmer replaces it or
 * explicitly continues without one; nothing here chooses for them.
 */
export function studioPremixConflict(pool: Pool, programmeId: string, phaseId?: string): StudioPremixConflict | null {
  const premix = Object.entries(pool)
    .filter(([, row]) => row.role !== "excluded")
    .map(([id]) => commercialPremixById(id))
    .find((product) => product !== undefined);
  if (!premix || commercialPremixCompatibleWithProgramme(premix, programmeId, phaseId)) return null;
  const phase = phaseId ? feedProgrammePhaseById(programmeId, phaseId) : undefined;
  const family = programmeId.split(":")[0].toLowerCase();
  const familyOk = premix.eligibleProgrammePrefixes.some((prefix) => family.startsWith(prefix));
  const reason = familyOk && phase && premix.eligiblePhaseClasses?.length
    ? `${premix.name} is labelled for ${premix.eligiblePhaseClasses.join(" and ")} phases only (${premix.application.toLowerCase()}); this stage is a ${phase.phaseClass} phase.`
    : `${premix.name} is labelled for ${premix.application.toLowerCase()}, not this programme.`;
  const fallback = commercialPremixForProgramme(programmeId, phaseId);
  const eligible = eligibleCommercialPremixes(programmeId, phaseId)
    .sort((a, b) => Number(b.id === fallback?.id) - Number(a.id === fallback?.id));
  return { premix, reason, eligible };
}

/** Takes a premix out of the formulation: deleted, or kept as an unticked row.
 * Leaving a manufacturer recipe also unlocks its basal ingredients, which
 * would otherwise stay fixed at shares nothing else can complete.
 */
export function poolWithoutPremix(pool: Pool, premixId: string, keepUnticked = false): Pool {
  const next = unlockedAfterManufacturerRecipe(pool, commercialPremixById(premixId));
  const row = pool[premixId];
  if (keepUnticked && row) next[premixId] = { ...row, was: row.role, role: "excluded" };
  else delete next[premixId];
  return next;
}

/** Records a supplier quote for a premix. An eligible one is re-asserted at
 * its manufacturer dose (and recipe); an ineligible legacy one only takes the
 * price, so studioPremixProblems still reports it rather than the programme
 * default being added alongside it.
 */
export function poolWithPremixPrice(pool: Pool, premixId: string, programmeId: string, price?: number, phaseId?: string): Pool {
  const row: PoolEntry = { ...(pool[premixId] ?? { role: "fixed" }) };
  if (price === undefined) delete row.price;
  else row.price = price;
  const next = { ...pool, [premixId]: row };
  const product = commercialPremixById(premixId);
  if (!product || row.role === "excluded" || !commercialPremixCompatibleWithProgramme(product, programmeId, phaseId)) return next;
  return poolWithProgrammePremix(next, programmeId, premixId, phaseId);
}

/** Ingredient-picker eligibility: cereals are unrestricted here (other limits
 * apply later), while commercial products require stage-specific approval.
 */
export function canAddStudioIngredient(ingredientId: string, programmeId: string, pool?: Pool, phaseId?: string): boolean {
  const product = commercialPremixById(ingredientId);
  if (product && !commercialPremixCompatibleWithProgramme(product, programmeId, phaseId)) return false;
  // A restricted manufacturer recipe is atomic: only another eligible premix
  // selection can replace it, not a free-form basal addition.
  if (!product && pool && activeProduct(pool, programmeId, phaseId)?.manufacturerRecipe) return false;
  return true;
}

export function selectStudioIngredient(pool: Pool, ingredientId: string, programmeId: string, phaseId?: string): Pool {
  if (!canAddStudioIngredient(ingredientId, programmeId, pool, phaseId)) {
    throw new Error(`Ingredient ${ingredientId} is not eligible for ${programmeId}.`);
  }
  if (commercialPremixById(ingredientId)) return poolWithProgrammePremix(pool, programmeId, ingredientId, phaseId);
  const selected = activeProduct(pool, programmeId, phaseId);
  if (selected?.manufacturerRecipe) {
    throw new Error(`${selected.name} requires a fixed manufacturer recipe. To change ingredients, remove this premix first.`);
  }
  // Preserve an intentional "no premix" choice instead of reintroducing the
  // default whenever a farmer adds another ordinary ingredient.
  return { ...pool, [ingredientId]: pool[ingredientId] ?? { role: "available" } };
}

/** Legacy stored formulations are never allowed to bypass product rules. */
export function studioPremixProblems(pool: Pool, programmeId: string, phaseId?: string): string[] {
  const selected = Object.entries(pool).filter(([id, row]) =>
    commercialPremixById(id) && row.role !== "excluded");
  if (selected.length > 1) return ["Only one premix may be included in a formulation."];
  if (selected.length === 0) return [];
  const [id, row] = selected[0];
  const product = commercialPremixById(id)!;
  if (!commercialPremixCompatibleWithProgramme(product, programmeId, phaseId))
    return [`${product.name} is not suitable for ${programmeId}. Choose a compatible premix ingredient.`];
  if (row.role !== "fixed" || Math.abs(Number(row.fixed) - product.inclusionPct) > INCLUSION_TOLERANCE_PCT)
    return [`${product.name} must be fixed at its manufacturer dose of ${product.inclusionKgPerTonne} kg/t.`];
  if (product.manufacturerRecipe) {
    const recipe = product.manufacturerRecipe;
    if (Object.keys(pool).length !== recipe.length || !recipe.every((part) => {
      const entry = pool[part.ingredientId];
      return entry?.role === "fixed" && Math.abs(Number(entry.fixed) - part.percent) <= INCLUSION_TOLERANCE_PCT;
    })) return [`${product.name} requires the manufacturer's complete fixed recipe. Do not alter ratios or ingredients.`];
  }
  return [];
}
