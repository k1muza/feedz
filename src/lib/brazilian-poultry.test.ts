import assert from "node:assert/strict";
import test from "node:test";

import { INGREDIENT_LIBRARY } from "./ingredient-nutrients";

import {
  BRAZILIAN_2024_BROILER_HIGH_PERFORMANCE,
  BRAZILIAN_2024_BROILER_PROGRAMMES,
  BRAZILIAN_2024_POULTRY_INGREDIENT_LIBRARY,
  broilerInclusionLimitClassForPhase,
  findBroilerPhaseByAge,
  poultryFormulationEnergy,
} from "./brazilian-poultry";

test("Brazilian 2024 poultry data loads and is tied to canonical ingredients", () => {
  assert.equal(BRAZILIAN_2024_BROILER_PROGRAMMES.length, 3);

  assert.equal(BRAZILIAN_2024_POULTRY_INGREDIENT_LIBRARY.ingredients.length, 17);
  for (const ingredient of BRAZILIAN_2024_POULTRY_INGREDIENT_LIBRARY.ingredients) {
    assert.equal(ingredient.species, "poultry");
    assert.ok(ingredient.nutrition.poultry, `Missing poultry profile: ${ingredient.id}`);
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

test("broiler age lookup treats published ranges as half-open", () => {
  assert.equal(
    findBroilerPhaseByAge(BRAZILIAN_2024_BROILER_HIGH_PERFORMANCE, 7.999)?.phase,
    "pre-starter",
  );
  assert.equal(
    findBroilerPhaseByAge(BRAZILIAN_2024_BROILER_HIGH_PERFORMANCE, 8)?.phase,
    "starter",
  );
  assert.equal(
    findBroilerPhaseByAge(BRAZILIAN_2024_BROILER_HIGH_PERFORMANCE, 17)?.id,
    "brazilian-2024-broilers-high-performance-as-hatched:17-27d-0.68-1.49kg",
  );
  assert.equal(
    findBroilerPhaseByAge(BRAZILIAN_2024_BROILER_HIGH_PERFORMANCE, 49)?.phase,
    "finisher",
  );
  assert.equal(
    findBroilerPhaseByAge(BRAZILIAN_2024_BROILER_HIGH_PERFORMANCE, 49.001),
    undefined,
  );
});

test("formulation energy requires published metabolizable energy", () => {
  const cornOil = BRAZILIAN_2024_POULTRY_INGREDIENT_LIBRARY.ingredients.find(
    (ingredient) => ingredient.id === "corn-oil",
  );
  const soybeanOil = BRAZILIAN_2024_POULTRY_INGREDIENT_LIBRARY.ingredients.find(
    (ingredient) => ingredient.id === "soybean-degummed-oil",
  );

  assert.ok(cornOil);
  assert.ok(soybeanOil);

  assert.equal(poultryFormulationEnergy(cornOil), null);
  assert.deepEqual(poultryFormulationEnergy(soybeanOil), {
    kcalKg: 8790,
    basis: "metabolizable",
  });

  const swineCorn = INGREDIENT_LIBRARY.ingredients.find(
    (ingredient) => ingredient.id === "corn-yellow-dent",
  );
  assert.ok(swineCorn);
  assert.throws(
    () => poultryFormulationEnergy(swineCorn),
    /requires a poultry ingredient record/,
  );
});
