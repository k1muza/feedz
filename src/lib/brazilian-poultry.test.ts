import assert from "node:assert/strict";
import test from "node:test";

import { BRAZILIAN_2024_CORE_FEEDSTUFFS } from "./brazilian-nutrition";
import {
  BRAZILIAN_2024_BROILER_PROGRAMMES,
  BRAZILIAN_2024_POULTRY_CORE_FEEDSTUFFS,
} from "./brazilian-poultry";

test("Brazilian 2024 poultry data loads and is tied to canonical ingredients", () => {
  assert.equal(BRAZILIAN_2024_BROILER_PROGRAMMES.length, 3);

  const canonicalIds = new Set(
    BRAZILIAN_2024_CORE_FEEDSTUFFS.ingredients.map((ingredient) => ingredient.id),
  );

  assert.equal(BRAZILIAN_2024_POULTRY_CORE_FEEDSTUFFS.ingredients.length, 17);
  for (const ingredient of BRAZILIAN_2024_POULTRY_CORE_FEEDSTUFFS.ingredients) {
    assert.ok(canonicalIds.has(ingredient.id), `Missing canonical ingredient: ${ingredient.id}`);
  }
});
