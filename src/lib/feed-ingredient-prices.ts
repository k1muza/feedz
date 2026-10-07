import { PUBLIC_PREMIX_ID } from "@/lib/public-feed-premix";

export type IngredientPriceSourceScope =
  | "harare"
  | "zimbabwe"
  | "regional"
  | "global-fallback";

export type IngredientDefaultPrice = {
  ingredientId: string;
  usdPerTonne: number;
  market: string;
  asOf: string;
  sourceScope: IngredientPriceSourceScope;
  sourceLabel: string;
  sourceUrl?: string;
  /**
   * Extra planning multiplier for ingredients that have a market benchmark
   * but no known practical Zimbabwe/Southern-African supply route.
   * This is deliberately separate from the sourced market price.
   */
  availabilityMultiplier?: number;
  note?: string;
};

export const REGIONAL_IMPORT_PRICE_MULTIPLIER = 1.15;
export const GLOBAL_IMPORT_PRICE_MULTIPLIER = 1.3;

/**
 * Conservative planning penalty for bulk ingredients whose only price evidence
 * is a distant global benchmark and for which FeedSport has no known practical
 * Zimbabwe/Southern-African supply route. A real supplier quote should replace
 * this penalty via the normal price override path.
 */
export const SCARCE_GLOBAL_BULK_MULTIPLIER = 3;

export function ingredientImportPriceMultiplier(
  sourceScope: IngredientPriceSourceScope,
): number {
  if (sourceScope === "regional") return REGIONAL_IMPORT_PRICE_MULTIPLIER;
  if (sourceScope === "global-fallback") return GLOBAL_IMPORT_PRICE_MULTIPLIER;
  return 1;
}

/**
 * Planning defaults, not executable procurement quotes.
 *
 * Preference order:
 * 1. Harare market/supplier price
 * 2. Zimbabwe price
 * 3. Southern African regional price
 * 4. Global benchmark only when no usable local/regional public price is available
 */
