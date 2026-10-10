import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FEEDSPORT_RESEARCH_PIGLET_VTM as premix } from "./research-premixes";

describe("FeedSport research piglet VTM reference", () => {
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
