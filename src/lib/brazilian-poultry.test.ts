import assert from "node:assert/strict";
import test from "node:test";

import { BRAZILIAN_2024_CORE_FEEDSTUFFS } from "./brazilian-feedstuffs";
import {
  BRAZILIAN_2024_BROILER_PROGRAMMES,
  BRAZILIAN_2024_POULTRY_CORE_FEEDSTUFFS,
  broilerInclusionLimitClassForPhase,
  poultryFormulationEnergy,
} from "./brazilian-poultry";

test("Brazilian 2024 poultry data loads and is tied to canonical ingredients", () => {
  assert.equal(BRAZILIAN_2024_BROILER_PROGRAMMES.length, 3);

  const canonicalIds = new Set(
    BRAZILIAN_2024_CORE_FEEDSTUFFS.ingredients.map((ingredient) => ingredient.id),
  );

  assert.equal(BRAZILIAN_2024_POULTRY_CORE_FEEDSTUFFS.ingredients.length, 17);
  for (const ingredient of BRAZILIAN_2024_POULTRY_CORE_FEEDSTUFFS.ingredients) {
    assert.ok(canonicalIds.has(ingredient.id), `Missing canonical ingredient: ${ingredient.id}`);

    const energy = poultryFormulationEnergy(ingredient);
    assert.ok(energy.kcalKg > 0);
  }
});

test("broiler phase IDs are globally unique and programme-qualified", () => {
  const phaseIds = BRAZILIAN_2024_BROILER_PROGRAMMES.flatMap((programme) =>
    programme.phases.map((phase) => phase.id),
  );

  assert.equal(new Set(phaseIds).size, phaseIds.length);

  for (const programme of BRAZILIAN_2024_BROILER_PROGRAMMES) {
    for (const phase of programme.phases) {
      assert.ok(phase.id.startsWith(`${programme.id}:`));
    }
  }
});

test("broiler inclusion limits cover every formulation phase", () => {
  assert.equal(broilerInclusionLimitClassForPhase("pre-starter"), "starter");
  assert.equal(broilerInclusionLimitClassForPhase("starter"), "starter");
  assert.equal(broilerInclusionLimitClassForPhase("grower"), "grower");
  assert.equal(broilerInclusionLimitClassForPhase("finisher"), "grower");
});
