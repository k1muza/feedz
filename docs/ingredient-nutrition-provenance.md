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

## Caremix Maxipacks: finished-feed specifications kept as reference

The user-provided one-page Caremix / Trouw Nutrition sheet describes **nutrient
ranges per kilogram of finished feed** for three stage-specific products:
PigWeaner 28 kg/t (2.8%), Pig Grower 32 kg/t (3.2%) and Pig Finisher 26 kg/t
(2.6%). The 30 printed rows per product are preserved under
`premix.finishedFeedSpecification`, with the user-approved min/max reversals
noted per row.

A finished-feed specification is not a premix composition. FeedSport no longer
reverse-calculates a premix profile from it: the Caremix nutrition profiles are
empty, so every premix nutrient is reported as undocumented (`assumed_zero` in
hard requirements, `no_data` against Chapter 7). The premix advisory can then
compare a documented alternative. A per-kg premix analysis from the supplier
is required before any Caremix nutrient is credited.

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
  in this catalogue. Their planning prices are explicitly sourced from Alibaba
  listing midpoints and multiplied by two; they are not represented as supplier
  quotations and should be replaced by current quotes when available.
* `getIngredient()` / MCP outputs profile-source attribution for both
  Brazilian Tables ingredients and commercial products. MCP `formulate`,
  `analyse_formulation`, manufacturer-recipe diagnostics, featured-formulation
  previews and advisor suggestion checks expose `nutritional_validation`
  separately from solver status. Its overall status is `verified`,
  `targets_not_met`, or `verification_pending`.

CJ S174/ST174A remains **manufacturer-recipe restricted**.
Its declared minimum total lysine can be reported conditionally, but does not
establish SID lysine or the completeness of a boar ration.
