# Ingredient nutrition provenance

Every ingredient in FeedSport's formulation engine has a **nutrition profile**
with its own attribution. Price provenance is separate from nutrient provenance.

## Data contract

* **Source** — publisher, title, URL, optional year, basis (as-fed/dry matter),
  table and page. The Brazilian Tables publication is inherited by each
  ingredient when no more specific per-ingredient source is recorded.
* **Profile status** — `published_reference`,
  `manufacturer_unverified`, `manufacturer_verified`, or
  `user_supplied_unverified`. A reference database is *published*, not a
  laboratory certificate for a particular supplier's lot.
* **Nutrient-level source** — `provenance.nutrientSources[path]` overrides
  the profile citation for any nutrient contributed by another publication.
  Studio's ingredient detail shows the individual citation for every
  displayed non-null nutrient and the profile-level source.
* **Missing data** — `undefined` is never a verified zero. For an ordinary
  ingredient it stays missing and the optimizer sets the ingredient aside. For
  a commercial premix it is counted as 0 (conservative for a minimum) and
  reported as `assumed_zero` with the premix ID, never as a published value.
  Label guarantees expressed as **minimums or ranges** are recorded as the
  minimum (`basis: "as-fed label minimum per kg premix"`), never as an exact
  analysis. SID amino-acid values require a supplier-provided SID analysis or
  a published total plus a source-backed digestibility coefficient.
* **Supplier products** — a commercial premix's composition is an ordinary
  species nutrition profile (`nutrition.swine` / `nutrition.poultry`), credited
  through the same pipeline as maize or soybean meal. Its `premix` block adds
  manufacturer, SKU, stage eligibility, the fixed dose, instructions, min/max
  `publishedGuarantees`, the specification URL and formula restrictions.
* **User-entered premixes** — a source can be attached to the request; a
  user-provided profile stays unverified until separately validated. Without
  a URL, the source is explicitly reported as user-supplied without an
  independently citable datasheet rather than fabricating a citation.

## Adding a supplier nutrient profile

1. Capture the exact product and stage, dosage, as-fed/dry-matter basis, the
   original datasheet or certificate, its version/date, and any bag/lot
   identification that governs the specification.
2. Preserve **minimum**, **maximum** and **exact analytical value** as separate
   data semantics. A minimum can be used only as a conservative lower-bound
   contribution, never as an exact analysis or independent verification.
3. Record exact per-kg nutrient concentrations only where evidence supports
   them. For amino acids, store total and SID distinctly; never treat a
   minimum total lysine label as SID lysine.
4. Put published per-kg-premix values in the premix's species nutrition
   profile: vitamins, trace minerals, `macroMinerals`, `aminoAcids.totalPct`,
   `aminoAcids.sidPct` (only when SID is published) and any protein or energy.
   Cite any value whose basis differs from the product-level source in
   `provenance.nutrientSources` (for example "TOTAL lysine, no SID value
   published" or a NaCl-to-sodium molar-mass conversion).
5. Retain product-level verification warnings until all relevant nutrient
   guarantees, practical dosage restrictions and compatibility are verified.

## Caremix Maxipacks: per-kg premix profiles reverse-calculated from finished-feed specifications

Trouw Nutrition's one-page *Caremix Pig Grower Specification Range* gives
nutrients **per kilogram of finished feed** for three stage-specific products:
PigWeaner 28 kg/t (2.8%), Pig Grower 32 kg/t (3.2%) and Pig Finisher 26 kg/t
(2.6%). Its *Ration download Pig Growers* worksheet gives a reference ration
for each product with total crude protein, fat, fibre, calcium and phosphorus.
Both are kept on the product: the 30 printed rows (with the user-approved
min/max reversals) under `premix.finishedFeedSpecification.rows`, and the
worksheet under `premix.finishedFeedSpecification.referenceRation`.

Each Caremix product's `nutrition.swine` profile is an ordinary per-kg premix
composition, credited through the same pipeline as Sustar X912. Every value
cites its derivation in `provenance.nutrientSources[path]`.

### Measurement basis

The sheet lists what the **premix supplies** per kg of feed, not total feed
content. Its phosphorus ranges (for example 0.42–1.37 g/kg for the grower) and
the grower manganese row are below what maize, soybean meal and wheat bran
alone supply, and the worksheet's grower ration totals 5.3 g P/kg. So:

`premix concentration = finished-feed supplemental minimum / (inclusionKgPerTonne / 1000)`

For example, Pig Grower vitamin A 10,000 IU/kg feed ÷ 0.032 = 312,500 IU/kg
premix; zinc 80 mg/kg feed ÷ 0.032 = 2,500 mg/kg premix.

### Rules applied

* **Minimums, like Sustar.** The canonical profile uses the published minimum.
  A row with only a maximum, or a minimum of 0, is not a guaranteed supply and
  stays missing: choline, phytase, antioxidant, tryptophan and valine for all
  three products, grower methionine and threonine, finisher folic acid and
  finisher phosphorus.
* **Calcium from the reference ration.** Calcium is the worksheet total minus
  the basal ingredients' calcium (Brazilian Tables 2024 profiles of maize,
  soybean meal 45.6% CP, wheat bran and, for the weaner, fish meal 54% CP),
  divided by the premix's share of the printed batch mass (16 of 501 kg for
  the grower). It is used because the result lies inside the published
  supplemental range for all three products, whose printed Min/Max are
  transposed, and because understating premix calcium against a
  minimum-only requirement would add limestone the feed does not need.
