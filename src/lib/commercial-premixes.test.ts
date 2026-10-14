import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FEED_PROGRAMMES } from "./feed-programmes";
import { INGREDIENT_LIBRARY_SOURCE } from "./ingredient-nutrients";
import {
  COMMERCIAL_PREMIXES,
  commercialPremixById,
  assertManufacturerRecipe,
  commercialPremixCompatibleWithProgramme,
  commercialPremixForProgramme,
  premixNutrientContributions,
} from "./commercial-premixes";

describe("Manufacturer-backed commercial premix catalogue", () => {
  test("all entries are identifiable and unverified, with no fabricated supplier quotes", () => {
    assert.equal(COMMERCIAL_PREMIXES.length, 9);
    assert.equal(new Set(COMMERCIAL_PREMIXES.map((product) => product.id)).size, COMMERCIAL_PREMIXES.length);
    for (const product of COMMERCIAL_PREMIXES) {
      assert.ok(["Trouw Nutrition", "Chengdu Sustar Feed", "CJ (Tianjin) Feed"].includes(product.manufacturer));
      assert.equal(product.verificationStatus, "unverified");
      assert.ok(["unconfirmed", "manufacturer_recipe_only"].includes(product.formulationCompatibility));
      assert.equal(product.pricePerTonne, null);
      assert.ok(product.specificationUrl.startsWith("https://"));
      assert.ok(product.inclusionPct > 0 && product.inclusionKgPerTonne > 0);
      assert.deepEqual(commercialPremixById(product.id), product);
    }
  });

  test("Caremix keeps its finished-feed specification beside a reverse-calculated premix profile", () => {
    assert.equal(commercialPremixById("aeci-v1736-pig-weaner-premix"), undefined);
    for (const [id, dose] of [["caremix-pig-weaner", 28], ["caremix-pig-grower", 32], ["caremix-pig-finisher", 26]] as const) {
      const product = commercialPremixById(id)!;
      assert.ok(product, id);
      assert.equal(product.manufacturer, "Trouw Nutrition");
      assert.equal(product.inclusionKgPerTonne, dose);
      assert.equal(product.inclusionPct, dose / 10);
      assert.equal(product.finishedFeedSpecification?.rows.length, 30);
      assert.match(product.finishedFeedSpecification?.concentrationBasis ?? "", /FINISHED FEED supplied by the premix/);
      assert.ok(product.finishedFeedSpecification?.referenceRation, "the manufacturer's worked ration is kept");
      // Its composition is an ordinary per-kg premix profile, credited like Sustar's.
      assert.ok(premixNutrientContributions(product).length > 20);
      assert.match(product.source?.basis ?? "", /per kg premix, calculated from manufacturer finished-feed/);
      for (const path of premixNutrientContributions(product).map((row) => row.path)) {
        if (path.startsWith("aminoAcids.sidPct.") && !product.composition.aminoAcids.sidPct[path.split(".")[2]]) continue;
        assert.ok(product.nutrientSources[path], `${id} ${path} cites its derivation`);
      }
      const calcium = product.finishedFeedSpecification?.rows.find((r) => r.nutrient === "Calcium");
      assert.ok(Number(calcium?.min) <= Number(calcium?.max));
      assert.equal(INGREDIENT_LIBRARY_SOURCE.ingredients.find((r) => r.id === id)?.category, "vitamin_mineral_premix");
    }
  });

  test("Caremix stage selection respects nursery, grower and finisher phases", () => {
    const grower = "br2024-5-43-63-91d-26-47kg";
    const finisher = "br2024-5-43-119-147d-74-103kg";
    const w = commercialPremixById("caremix-pig-weaner")!;
    const g = commercialPremixById("caremix-pig-grower")!;
    const f = commercialPremixById("caremix-pig-finisher")!;
    assert.equal(commercialPremixCompatibleWithProgramme(w, "nursery-pig"), true);
    assert.equal(commercialPremixCompatibleWithProgramme(w, "grow-finish-pig", grower), false);
    assert.equal(commercialPremixCompatibleWithProgramme(g, "grow-finish-pig", grower), true);
    assert.equal(commercialPremixCompatibleWithProgramme(g, "grow-finish-pig", finisher), false);
    assert.equal(commercialPremixCompatibleWithProgramme(f, "grow-finish-pig", finisher), true);
    assert.equal(commercialPremixCompatibleWithProgramme(f, "grow-finish-pig", grower), false);
    assert.equal(commercialPremixForProgramme("nursery-pig")?.id, w.id);
    assert.equal(commercialPremixForProgramme("grow-finish-pig", grower)?.id, g.id);
    assert.equal(commercialPremixForProgramme("grow-finish-pig", finisher)?.id, f.id);
    assert.equal(commercialPremixCompatibleWithProgramme(g, "broiler-standard", grower), false);
  });

  test("selects the stage-specific commercial product, never one universal premix", () => {
    const phases: Record<string, string> = {
      "nursery-pig": "Caremix PigWeaner",
      "grow-finish-pig": "Caremix Pig Grower",
      "gestating-gilt-sow": "GlyPro X913",
      "lactating-gilt-sow": "GlyPro X913",
      "growing-entire-immunocastrated-males-standard": "Caremix Pig Grower",
      "growing-entire-immunocastrated-males-high-performance-hot": "Caremix Pig Grower",
      "broiler-standard": "GlyPro X812",
      "layer-standard": "GlyPro X811",
    };
    for (const [programme, sku] of Object.entries(phases)) {
      const selected = commercialPremixForProgramme(programme);
      assert.equal(selected?.sku, sku);
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

  test("CJ total lysine and phosphorus count toward totals, never toward SID or digestible values", () => {
    const cj = commercialPremixById("cj-s174-boar-premix")!;
    const rows = premixNutrientContributions(cj);
    const lysine = rows.find((row) => row.path === "aminoAcids.totalPct.lysine")!;
    assert.equal(lysine.premixConcentration, 4);
    assert.ok(Math.abs(lysine.finishedFeedContribution - 0.16) < 1e-12);
    assert.equal(lysine.countsTowardDigestible, false);
    assert.match(lysine.basis, /TOTAL lysine/);
    assert.equal(rows.find((row) => row.path === "aminoAcids.sidPct.lysine"), undefined, "Total lysine is not SID lysine");
    assert.equal(rows.find((row) => row.path === "macroMinerals.totalPhosphorusPct")?.countsTowardDigestible, false);
    // The labelled 5% NaCl minimum is converted by molar mass, and says so.
    const sodium = rows.find((row) => row.path === "macroMinerals.sodiumPct")!;
    assert.ok(Math.abs(sodium.premixConcentration - 5 * 0.3934) < 1e-9);
    assert.match(sodium.basis, /molar mass/);
    const x912 = premixNutrientContributions(commercialPremixById("sustar-glypro-x912")!);
    assert.ok(x912.every((row) => row.group === "vitamin" || row.group === "trace_mineral"));
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
      assert.equal(product.composition.vitamins.vitaminEIuKg, undefined,
        "Supplier-published mass values cannot be treated as IU without the vitamin form.");
      assert.equal(product.composition.vitamins.totalCholineMgKg, undefined,
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
