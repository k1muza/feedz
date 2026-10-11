import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FEED_PROGRAMMES } from "./feed-programmes";
import { INGREDIENT_LIBRARY, INGREDIENT_LIBRARY_SOURCE, ingredientLibraryWithCommercialPremixes } from "./ingredient-nutrients";
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

  test("AECI minimum and maximum label figures are confirmed directly in the ingredient JSON", () => {
    const product = commercialPremixById("aeci-v1736-pig-weaner-premix");
    assert.ok(product);
    assert.equal(product.manufacturer, "AECI Animal Health");
    assert.equal(product.sku, "V1736");
    assert.equal(product.inclusionPct, 1);
    assert.equal(product.inclusionKgPerTonne, 10);
    assert.equal(commercialPremixCompatibleWithProgramme(product, "nursery-pig"), true);
    assert.equal(commercialPremixCompatibleWithProgramme(product, "grow-finish-pig"), false);

    const libraryRow = INGREDIENT_LIBRARY_SOURCE.ingredients.find(row => row.id === product.id);
    assert.ok(libraryRow);
    assert.deepEqual(libraryRow.aliases, [], "No redundant AECI aliases");

    const label = product.labelGuarantees;
    assert.ok(label);
    assert.equal(label.confirmedByUser, true);
    assert.deepEqual(label.columns, { first: "minimum", second: "maximum" });
    assert.equal(label.rows.length, 24);
    const get = (name: string) => label.rows.find((row) => row.nutrient === name);
    const names = label.rows.map(row => row.nutrient);
    assert.equal(new Set(names).size, 24);

    assert.deepEqual(get("Vitamin E"), {
      category: "Vitamin", nutrient: "Vitamin E",
      source_form: "DL (as labelled; exact chemical form unconfirmed)",
      min: "10000", max: "30.00", unit: "MIU", note: "",
    });
    assert.equal(get("Vitamin K3")?.min, "0.3000");
    assert.equal(get("Vitamin K3")?.max, "2.5000");
    assert.equal(get("Zinc")?.min, "30.000");
    assert.equal(get("Zinc")?.max, "150.000");
    assert.equal(get("Riboflavin")?.max, "5000");
    assert.equal(get("Choline chloride")?.min, "0");
    assert.equal(get("Biotin")?.source_form, "D-biotin");
    assert.equal(get("Magnesium (second row; identity unverified)")?.note,
      "label error likely; 78% probably lysine source grade");
    assert.equal(get("Phytase")?.min, "10000");
    assert.equal(get("Vitamin C")?.note, "right value hard to read");
    assert.deepEqual(
      ["Vitamin", "Mineral", "Additive"].map(category => label.rows.filter(row => row.category === category).length),
      [13, 8, 3],
    );
    // User-confirmed label figures must not be promoted to a specific per-kg
    // premix concentration without a confirmed reference basis.
    assert.equal(product.guaranteedMinimumAsFed, undefined);
    assert.equal(product.verifiedAsFedMicronutrients, undefined);
    assert.deepEqual(premixFinishedFeedContributions(product), []);
  });

  test("AECI V1736 is selectable for grower simulation only, not finisher feeding approval", () => {
    const aeci = commercialPremixById("aeci-v1736-pig-weaner-premix")!;
    const growerPhase = "br2024-5-43-63-91d-26-47kg";
    const laterGrowerPhase = "br2024-5-43-91-119d-47-74kg";
    const finisherPhase = "br2024-5-43-119-147d-74-103kg";
    assert.equal(commercialPremixCompatibleWithProgramme(aeci, "nursery-pig"), true);
    assert.equal(commercialPremixCompatibleWithProgramme(aeci, "grow-finish-pig"), false,
      "A generic grow-finish programme must not imply manufacturer approval");
    assert.equal(commercialPremixCompatibleWithProgramme(aeci, "grow-finish-pig", growerPhase), true);
    assert.equal(commercialPremixCompatibleWithProgramme(aeci, "grow-finish-pig", laterGrowerPhase), true);
    assert.equal(commercialPremixCompatibleWithProgramme(aeci, "grow-finish-pig", finisherPhase), false);
    assert.equal(commercialPremixCompatibleWithProgramme(aeci, "broiler-standard", growerPhase), false);
    assert.equal(commercialPremixCompatibleWithProgramme(aeci, "gestating-gilt-sow", growerPhase), false);
    assert.equal(commercialPremixForProgramme("grow-finish-pig")?.id, "sustar-glypro-x912",
      "Exploratory products must never become a programme default");
    assert.equal(aeci.simulationOnlyPhases?.[0]?.phaseClass, "grower");
    assert.equal(aeci.verificationStatus, "unverified");
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