* **Phosphorus keeps the published minimum.** The worksheet implies more
  premix phosphorus than the published maximum for every product, so the two
  documents disagree and the conservative minimum is used. STTD and available
  phosphorus apply dicalcium phosphate's Brazilian Tables coefficients (75.1%
  and 100%), assuming an inorganic source. Phytase is not credited.
* **Amino acids.** The supplemental amino acids are crystalline. Total is the
  minimum ÷ dose; SID applies the Brazilian Tables Table 1.09 coefficients
  (lysine 98.1%, methionine 99.5%, threonine 96.8%).
* **Units.** Calcium pantothenate × 0.92 (d-form) = pantothenic acid; biotin
  mcg → mg; g/kg → % (÷ 10). Vitamin B12 stays in mcg/kg.
* **Vitamin E.** Only the labelled vitamin E row is credited; the unlabelled
  "Vitamin E Equivalent" IU row is not added.
* **Displaced trace-mineral cells.** The printed Fe–Se cells are scrambled.
  Weaner and finisher each contain the eight numbers of plausible I, Mn, Zn and
  Se ranges; the lower plausible minimum is credited (weaner I 0.6, Mn 20,
  Zn 100, Se 0.1 mg/kg; finisher I 0.4, Mn 20, Zn 60, Se 0.1). The grower
  cells are rotated one row (iodine row = zinc 80–150, manganese row = iodine
  0.5–2, zinc row = manganese 20–60, selenium row = iron 80–160, iron row
  repeats copper), so grower **selenium is lost and stays missing**.
* **Not inferred.** Energy, crude protein, fat and fibre: the worksheet totals
  minus basal give inconsistent results across products (for example negative
  fibre) because they are differences of nearly equal numbers. Chloride is not
  declared and is not inferred from sodium.

`src/lib/caremix-premix-profiles.test.ts` recomputes every value from the
stored rows and reference ration, including the worked grower example
(317 kg maize, 100 kg soybean meal, 68 kg wheat bran, 16 kg Caremix =
501 kg, reproducing the worksheet's 6.1 g Ca/kg).

The profiles are calculated, not a supplier assay: verification stays
`manufacturer_unverified` until Trouw Nutrition confirms a per-kg premix
composition.

## Hard requirements versus supplementation advisories

The least-cost solver enforces hard requirements only: energy, protein, SID
amino acids, minerals, ingredient limits and the premix dose. Brazilian Tables
2024 Chapter 7 supplementation guidance (Tables 7.01/7.03 broilers, 7.05/7.06
growing swine, 7.07 breeders, matched to phases by age band) is compared with
the supplemented vitamins and trace minerals as an **advisory**. It never makes
a feed deficient. Table 7.05 starts at weaning (21 days), so the 14–21 day
nursery phase has no comparison. See `docs/formulation-assessment.md`.

## Interfaces

* `ingredientProfileAttribution(record)` returns source, verification status,
  table/page, and specific nutrient sources.
* `nutrientValueSource(record, nutrientPath)` resolves a specific nutrient
  source first, then profile-level provenance.
* `getStudioCatalogue()` returns `nutritionSource` and `nutrientSources`
  for the ingredient details panel. Real premixes are present as ingredients
  in this catalogue. Caremix PigWeaner, Pig Grower and Pig Finisher are priced
  from a Zimbabwe supplier quotation (per bag, ex VAT, converted to per kg with
  no planning multiplier). The other premixes' planning prices are Alibaba
  listing midpoints multiplied by two; they are not supplier quotations and
  should be replaced by current quotes when available.
* `getIngredient()` / MCP outputs profile-source attribution for both
  Brazilian Tables ingredients and commercial products. MCP `formulate`,
  `analyse_formulation`, manufacturer-recipe diagnostics, featured-formulation
  previews and advisor suggestion checks expose `nutritional_validation`
  separately from solver status. Its overall status is `verified`,
  `targets_not_met`, or `verification_pending`.

CJ S174/ST174A remains **manufacturer-recipe restricted**.
Its declared minimum total lysine can be reported conditionally, but does not
establish SID lysine or the completeness of a boar ration.
