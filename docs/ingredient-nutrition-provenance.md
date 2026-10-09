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
* **Missing data** — `undefined` remains unknown. Manufacturer label
  guarantees expressed as **minimums or ranges** are never presented as exact
  analytical concentrations. A published minimum may be retained explicitly
  as a conservative `minimum_guarantee` and multiplied by the premix inclusion
  rate to report a minimum finished-feed contribution. That contribution stays
  `manufacturer_unverified` and cannot produce a complete-feed pass. SID amino
  acid values require a
  supplier-provided SID analysis or sufficiently documented total-AA value
  and digestibility coefficient.
* **Supplier products** — manufacturer SKU, stage eligibility, inclusion rule,
  mixing instructions, specification URL, nutrient contribution and formula
  restrictions are additional **ingredient constraints**, not a separate
  formulation engine.
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
4. Add `verifiedAsFedAminoAcids` only with a `reference` and `sourceUrl`
   and record each `aminoAcids.totalPct.*` and `aminoAcids.sidPct.*`
   source in `provenance.nutrientSources`.
5. Retain product-level verification warnings until all relevant nutrient
   guarantees, practical dosage restrictions and compatibility are verified.

## Formulation versus complete-feed validation

The least-cost solver reports whether a recipe is feasible against its active
hard constraints. Complete-feed validation is a separate assessment with four
categories: energy/protein/amino acids, major minerals, vitamins, and trace
minerals. Vitamins and trace minerals use supplemented targets separately from
total-diet requirements where the source publishes supplementation guidance.
Any missing target, missing ingredient value, or unverified premix profile keeps
the category at `not_verified` and the complete-feed result at `incomplete`,
even when the basal formulation is feasible.

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