export const INGREDIENT_DEFAULT_PRICES: readonly IngredientDefaultPrice[] = [
  {
    ingredientId: "corn-yellow-dent",
    usdPerTonne: 348.6,
    market: "Harare, Zimbabwe",
    asOf: "2026-09-29",
    sourceScope: "harare",
    sourceLabel: "Zimbabwe Mercantile Exchange — Harare maize market",
    sourceUrl: "https://system.zmx.co.zw/zmxwebpage/ATSCommo.aspx",
    note:
      "Harare maize matched trade / yellow-maize market reference. Use the supplier-delivered price when available.",
  },
  {
    ingredientId: "soybean-meal-dehulled-solvent-extracted",
    usdPerTonne: 680,
    market: "Harare, Zimbabwe",
    asOf: "2026-10-01",
    sourceScope: "harare",
    sourceLabel: "FeedSport International — Soya meal",
    sourceUrl: "https://www.feedsport.co.zw/products/5TjUodezA0zgEjAHmgo7",
    note:
      "Planning default updated to $680/t on 2026-10-01. The linked Harare supplier listing remains the market/specification reference for the dehulled/high-protein canonical ingredient.",
  },
  {
    ingredientId: "soybean-meal-solvent-extracted",
    usdPerTonne: 580,
    market: "Harare, Zimbabwe",
    asOf: "2026-10-01",
    sourceScope: "harare",
    sourceLabel: "Zimbabwe Mercantile Exchange — Harare soymeal",
    sourceUrl: "https://system.zmx.co.zw/zmxwebpage/ATSCommo.aspx",
    note:
      "Planning default updated to $580/t on 2026-10-01. The exchange listing remains the Harare market reference and does not distinguish every protein specification.",
  },
  {
    ingredientId: "sunflower-meal-solvent-extracted",
    usdPerTonne: 500,
    market: "Harare, Zimbabwe",
    asOf: "2026-09-30",
    sourceScope: "harare",
    sourceLabel: "FeedSport International — Sunflower meal",
    sourceUrl: "https://www.feedsport.co.zw/products/5QS6z9c8HTBK4h6QGPDU",
    note: "Harare supplier listing; MOQ 10 tonnes.",
  },
  {
    ingredientId: "wheat-bran",
    usdPerTonne: 200,
    market: "Harare, Zimbabwe",
    asOf: "2026-09-30",
    sourceScope: "harare",
    sourceLabel: "FeedSport International — Wheat bran",
    sourceUrl: "https://www.feedsport.co.zw/products/1V2M1I3RGpDaBCuwGyAT",
    note: "Harare supplier listing; MOQ 1 tonne.",
  },
  {
    ingredientId: "limestone-ground",
    usdPerTonne: 135,
    market: "Harare, Zimbabwe",
    asOf: "2026-09-30",
    sourceScope: "harare",
    sourceLabel: "Beechnut — Stock Feed Limestone Flour",
    sourceUrl: "https://beechnut.co.zw/product/stock-feed-limestone-flour/",
    note: "Listed Harare price for one tonne of stock-feed limestone flour.",
  },
  {
    ingredientId: "calcium-carbonate",
    usdPerTonne: 135,
    market: "Harare, Zimbabwe",
    asOf: "2026-09-30",
    sourceScope: "harare",
    sourceLabel: "Beechnut — Stock Feed Limestone Flour",
    sourceUrl: "https://beechnut.co.zw/product/stock-feed-limestone-flour/",
    note:
      "Planning proxy using feed-grade limestone flour, whose principal mineral is calcium carbonate. Replace with the exact supplier grade when quoted.",
  },
  {
    ingredientId: "wheat-hard-red-winter",
    usdPerTonne: 477.9,
    market: "Harare, Zimbabwe",
    asOf: "2026-09-25",
    sourceScope: "harare",
    sourceLabel: "Zimbabwe Mercantile Exchange — Harare wheat",
    sourceUrl: "https://system.zmx.co.zw/zmxwebpage/ATSCommo.aspx",
    note:
      "Harare wheat proxy; the ZMX grade is not specifically US hard-red-winter wheat.",
  },
  {
    ingredientId: "sorghum-grain",
    usdPerTonne: 318.7,
    market: "Harare, Zimbabwe",
    asOf: "2026-09-30",
    sourceScope: "harare",
    sourceLabel: "Zimbabwe Mercantile Exchange — Harare white sorghum",
    sourceUrl: "https://system.zmx.co.zw/zmxwebpage/ATSCommo.aspx",
    note: "Current Harare white-sorghum market reference used as the grain-sorghum proxy.",
  },
  {
    ingredientId: "dicalcium-phosphate",
    usdPerTonne: 536,
    market: "Durban, South Africa",
    asOf: "2026-09-30",
    sourceScope: "regional",
    sourceLabel: "Page Global Consultants — Feed-grade DCP FOB Durban",
    sourceUrl:
      "https://b2brazil.com/hotsite/pageglobal/feed-grade-dicalcium-phosphate-bulk-anim",
    note:
      "FOB Durban regional reference. Freight, border, duty and Harare delivery costs are not included.",
  },
  {
    ingredientId: "monocalcium-phosphate",
    usdPerTonne: 639,
    market: "Durban, South Africa",
    asOf: "2026-09-30",
    sourceScope: "regional",
    sourceLabel: "Page Global Consultants — Feed-grade MCP FOB Durban",
    sourceUrl:
      "https://b2brazil.com/hotsite/pageglobal/feed-grade-monocalcium-phosphate-feed-pr",
    note:
      "FOB Durban regional reference. Freight, border, duty and Harare delivery costs are not included.",
  },
  {
    ingredientId: "sodium-chloride",
    usdPerTonne: 134.98,
    market: "Gauteng, South Africa",
    asOf: "2026-09-29",
    sourceScope: "regional",
    sourceLabel: "MF Feeds — Feed-grade salt",
    sourceUrl: "https://www.mf-feeds.com/products/feed-grade-salt-50kg",
    note:
      "Derived from R110.63 per 50 kg at ZAR 16.3922/USD. Retail-equivalent regional proxy; excludes freight to Harare.",
  },
  {
    ingredientId: "dl-methionine",
    usdPerTonne: 2479,
    market: "South Africa",
    asOf: "2026-06-30",
    sourceScope: "regional",
    sourceLabel: "IMARC — DL-methionine South Africa Q2 2026",
    sourceUrl: "https://www.imarcgroup.com/dl-methionine-pricing-report",
    note: "South African Q2 2026 market benchmark; use the actual distributor quote for purchasing.",
  },
  {
    ingredientId: "l-lysine-hcl",
    usdPerTonne: 1909.51,
    market: "Southern Africa trade proxy",
    asOf: "2025-02-15",
    sourceScope: "regional",
    sourceLabel: "Volza — South Africa feed-premix lysine HCl export unit value",
    sourceUrl: "https://www.volza.com/p/lysine-hcl/hsn-code-2309/import-data/",
    note:
      "Older regional trade proxy derived from a 6,000 kg South Africa-origin shipment worth USD 11,457.08. Replace promptly with a current Harare/South African supplier quote.",
  },
  {
    ingredientId: "l-valine",
    usdPerTonne: 1980,
    market: "Global import fallback — China FOB",
    asOf: "2026-06-30",
    sourceScope: "global-fallback",
    sourceLabel: "ChemAnalyst — Valine Q2 2026 FOB China",
    sourceUrl: "https://www.chemanalyst.com/Pricing-data/valine-1511",
    note:
      "No transparent current Harare/Southern-African bulk quote was found. China FOB feed-market benchmark is used as the global fallback and the 1.30× import multiplier is applied for planning.",
  },
  {
    ingredientId: "l-isoleucine",
    usdPerTonne: 6800,
    market: "Global import fallback — China FOB",
    asOf: "2026-09-30",
    sourceScope: "global-fallback",
    sourceLabel: "Made-in-China — L-Isoleucine feed-grade supplier listing",
    sourceUrl:
      "https://qdroyaldecor.en.made-in-china.com/product-group/nqFQMYdUCpVS/Amino-Acid-catalog-1.html",
    note:
      "No transparent current Harare/Southern-African bulk quote was found. Current feed-grade FOB China listing is used as the global fallback and the 1.30× import multiplier is applied for planning.",
  },
  {
    ingredientId: "l-threonine",
    usdPerTonne: 1260,
    market: "Global import fallback — China",
    asOf: "2026-06-30",
    sourceScope: "global-fallback",
    sourceLabel: "Expert Market Research — Threonine Q2 2026",
    sourceUrl: "https://www.expertmarketresearch.com/price-forecast/threonine-price-trends",
    note:
      "No transparent current Southern-African bulk quote was found. China Q2 2026 benchmark is used only as a planning floor and excludes freight/import costs.",
  },
  {
    ingredientId: "l-tryptophan",
    usdPerTonne: 10500,
    market: "Global import fallback — China",
    asOf: "2026-06-30",
    sourceScope: "global-fallback",
    sourceLabel: "Expert Market Research — Tryptophan Q2 2026",
    sourceUrl: "https://www.expertmarketresearch.com/price-forecast/tryptophan-price-trends",
    note:
      "No transparent current Southern-African bulk quote was found. China Q2 2026 benchmark is used only as a planning floor and excludes freight/import costs.",
  },
  {
    ingredientId: "soybean-full-fat-extruded",
    usdPerTonne: 610,
    market: "Gauteng, South Africa",
    asOf: "2026-10-05",
    sourceScope: "regional",
    sourceLabel: "MF Feeds — Full Fat Soya 35kg",
    sourceUrl: "https://www.mf-feeds.com/collections/raw-materials",
    note:
      "Regional planning proxy from a listed R350 per 35 kg full-fat soya price, normalized to about USD 610/t. PigFlow applies the standard 1.15x regional import multiplier, giving a landed planning value of about USD 701.50/t before any supplier-specific freight or border adjustments.",
  },
  {
    ingredientId: "soybean-degummed-oil",
    usdPerTonne: 1960,
    market: "Harare, Zimbabwe",
    asOf: "2026-10-01",
    sourceScope: "harare",
    sourceLabel: "User-observed retail refined soybean oil",
    note:
      "Planning proxy from a user-observed refined soybean oil price of USD 3.60 per 2 L, normalized to approximately USD 1.96/kg. The market product is refined soybean oil; the nutrient profile remains the Brazilian Tables 2024 Soybean, Degummed Oil record.",
  },
  {
    ingredientId: PUBLIC_PREMIX_ID,
    usdPerTonne: 2000,
    market: "Harare, Zimbabwe",
    asOf: "2026-10-06",
    sourceScope: "harare",
    sourceLabel: "FeedSport International — Vitamin-mineral premix (10 kg/t)",
    sourceUrl: "https://www.feedsport.co.zw/products/premix",
    note: "USD 40 per 20 kg bag; MOQ 20 kg.",
  },
  {
    ingredientId: "barley-two-row",
    usdPerTonne: 202.5,
    market: "Global import fallback — Black Sea FOB",
    asOf: "2026-09-19",
    sourceScope: "global-fallback",
    availabilityMultiplier: SCARCE_GLOBAL_BULK_MULTIPLIER,
    sourceLabel: "MOSTAGRO — Feed barley FOB Black Sea",
    sourceUrl: "https://most-agro.com/prices/barley",
    note:
      "Indicative feed-barley FOB Black Sea midpoint. No transparent current Harare/Southern-African feed-barley quote was found; the standard 1.30x global import multiplier is applied for planning.",
  },
  {
    ingredientId: "canola-meal",
    usdPerTonne: 224,
    market: "Global import fallback — trade benchmark",
    asOf: "2026-06-30",
    sourceScope: "global-fallback",
    availabilityMultiplier: SCARCE_GLOBAL_BULK_MULTIPLIER,
    sourceLabel: "Tridge — Canola meal June 2026 trade values",
    sourceUrl:
      "https://insights.tridge.com/product-monthly-update-market-insights/canola-meal/2026-06",
    note:
      "Uses the June 2026 India-origin observed average unit value of about USD 0.224/kg as a global planning benchmark. The standard 1.30x import multiplier is applied.",
  },
  {
    ingredientId: "corn-ddgs",
    usdPerTonne: 210.54,
    market: "Global import fallback — United States FOB",
    asOf: "2026-09-21",
    sourceScope: "global-fallback",
    availabilityMultiplier: SCARCE_GLOBAL_BULK_MULTIPLIER,
    sourceLabel: "USDA AMS via The Ration — DDGS",
    sourceUrl: "https://the-ration.com/ingredient/ddgs",
    note:
      "Converted from the USDA national median of USD 191 per US short ton to USD 210.54 per metric tonne. The standard 1.30x import multiplier is applied.",
  },
  {
    ingredientId: "corn-gluten-feed",
    usdPerTonne: 223.77,
    market: "Global import fallback — United States FOB",
    asOf: "2026-09-21",
    sourceScope: "global-fallback",
    availabilityMultiplier: SCARCE_GLOBAL_BULK_MULTIPLIER,
    sourceLabel: "USDA AMS via The Ration — Corn gluten feed",
    sourceUrl: "https://the-ration.com/ingredient/corn-gluten-feed",
    note:
      "Converted from USD 203 per US short ton to USD 223.77 per metric tonne. The standard 1.30x import multiplier is applied.",
  },
  {
    ingredientId: "corn-gluten-meal-60",
    usdPerTonne: 557.77,
    market: "Global import fallback — United States FOB",
    asOf: "2026-09-21",
    sourceScope: "global-fallback",
    availabilityMultiplier: SCARCE_GLOBAL_BULK_MULTIPLIER,
    sourceLabel: "USDA AMS via The Ration — Corn gluten meal",
    sourceUrl: "https://the-ration.com/ingredient/corn-gluten-meal",
    note:
      "Converted from the USDA 60% protein benchmark of USD 506 per US short ton to USD 557.77 per metric tonne. The standard 1.30x import multiplier is applied.",
  },
  {
    ingredientId: "cottonseed-meal-43",
    usdPerTonne: 374.79,
    market: "Global import fallback — United States FOB",
    asOf: "2026-09-21",
    sourceScope: "global-fallback",
    availabilityMultiplier: SCARCE_GLOBAL_BULK_MULTIPLIER,
    sourceLabel: "USDA AMS via The Ration — Cottonseed meal",
    sourceUrl: "https://the-ration.com/ingredient/cottonseed-meal",
    note:
      "USD 340 per US short ton converted to USD 374.79 per metric tonne. USDA quotes about 41% CP; FeedSport maps this benchmark to the nearest 43% CP Brazilian Tables record. The standard 1.30x import multiplier is applied.",
  },
  {
    ingredientId: "rice-bran",
    usdPerTonne: 157.63,
    market: "Global import fallback — United States FOB",
    asOf: "2026-09-21",
    sourceScope: "global-fallback",
    availabilityMultiplier: SCARCE_GLOBAL_BULK_MULTIPLIER,
    sourceLabel: "USDA AMS via The Ration — Rice bran",
    sourceUrl: "https://the-ration.com/ingredient/rice-bran",
    note:
      "Converted from USD 143 per US short ton to USD 157.63 per metric tonne. The standard 1.30x import multiplier is applied.",
  },
  {
    ingredientId: "soybean-hulls",
    usdPerTonne: 170.86,
    market: "Global import fallback — United States FOB",
    asOf: "2026-09-21",
    sourceScope: "global-fallback",
    availabilityMultiplier: SCARCE_GLOBAL_BULK_MULTIPLIER,
    sourceLabel: "USDA AMS via The Ration — Soybean hulls",
    sourceUrl: "https://the-ration.com/ingredient/soybean-hulls",
    note:
      "Converted from USD 155 per US short ton to USD 170.86 per metric tonne. The standard 1.30x import multiplier is applied.",
  },
  {
    ingredientId: "blood-meal",
    usdPerTonne: 1733.94,
    market: "Global import fallback — United States FOB",
    asOf: "2026-09-14",
    sourceScope: "global-fallback",
    sourceLabel: "USDA AMS via The Ration — Blood meal",
    sourceUrl: "https://the-ration.com/ingredient/blood-meal",
    note:
      "Converted from USD 1,573 per US short ton to USD 1,733.94 per metric tonne. Blood-meal quality varies materially by drying method, so replace this with a supplier-specific quote when available.",
  },
  {
    ingredientId: "feather-meal-84-cp",
    usdPerTonne: 501.55,
    market: "Global import fallback — United States FOB",
    asOf: "2026-09-14",
    sourceScope: "global-fallback",
    availabilityMultiplier: SCARCE_GLOBAL_BULK_MULTIPLIER,
    sourceLabel: "USDA AMS via The Ration — Feather meal",
    sourceUrl: "https://the-ration.com/ingredient/feather-meal",
    note:
      "Converted from USD 455 per US short ton to USD 501.55 per metric tonne. USDA's benchmark is about 80% CP; this is used for the closest higher-protein FeedSport record. The standard 1.30x import multiplier is applied.",
  },
  {
    ingredientId: "fish-meal-62",
    usdPerTonne: 2916,
    market: "Global import fallback — CIF Hamburg",
    asOf: "2026-09-30",
    sourceScope: "global-fallback",
    sourceLabel: "World Bank Pink Sheet — Fishmeal 64–65% protein",
    sourceUrl: "https://commodityorigins.com/prices/fishmeal/",
    note:
      "September 2026 World Bank benchmark for 64–65% protein fishmeal. FeedSport maps it to the closest 62% CP record; the standard 1.30x import multiplier is applied.",
  },
  {
    ingredientId: "bovine-meat-and-bone-meal-48-cp",
    usdPerTonne: 537.93,
    market: "Global import fallback — United States FOB",
    asOf: "2026-09-14",
    sourceScope: "global-fallback",
    availabilityMultiplier: SCARCE_GLOBAL_BULK_MULTIPLIER,
    sourceLabel: "USDA AMS via The Ration — Meat and bone meal",
    sourceUrl: "https://the-ration.com/ingredient/meat-bone-meal",
    note:
      "Converted from USD 488 per US short ton to USD 537.93 per metric tonne. USDA quotes roughly 46–50% CP, so this benchmark is mapped to FeedSport's 48% CP record. The standard 1.30x import multiplier is applied.",
  },
  {
    ingredientId: "poultry-by-product-meal",
    usdPerTonne: 466.99,
    market: "Global import fallback — United States",
    asOf: "2026-06-30",
    sourceScope: "global-fallback",
    availabilityMultiplier: SCARCE_GLOBAL_BULK_MULTIPLIER,
    sourceLabel: "Darling Ingredients — Feed-grade poultry by-product meal Q2 2026",
    sourceUrl:
      "https://www.sec.gov/Archives/edgar/data/916540/000091654026000019/dar2q2026earnings.htm",
    note:
      "Q2 2026 average USD 423.65 per US short ton converted to USD 466.99 per metric tonne. The standard 1.30x global import multiplier is applied.",
  },
  {
    ingredientId: "molasses-cane",
    usdPerTonne: 170,
    market: "South Africa export unit value",
    asOf: "2026-06-10",
    sourceScope: "regional",
    sourceLabel: "UN Comtrade via Selina Wamucii — South Africa molasses",
    sourceUrl: "https://www.selinawamucii.com/insights/prices/south-africa/molasses/",
    note:
      "South African export unit-value benchmark of about USD 0.17/kg. The standard 1.15x regional import multiplier is applied for planning into Zimbabwe.",
  },
  {
    ingredientId: "corn-oil",
    usdPerTonne: 1587,
    market: "Global import fallback — USA FOB",
    asOf: "2026-08-31",
    sourceScope: "global-fallback",
    sourceLabel: "Procurement Resource — Corn oil Q3 2026",
    sourceUrl: "https://www.procurementresource.com/resource-center/corn-oil-price-trends",
    note:
      "No robust current Harare/Southern-African bulk corn-oil quote was found. USA FOB benchmark excludes freight/import costs.",
  },
];

