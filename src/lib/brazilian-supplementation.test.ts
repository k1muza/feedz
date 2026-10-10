import assert from "node:assert/strict";
import test from "node:test";

import { BRAZILIAN_2024_BROILER_SUPPLEMENTATION } from "./brazilian-nutrition";
import { feedProgrammeById } from "./feed-programmes";

const broilers = BRAZILIAN_2024_BROILER_SUPPLEMENTATION.broilers;

test("broiler supplementation is cited to Tables 7.01 and 7.03", () => {
  assert.equal(broilers.vitaminSourceTable, "7.01");
  assert.equal(broilers.traceMineralSourceTable, "7.03");
  assert.deepEqual(broilers.phases.map((phase) => [phase.ageDays.min, phase.ageDays.max]), [
    [0, 8], [8, 17], [17, 27], [27, 35], [35, 43], [43, 49],
  ]);
  // Spot values read from printed pages 469 and 471.
  const growerI = broilers.phases[2];
  assert.equal(growerI.ratio, 1);
  assert.equal(growerI.vitamins.vitaminAIuKg, 10824);
  assert.equal(growerI.vitamins.vitaminB12McgKg, 17.1);
  assert.equal(growerI.inorganic.zincPpm, 62.32);
  assert.equal(growerI.inorganic.iodinePpm, 0.965);
  assert.equal(growerI.organic.iodinePpm, undefined);
});

test("broiler per-kg-feed levels agree with the published per-kg-gain basis", () => {
  // The book derives each feed level as (per kg gain) × gain ÷ intake; a
  // transcription error breaks this identity beyond rounding.
  for (const phase of broilers.phases) {
    const scale = phase.weightGainGDay / phase.feedIntakeGDay;
    const groups = [
      [phase.vitamins, broilers.perKgGain.vitamins],
      [phase.inorganic, broilers.perKgGain.inorganic],
      [phase.organic, broilers.perKgGain.organic],
    ] as const;
    for (const [feed, gain] of groups) {
      for (const [key, perGain] of Object.entries(gain)) {
        const actual = (feed as Record<string, number | undefined>)[key];
        assert.ok(actual !== undefined, `${key} missing for ${phase.ageDays.min}-${phase.ageDays.max} d`);
        const expected = (perGain as number) * scale;
        assert.ok(Math.abs(actual - expected) / expected < 0.02, `${key} ${phase.ageDays.min}-${phase.ageDays.max} d: ${actual} vs ${expected}`);
      }
    }
  }
});

test("every broiler phase carries supplementation targets", () => {
  for (const id of ["broiler-standard", "broiler-high-performance", "broiler-high-performance-hot"]) {
    const programme = feedProgrammeById(id);
    assert.ok(programme, id);
    for (const phase of programme.phases) {
      assert.ok(phase.supplementation, `${id} ${phase.label}`);
      assert.deepEqual(phase.supplementation.sourcePages, [469, 471]);
    }
  }
});

test("swine supplementation starts at weaning, as published in Table 7.05", () => {
  const nursery = feedProgrammeById("nursery-pig");
  assert.ok(nursery);
  assert.equal(nursery.phases[0].ageMinDays, 14);
  assert.equal(nursery.phases[0].supplementation, undefined);
  assert.ok(nursery.phases.slice(1).every((phase) => phase.supplementation));
});
