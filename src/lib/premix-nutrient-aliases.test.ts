import assert from "node:assert/strict";
import { test } from "node:test";

import { premixNutrientKeyForAssessment, resolvePremixNutrientAlias } from "./premix-nutrient-aliases";
import { commercialPremixById, unverifiedPremixLabelName } from "./commercial-premixes";

test("supplier names map to the canonical vitamin/choline nutrient fields", () => {
  const cases = [
    ["Vit B9", "folicAcidMgKg"],
    ["Vitamin B9", "folicAcidMgKg"],
    ["Folate", "folicAcidMgKg"],
    ["Vit H(D BIOTIN)", "biotinMgKg"],
    ["D-biotin", "biotinMgKg"],
    ["Vitamin B7", "biotinMgKg"],
    ["Vit B4(CHLORIDE)", "totalCholineMgKg"],
    ["Choline chloride", "totalCholineMgKg"],
    ["Vitamin B4", "totalCholineMgKg"],
    ["Vitamin B5", "pantothenicAcidMgKg"],
    ["D-calcium pantothenate", "pantothenicAcidMgKg"],
  ] as const;

  for (const [sourceName, expected] of cases) {
    assert.equal(resolvePremixNutrientAlias(sourceName), expected, sourceName);
  }
  assert.equal(resolvePremixNutrientAlias("Selenium"), null);
  assert.equal(premixNutrientKeyForAssessment("supplement-biotin"), "biotinMgKg");
  assert.equal(premixNutrientKeyForAssessment("supplement-folic-acid"), "folicAcidMgKg");
  assert.equal(premixNutrientKeyForAssessment("supplement-choline"), "totalCholineMgKg");
  assert.equal(premixNutrientKeyForAssessment("supplement-pantothenic-acid"), "pantothenicAcidMgKg");
});

test("AECI V1736 keeps label declarations distinct from analytical nutrient guarantees", () => {
  const premix = commercialPremixById("aeci-v1736-pig-weaner-premix");
  assert.ok(premix);
  assert.equal(unverifiedPremixLabelName(premix, "supplement-folic-acid"), "Vit B9");
  assert.equal(unverifiedPremixLabelName(premix, "supplement-biotin"), "Vit H(D BIOTIN)");
  assert.equal(unverifiedPremixLabelName(premix, "supplement-choline"), "Vit B4(CHLORIDE)");
  assert.equal(unverifiedPremixLabelName(premix, "supplement-pantothenic-acid"), null);
  assert.equal(unverifiedPremixLabelName(premix, "supplement-selenium"), null);

  const declared = premix.guaranteedMinimumAsFed?.vitamins ?? {};
  assert.equal(declared.folicAcidMgKg, undefined);
  assert.equal(declared.biotinMgKg, undefined);
  assert.equal(declared.totalCholineMgKg, undefined);
  assert.equal(declared.pantothenicAcidMgKg, undefined);
  assert.equal(premix.guaranteedMinimumAsFed?.traceMineralsPpm.selenium, undefined);
});
