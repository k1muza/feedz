import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FEED_PROGRAMMES } from "./feed-programmes";
import { INGREDIENT_LIBRARY, ingredientLibraryWithCommercialPremixes } from "./ingredient-nutrients";
import {
  COMMERCIAL_PREMIXES,
  commercialPremixById,
  assertManufacturerRecipe,
  commercialPremixCompatibleWithProgramme,
  commercialPremixForProgramme,
  premixFinishedFeedContributions,
  publishedPremixAminoAcids,
  publishedMinimumTotalAminoAcidsInFeed,
} from "./commercial-premixes";

describe("Manufacturer-backed commercial premix catalogue", () => {
  test("all entries are identifiable and unverified, with no fabricated supplier quotes", () => {
    assert.equal(COMMERCIAL_PREMIXES.length, 7);
    assert.equal(new Set(COMMERCIAL_PREMIXES.map((product) => product.id)).size, COMMERCIAL_PREMIXES.length);
    for (const product of COMMERCIAL_PREMIXES) {
      assert.ok(["AECI Animal Health", "Chengdu Sustar Feed", "CJ (Tianjin) Feed"].includes(product.manufacturer));
      assert.equal(product.verificationStatus, "unverified");
      assert.ok(["unconfirmed", "manufacturer_recipe_only"].includes(product.formulationCompatibility));
      assert.equal(product.pricePerTonne, null);
      assert.ok(product.specificationUrl.startsWith("https://"));
      assert.ok(product.inclusionPct > 0 && product.inclusionKgPerTonne > 0);
      assert.deepEqual(commercialPremixById(product.id), product);
    }
  });

  test("retains the AECI V1736 bag-label guarantees at the labelled 10 kg/t dose", () => {
    const product = commercialPremixById("aeci-v1736-pig-weaner-premix");
    assert.ok(product);
    assert.equal(product.manufacturer, "AECI Animal Health");
    assert.equal(product.sku, "V1736");
    assert.equal(product.inclusionPct, 1);
    assert.equal(product.inclusionKgPerTonne, 10);
    assert.equal(commercialPremixCompatibleWithProgramme(product, "nursery-pig"), true);
    assert.equal(commercialPremixCompatibleWithProgramme(product, "grow-finish-pig"), false);
    assert.deepEqual(product.guaranteedMinimumAsFed, {
      sourceUrl: "https://www.aeciworld.net/animal-health.html",
      vitamins: {
        vitaminAIuKg: 5_000_000,
        vitaminDIuKg: 2_000_000,
        vitaminEIuKg: 10_000,
        vitaminKMgKg: 300,
        vitaminB1MgKg: 1_500,
        riboflavinMgKg: 3_000,
        vitaminB6MgKg: 1_000,
        vitaminB12McgKg: 15_000,
        niacinMgKg: 15_000,
      },
      traceMineralsPpm: {
        zinc: 30_000,
        iron: 25_000,
        manganese: 15_000,
        copper: 1_000,
        iodine: 300,
      },
    });
    const contributions = premixFinishedFeedContributions(product);
    assert.equal(contributions.find((item) => item.nutrient === "Vitamin A")?.finishedFeedContribution, 50_000);
    assert.equal(contributions.find((item) => item.nutrient === "Zinc")?.finishedFeedContribution, 300);
    assert.equal(contributions.find((item) => item.nutrient === "Selenium")?.finishedFeedContribution, 0.502);
  });

  test("selects the stage-specific commercial product, never one universal premix", () => {
    const phases: Record<string, string> = {
      "nursery-pig": "X911",
      "grow-finish-pig": "X912",
      "gestating-gilt-sow": "X913",
      "lactating-gilt-sow": "X913",
      "growing-entire-immunocastrated-males-standard": "X912",
      "growing-entire-immunocastrated-males-high-performance-hot": "X912",
      "broiler-standard": "X812",
      "layer-standard": "X811",
    };
    for (const [programme, sku] of Object.entries(phases)) {
      const selected = commercialPremixForProgramme(programme);
      assert.equal(selected?.sku, `GlyPro ${sku}`);
      assert.ok(selected && commercialPremixCompatibleWithProgramme(selected, programme));
    }
    assert.equal(commercialPremixForProgramme("cattle-growth"), undefined);
  });

  test("covers all loaded programme families with source-linked products", () => {
    const unassigned = FEED_PROGRAMMES.filter((p) => p.status === "loaded")
      .filter((p) => !commercialPremixForProgramme(p.id))
      .map((p) => p.id);
    assert.deepEqual(unassigned, []);
  });

  test("assigns CJ S174 to mature boars instead of sow-only X913", () => {
    assert.equal(commercialPremixForProgramme("mature-boar")?.id, "cj-s174-boar-premix");
    assert.equal(commercialPremixForProgramme("mature-boar:pic-mature-boar")?.id, "cj-s174-boar-premix");
    const sow = commercialPremixById("sustar-glypro-x913");
    assert.ok(sow);
    assert.equal(commercialPremixCompatibleWithProgramme(sow, "mature-boar"), false);
    assert.equal(commercialPremixForProgramme("gestating-gilt-sow")?.id, sow.id);
  });

  test("CJ S174 only accepts its documented five-part manufacturer ration", () => {
    const cj = commercialPremixById("cj-s174-boar-premix");
    assert.ok(cj);
    assert.equal(cj.formulationCompatibility, "manufacturer_recipe_only");
    const published = cj.manufacturerRecipe;
    assert.ok(published);
    assert.deepEqual(published.map((p) => [p.ingredientId, p.percent]), [
      ["corn-yellow-dent", 64.3],
      ["wheat-bran", 12],
      ["soybean-meal-solvent-extracted", 15.7],
      ["fish-meal-54", 4],
      ["cj-s174-boar-premix", 4],
    ]);
    const locked = published.map((p) => ({
      ingredientId: p.ingredientId, minInclusionPct: p.percent, maxInclusionPct: p.percent,
    }));
    assert.doesNotThrow(() => assertManufacturerRecipe(cj, locked));
    assert.throws(() => assertManufacturerRecipe(cj, locked.slice(0, 4)), /restricted/);
    assert.throws(() => assertManufacturerRecipe(cj, locked.map((row) =>
      row.ingredientId === "corn-yellow-dent" ? { ...row, maxInclusionPct: 70 } : row
    )), /restricted/);
    assert.throws(() => assertManufacturerRecipe(cj, [...locked, {
      ingredientId: "sorghum-grain", minInclusionPct: 0, maxInclusionPct: 0,
    }]), /restricted/);
  });

  test("distinguishes CJ total lysine guarantee from digestible SID lysine and unknown Sustar values", () => {
    const cj = commercialPremixById("cj-s174-boar-premix")!;
    assert.deepEqual(publishedPremixAminoAcids(cj), [{
      name: "Lysine",
      basis: "total",
      unit: "%",
      minimumPct: 4,
      maximumPct: null,
      usableAsSid: false,
    }]);
    assert.deepEqual(publishedMinimumTotalAminoAcidsInFeed(cj), [
      { name: "Lysine", minTotalFeedPct: 0.16, usableAsSid: false },
    ]);
    assert.deepEqual(publishedMinimumTotalAminoAcidsInFeed(commercialPremixById("sustar-glypro-x912")!), []);
    assert.deepEqual(publishedPremixAminoAcids(commercialPremixById("sustar-glypro-x912")!), []);
    assert.deepEqual(publishedPremixAminoAcids(commercialPremixById("sustar-glypro-x911")!), []);
  });

  test("verified exact amino acids can be credited, but unspecified amino acids remain unknown", () => {
    const source = commercialPremixById("sustar-glypro-x912")!;
    const synthetic = {
      ...source,
      id: "test-confirmed-aa-premix",
      verifiedAsFedAminoAcids: {
        reference: "test fixture only — not an actual supplier analysis",
        sourceUrl: "https://example.com/fictional-test-only",
        totalPct: { lysine: 5 },
        sidPct: { lysine: 4.2 },
      },
    };
    const library = ingredientLibraryWithCommercialPremixes([synthetic], INGREDIENT_LIBRARY);
    const item = library.ingredients.find((record) => record.id === synthetic.id)!;
    assert.equal(item.aminoAcids.totalPct.lysine, 5);
    assert.equal(item.aminoAcids.sidPct.lysine, 4.2);
    assert.equal(
      item.provenance.nutrientSources["aminoAcids.sidPct.lysine"]?.url,
      "https://example.com/fictional-test-only",
      "Exact SID values must retain their supplier citation",
    );
    assert.equal(item.provenance.verificationStatus, "manufacturer_unverified",
      "One verified AA value does not certify the entire premix matrix");
    const actual = ingredientLibraryWithCommercialPremixes([source], INGREDIENT_LIBRARY);
    const actualItem = actual.ingredients.find((record) => record.id === source.id)!;
    assert.equal(actualItem.aminoAcids.sidPct.lysine, undefined, "Do not fabricate Sustar SID lysine.");
  });

  test("retains Sustar vitamin E mass guarantees without inventing IU or choline", () => {
    const published: Record<string, [number, number]> = {
      "sustar-glypro-x911": [180, 230],
      "sustar-glypro-x912": [60, 80],
      "sustar-glypro-x913": [230, 270],
      "sustar-glypro-x812": [80, 120],
      "sustar-glypro-x811": [100, 120],
    };
    for (const [id, [min, max]] of Object.entries(published)) {
      const product = commercialPremixById(id)!;
      assert.deepEqual(product.publishedGuarantees?.find((entry) => entry.nutrient === "Vitamin E"), {
        nutrient: "Vitamin E", unit: "g/kg", min, max,
      });
      assert.equal(product.guaranteedMinimumAsFed?.vitamins.vitaminEIuKg, undefined,
        "Supplier-published mass values cannot be treated as IU without the vitamin form.");
      assert.equal(product.guaranteedMinimumAsFed?.vitamins.totalCholineMgKg, undefined,
        "Undeclared choline must remain unknown.");
    }
  });

  test("does not substitute a broiler product for layers or pigs", () => {
    const broiler = commercialPremixById("sustar-glypro-x812");
    assert.ok(broiler);
    assert.equal(commercialPremixCompatibleWithProgramme(broiler, "layer-standard"), false);
    assert.equal(commercialPremixCompatibleWithProgramme(broiler, "grow-finish-pig"), false);
  });
});
