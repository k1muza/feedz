import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { commercialPremixById } from "@/lib/commercial-premixes";
import { ingredientDefaultPricePerKg } from "@/lib/feed-ingredient-prices";
import { feedProgrammePhaseById } from "@/lib/feed-programmes";
import { formulateAndAssess } from "@/lib/formulation-assessment";
import { ingredientLibraryForPhase } from "@/lib/ingredient-nutrients";

import { upperLimitAdvisoryVals } from "./upper-limit-advisory";
import { UpperLimitAdvisories, UpperLimitTable } from "./upper-limit-cards";

const RED = "#a63d2a";
const ALARMING = /critical|danger|toxic|unsafe/i;
const BASAL = [
  "corn-yellow-dent", "soybean-meal-dehulled-solvent-extracted", "wheat-bran", "soybean-degummed-oil", "limestone-ground",
  "dicalcium-phosphate", "sodium-chloride", "l-lysine-hcl", "dl-methionine", "l-threonine", "l-tryptophan", "l-valine",
];

async function growerWithX912() {
  const phase = feedProgrammePhaseById("grow-finish-pig", "br2024-5-43-63-91d-26-47kg")!;
  const premix = commercialPremixById("sustar-glypro-x912")!;
  return formulateAndAssess({
    phase,
    energySystem: "ME",
    programmeId: "grow-finish-pig",
    options: [
      ...BASAL.map((ingredientId) => ({ ingredientId, pricePerKg: ingredientDefaultPricePerKg(ingredientId) ?? 0 })),
      { ingredientId: premix.id, pricePerKg: ingredientDefaultPricePerKg(premix.id) ?? 0, minInclusionPct: premix.inclusionPct, maxInclusionPct: premix.inclusionPct },
    ],
    library: ingredientLibraryForPhase(phase),
    priceForPremix: (id) => ingredientDefaultPricePerKg(id),
  });
}

/** The opening tag of the element whose text is exactly `text`. */
const tagAround = (markup: string, text: string) => {
  const end = markup.indexOf(`>${text}<`);
  assert.ok(end >= 0, `"${text}" is rendered`);
  return markup.slice(markup.lastIndexOf("<", end), end + 1);
};

