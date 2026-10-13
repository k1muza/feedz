# Formulation assessment model

FeedSport judges a recipe with three vocabularies that never mix.

| Vocabulary | Values | Decides feasibility? |
| --- | --- | --- |
| Hard requirement status | Met / Not met | Yes. The only red in the product. |
| Data status, on every value | Published / Assumed 0 / Missing | No. Says how much the value can be trusted. |
| Advisories | Chapter 7 comparison, premix documentation, premix alternatives, practical guidelines | No. Optional, amber, never block. |

## Hard requirements

Hard requirements are exactly the constraints the optimizer enforces
(`formulationRequirements`):

- energy (ME or NE), crude and digestible protein;
- SID amino acids;
- calcium, standardized digestible phosphorus, available phosphorus, sodium,
  chloride, potassium and other modelled minerals. Digestible and available
  phosphorus are independent minimums whenever the programme publishes both
  (every Brazilian swine and broiler phase does); one never substitutes for
  the other. Broilers use the poultry digestible-phosphorus values (Table 1.01
  "Std. Dig. P Poultry"; Table 1.10 "Dig. Broilers" for phosphates), never the
  swine STTD values;
- practical constraints the programme publishes as limits (NDF minimum,
  L-lysine HCl maximum);
- per-ingredient inclusion limits (enforced as variable bounds); and
- the manufacturer's premix dose, reported as the `premix-dose` requirement.

A minimum is met when the known contributions reach it. Missing values can
only add, so a known subtotal at the minimum is met even with a gap; below it,
the requirement is not met and its data status says why it cannot be confirmed.

## Supplementation advisories (Brazilian Tables Chapter 7)

`supplementationGuidance(phase)` holds the Chapter 7 vitamin and
trace-mineral recommendations (inorganic trace-mineral basis). They are never
LP constraints and never decide the verdict. Each is compared with the
*supplemented* amount (premixes and mineral sources only, not maize or soybean
meal) as `at_recommendation`, `below_recommendation` (shown as "% of
recommendation") or `no_data` when the selected premix does not document it.

## Commercial premixes are ingredients

A premix's documented composition is an ordinary species nutrition profile in
`ingredient-library.json`, so `analyzeDiet` and the optimizer credit it through
the same pipeline as every other ingredient: each documented nutrient once, at
its inclusion. A premix that documents SID lysine reduces the crystalline
lysine the optimizer adds. A premix value that is published only as a total
(e.g. CJ S174's total lysine) counts toward total amino acids, never toward SID.

A value a premix does not document is counted as 0, which is conservative for
a minimum, and labelled `assumed_zero` with the premix ID. It is never shown
as published. A value missing from an ordinary ingredient stays `missing`; the
optimizer sets that ingredient aside instead of guessing.

Some ingredient classes are structural zeros for a nutrient family (limestone
has no energy; oil has no amino acids). That never covers digestible or
available phosphorus for an ingredient whose total phosphorus is published
above zero: a phosphate without a published digestible value is `missing`,
not 0.

## Canonical model

`src/lib/formulation-assessment-model.ts` (browser-safe schema) and
`src/lib/formulation-assessment.ts` (builder) are the single source used by
the optimize and evaluate APIs, Studio, the public formulator, MCP, saved
versions and both PDFs. `formulateAndAssess` is the one formulation entry
point for the optimize API, Studio and MCP. A `FormulationAssessment`
(schema 2) records:

- `verdict`: `meets_requirements`, `fails_requirements` or `infeasible`
  (the closest recipe is assessed and must not be mixed);
- `headline`: "Meets all 20 hard requirements" or "Doesn't meet 1 hard
  requirement". It never says "verified" or "ready to manufacture";
- every hard requirement with its status, limiting flag, data status and the
  contribution of every ingredient (premix included);
- the Chapter 7 comparison;
- `documentationGaps`: premix values that are total-only or not documented,
  shown as one concise line; and
- `consistencyErrors`: post-solve failures of optimizer-enforced bounds. The
  optimize API rejects a primary recipe with any; optional alternatives with
  one are dropped without pardoning the primary.

The optimizer also checks every GLPK optimum against its own rows and
re-solves without presolve when one is violated, because GLPK's presolver can
report OPTIMAL for an infeasible basket.

## Premix advisory and replacement

`comparePremixes` re-runs the formulation once per other stage-eligible
premix. Each run removes the selected premix, inserts the alternative at its
manufacturer dose and re-optimises everything else with the same ingredients,
limits and prices. Two premixes are never kept together.
Manufacturer-recipe-only products are not compared because they fix the whole
recipe. An alternative without a price is costed without it and marked
`costExcludesPremix`.

`suggestPremixReplacement` suggests an alternative only when its re-run meets
every hard requirement and shows a concrete improvement: fewer documentation
gaps, more Chapter 7 recommendations reached, a hard requirement the current
premix's recipe misses, or a lower cost. Higher concentrations alone never
count. `premixRecipeEffect` re-runs the recipe without the premix's macro
contributions to explain, for example, "0.07% less L-lysine HCl because the
premix supplies SID lysine".

## Saved formulations

New saved versions store the schema-2 assessment. Versions saved with the
schema-1 model (`verified` / `needs_verification`) are never re-scored: they
show "Premix data updated · re-formulate" until the user re-runs them.

Saved assessments are never silently re-scored when the rules change; they
carry a note instead. A schema-2 assessment without `inclusionPolicy`
predates family ceilings (`predatesAggregateLimits`). A broiler assessment
that checked available phosphorus but has no `sttd-phosphorus` row predates
the poultry digestible-phosphorus minimum
(`predatesPoultryDigestiblePhosphorus`): Studio and the Studio PDF say only
available phosphorus was checked, and the PDF does not show it as a pass.