/**
 * Merges price overrides (e.g. FeedSport's own selling prices from the database)
 * over the hard-coded planning defaults. An override replaces the default for
 * the same ingredient; ingredients without an override keep their default.
 */
export function mergeIngredientPrices(
  overrides: readonly IngredientDefaultPrice[],
  defaults: readonly IngredientDefaultPrice[] = INGREDIENT_DEFAULT_PRICES,
): IngredientDefaultPrice[] {
  const overridden = new Set(overrides.map((price) => price.ingredientId));
  return [...overrides, ...defaults.filter((price) => !overridden.has(price.ingredientId))];
}

export function ingredientDefaultPrice(
  ingredientId: string,
  prices: readonly IngredientDefaultPrice[] = INGREDIENT_DEFAULT_PRICES,
): IngredientDefaultPrice | undefined {
  return prices.find((price) => price.ingredientId === ingredientId);
}

export function ingredientDefaultPlanningPricePerTonne(
  ingredientId: string,
  prices: readonly IngredientDefaultPrice[] = INGREDIENT_DEFAULT_PRICES,
): number | undefined {
  const price = ingredientDefaultPrice(ingredientId, prices);
  if (!price) return undefined;
  return (
    price.usdPerTonne *
    ingredientImportPriceMultiplier(price.sourceScope) *
    (price.availabilityMultiplier ?? 1)
  );
}

export function ingredientDefaultPricePerKg(
  ingredientId: string,
  prices: readonly IngredientDefaultPrice[] = INGREDIENT_DEFAULT_PRICES,
): number | undefined {
  const pricePerTonne = ingredientDefaultPlanningPricePerTonne(ingredientId, prices);
  return pricePerTonne === undefined ? undefined : pricePerTonne / 1000;
}