describe("CFIA upper limits in Studio", async () => {
  const { assessment, premixComparison } = await growerWithX912();
  const replaced: string[] = [];
  let compared = 0;
  const vals = upperLimitAdvisoryVals({
    assessment: assessment!,
    comparison: premixComparison,
    manual: false,
    premixSpecificationUrl: "https://example.com/x912",
    name: (id) => commercialPremixById(id)?.sku ?? id,
    money: (value) => "$" + value.toFixed(2),
    leastCostBasis: "",
    replacePremix: (id) => replaced.push(id),
    openCompare: () => compared++,
  });
  const card = vals.card!;
  const advisories = renderToStaticMarkup(createElement(UpperLimitAdvisories, { upper: card }));
  const table = renderToStaticMarkup(createElement(UpperLimitTable, { upper: card }));

  it("5. vitamin A and D exceedances are red inside Advisories, with the value, maximum, source, class and suggestion", () => {
    for (const title of ["Vitamin A exceeds the reference maximum", "Vitamin D exceeds the reference maximum"]) {
      assert.match(tagAround(advisories, title), new RegExp(`color:${RED}`), `${title} is red`);
    }
    assert.ok(advisories.includes("The current formulation provides 56,000 IU/kg against the CFIA reference maximum of 20,000 IU/kg."));
    assert.ok(advisories.includes("Grower (25 to 50 kg)"), "names the CFIA class");
    assert.ok(advisories.includes("Canadian Food Inspection Agency"), "names the source");
    assert.ok(advisories.includes("From GlyPro X912 56,000 IU/kg."), "names the contributing ingredient");
    assert.ok(advisories.includes("Suggested action:"));
    assert.match(advisories, /Consider replacing Sustar GlyPro X912 .* with Caremix Pig Grower .*, which reduces the calculated vitamin A to 10,000 IU\/kg/);
    assert.ok(advisories.includes("Resolved in the re-run"));
    assert.ok(advisories.includes("Review alternative") && advisories.includes("Replace premix"), "the farmer can review, then deliberately apply");
    // Existing advisory card: white card, 10px radius, a red border tint, never a red fill.
    assert.match(advisories, /<section aria-label="Vitamin above a CFIA reference maximum" style="background:#fff;border:1px solid #e2dfd6;border-radius:10px;border-color:#e7b3a6/);
  });

  it("5. in the reference table, red marks only an established exceedance; missing data uses the Missing tag; within is neutral", () => {
    const rows = [...table.matchAll(/<div data-status="(\w+)"[^>]*>(.*?)<\/div>/g)].map(([, status, body]) => ({ status, body }));
    assert.ok(rows.some((row) => row.status === "exceeds"));
    for (const row of rows) {
      if (row.status === "exceeds") assert.ok(row.body.includes(RED), "exceeds is red");
      else assert.ok(!row.body.includes(RED), `${row.status} is never red`);
      if (row.status === "not_documented") assert.ok(row.body.includes(">Missing<"), "missing data uses the informational tag");
    }
    // Vitamin E is undocumented by X912: unknown, not within and not red.
    assert.ok(card.rows.some((row) => row.key === "vitamin-e" && row.status === "not_documented" && row.text.includes("Not on the data sheet")));
  });

  it("6. the main results page stays calm: one count on the usual indicator, unchanged headline, no banner", () => {
    assert.equal(vals.advisoryCount, 1, "both vitamins share one advisory");
    assert.equal(assessment!.verdict, "meets_requirements");
    assert.match(assessment!.headline, /^Meets all \d+ hard requirements$/);
    // The CFIA cards render only inside the Advisories tab.
    const views = readFileSync(path.join(process.cwd(), "src/components/formulation-studio/views.tsx"), "utf8");
    const body = (name: string) => {
      const start = views.indexOf(`function ${name}(`);
      return views.slice(start, views.indexOf("\nfunction ", start + 1));
    };
    for (const name of ["UpperLimitAdvisories", "UpperLimitTable"]) {
      const uses = [...views.matchAll(new RegExp(`<${name}\\b`, "g"))].map((match) => match.index!);
      assert.equal(uses.length, 1, `${name} is rendered once`);
      const start = views.indexOf("function AdvisoriesTab(");
      const end = views.indexOf("\nfunction ", start + 1);
      assert.ok(uses[0] > start && uses[0] < end, `${name} is rendered inside AdvisoriesTab`);
    }
    for (const name of ["ResultHeadline", "Optimal", "RecipeTable", "PremixCard"]) assert.ok(!/upperLimit|vitaminAdvice/.test(body(name)), `${name} shows no CFIA content`);
    for (const markup of [advisories, table]) {
      assert.ok(!ALARMING.test(markup), "no alarming labels");
      // Red fills are only the small status squares.
      for (const match of markup.matchAll(/style="([^"]*background:#b2412e[^"]*)"/g)) assert.match(match[1], /width:[6-8]px/);
    }
  });

  it("11. nothing is replaced until the farmer chooses Replace premix", () => {
    assert.deepEqual(replaced, [], "building and rendering the advisory replaces nothing");
    card.vitamins!.action!.compare!();
    assert.equal(compared, 1);
    assert.deepEqual(replaced, []);
    card.vitamins!.action!.replace!();
    assert.deepEqual(replaced, ["caremix-pig-grower"]);
  });

  it("a manual recipe shows the exceedance and points back to the optimised comparison", () => {
    const manual = upperLimitAdvisoryVals({
      assessment: assessment!, comparison: null, manual: true, premixSpecificationUrl: "", name: (id) => id, money: String, leastCostBasis: "", replacePremix: () => assert.fail("never replaces"), openCompare: () => {},
    });
    assert.equal(manual.card!.vitamins!.items.length, 2);
    assert.equal(manual.card!.vitamins!.action!.replace, null);
    assert.match(manual.card!.vitamins!.action!.text, /compare compatible premixes/);
  });
});
