import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FEEDSPORT_RESEARCH_PIGLET_VTM as premix, FEEDSPORT_GROWER_PRO, FEEDSPORT_FINISHER_PRO, FEEDSPORT_RESEARCH_PREMIXES, eligibleResearchPremixes, researchPremixCompatibleWithPhase } from "./research-premixes";

describe("FeedSport WeanerPro — AECI label transcription pending verification", () => {
  test("retains the on-pack dose and text without inventing nutrient units", () => {
    assert.equal(premix.name, "FeedSport WeanerPro");
    assert.equal(premix.source.table, "PIG WEANER label; registration V1736, Act 36/1947");
    assert.equal(premix.inclusionPct, 1);
    assert.equal(premix.inclusionKgPerTonne, 10);
    assert.equal(premix.photographedLabel.leftColumnBasis, "unknown");
    assert.equal(premix.photographedLabel.rightColumnBasis, "unknown");
    assert.deepEqual(premix.photographedLabel.declaredRows.find((row) => row.name === "Vitamin A"),
      { name: "Vitamin A", firstColumn: "5.000.000" });
    assert.deepEqual(premix.photographedLabel.declaredRows.find((row) => row.name === "Vitamin E (DL)"),
      { name: "Vitamin E (DL)", firstColumn: "10.000" });
    assert.deepEqual(premix.photographedLabel.declaredRows.find((row) => row.name === "Vitamin B4 (Choline)"),
      { name: "Vitamin B4 (Choline)", firstColumn: "0.0000" });
  });

  test("does not credit ambiguous printed quantities or offer the premix in Studio", () => {
    assert.equal(premix.category, "research_reference");
    assert.equal(premix.allowedForCommercialFormulation, false);
    assert.deepEqual(premix.vitamins, {});
    assert.deepEqual(premix.traceMineralsPpm, {});
    assert.equal(premix.valuesBasis, "printed_label_columns_units_and_basis_unconfirmed");
    assert.equal("totalCholineMgKg" in premix.vitamins, false);
    assert.equal(researchPremixCompatibleWithPhase(premix, "nursery-pig", "br2024-5-41-5-7kg"), false);
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

  test("offers each research profile only in its corresponding Studio phase", () => {
    assert.deepEqual(
      eligibleResearchPremixes("grow-finish-pig", "br2024-5-43-63-91d-26-47kg").map((p) => p.id),
      [FEEDSPORT_GROWER_PRO.id],
    );
    assert.deepEqual(
      eligibleResearchPremixes("grow-finish-pig", "br2024-5-43-91-119d-47-74kg").map((p) => p.id),
      [FEEDSPORT_FINISHER_PRO[0].id],
    );
    assert.deepEqual(
      eligibleResearchPremixes("grow-finish-pig", "br2024-5-43-119-147d-74-103kg").map((p) => p.id),
      [FEEDSPORT_FINISHER_PRO[1].id],
    );
    assert.equal(
      researchPremixCompatibleWithPhase(FEEDSPORT_GROWER_PRO, "broiler-standard", "br2024-2-30-22-33d"),
      false,
    );
  });
});
