import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FEEDSPORT_RESEARCH_PIGLET_VTM as premix, FEEDSPORT_GROWER_PRO, FEEDSPORT_FINISHER_PRO, FEEDSPORT_RESEARCH_PREMIXES } from "./research-premixes";

describe("FeedSport WeanerPro research reference", () => {
  test("matches Yang et al. Table 2 VTM Premix 2", () => {
    assert.equal(premix.source.doi, "10.3390/ani9121154");
    assert.equal(premix.source.table, "Table 2 — VTM Premix 2");
    assert.equal(premix.inclusionPct, 1);
    assert.equal(premix.inclusionKgPerTonne, 10);
    assert.equal(premix.vitamins.vitaminEIuKg, 3_000);
    assert.equal(premix.cholineChlorideMgKg, 40_000);
    assert.deepEqual(premix.traceMineralsPpm, {
      copper: 500, iodine: 14, iron: 10_000,
      manganese: 300, selenium: 25, zinc: 8_000,
    });
  });

  test("is research-only and does not mislabel choline chloride as choline", () => {
    assert.equal(premix.category, "research_reference");
    assert.equal(premix.allowedForCommercialFormulation, false);
    assert.equal("totalCholineMgKg" in premix.vitamins, false);
    assert.equal(premix.valuesBasis, "formulated_study_target_not_supplier_guarantee");
  });
});

describe("Sampath 2023 grower and finisher research references", () => {
  test("models published dose changes across the three phases", () => {
    assert.deepEqual([
      FEEDSPORT_GROWER_PRO.inclusionKgPerTonne,
      ...FEEDSPORT_FINISHER_PRO.map((p) => p.inclusionKgPerTonne),
    ], [4, 3.5, 4]);
    assert.deepEqual([
      FEEDSPORT_GROWER_PRO.separateSupplement.kgPerTonne,
      ...FEEDSPORT_FINISHER_PRO.map((p) => p.separateSupplement.kgPerTonne),
    ], [0.9, 0.9, 1]);
  });

  test("reproduces study's finished-diet vitamin E target without conflating choline", () => {
    for (const record of [FEEDSPORT_GROWER_PRO, ...FEEDSPORT_FINISHER_PRO]) {
      assert.ok(Math.abs(record.vitamins.vitaminEIuKg * record.inclusionPct / 100 - 40) < 1e-8);
      assert.ok(Math.abs(record.vitamins.vitaminAIuKg * record.inclusionPct / 100 - 10800) < 1e-8);
      assert.ok(Math.abs(record.traceMineralsPpm.selenium * record.inclusionPct / 100 - 0.3) < 1e-8);
      assert.equal(record.separateSupplement.includedInPremix, false);
      assert.equal(record.allowedForCommercialFormulation, false);
      assert.equal("totalCholineMgKg" in record.vitamins, false);
      assert.equal("pantothenicAcidMgKg" in record.vitamins, false);
      assert.equal(record.source.doi, "10.3389/fvets.2023.1095877");
    }
    assert.equal(FEEDSPORT_RESEARCH_PREMIXES.length, 4);
  });
});
