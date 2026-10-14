# Formulation assessment model

FeedSport judges a recipe with three vocabularies that never mix.

| Vocabulary | Values | Decides feasibility? |
| --- | --- | --- |
| Hard requirement status | Met / Not met | Yes. Red when not met. |
| Data status, on every value | Published / Assumed 0 / Missing | No. Says how much the value can be trusted. |
| Advisories | Chapter 7 comparison, CFIA reference maximums, premix documentation, premix alternatives, practical guidelines | No. Optional, never block. Amber, except an established CFIA exceedance, which is red inside the Advisories tab only. |

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

## Numerical comparisons

`src/lib/numerical-tolerance.ts` holds the only comparison rules. The
optimizer, `buildFormulationAssessment`, Studio's manual check, the evaluate
and report APIs and MCP all import them. A bound is met unless it is violated
by more than its tolerance (`withinBound`). Tolerances only absorb arithmetic
error and never stand in for display rounding:

| Comparison | Tolerance | Why |
| --- | --- | --- |
| Nutrient minimum/maximum, Chapter 7 recommendation | 1e-5 × bound (floor 1e-7) | GLPK row feasibility plus recomputing nutrients from the solution; 0.0000089 pp for SID lysine at 0.891% |
| Family / constraint-group ceiling | 1e-5 × ceiling (floor 1e-6 pp) | An LP row, like a nutrient |
| One ingredient's minimum, maximum or fixed dose, premix dose | 1e-6 pp | Variable bounds are honoured exactly; only binary floating point (0.1 + 0.2) is absorbed |

Nutrients are never rounded before they are compared.

**Batch total.** Amounts totalling 100% to 1e-6 pp are assessed as given.
Amounts within ±0.05 pp (`INCLUSION_TOTAL_TOLERANCE_PCT`) are an
input-rounding residual. That covers ten amounts typed to two decimals, or
untouched exact amounts next to retyped ones. For such a recipe:

- nutrients are measured on the mix the amounts make (each amount as a share
  of their total);
- the premix dose, ingredient limits and family ceilings are judged on the
  amounts as entered, the ones that are weighed; and
- the assessment records `inclusionTotalPct` and says so in its summary.

Rescaling therefore never moves a fixed premix or a capped family off its
bound. A larger difference is an incomplete or excessive batch and is
rejected, never rescaled.

**Display.** A bound is written with its published decimals (0.891, not
0.89). A requirement that is not met is never written as equal to its bound:
`requirementDisplay` gives the decimals that show the difference and the
shortfall or excess ("0.0023 percentage points below the minimum"). The same
helper drives the Studio banner and nutrient analysis and both PDFs. MCP
reports the unrounded `deviation`.

## Supplementation advisories (Brazilian Tables Chapter 7)

`supplementationGuidance(phase)` holds the Chapter 7 vitamin and
trace-mineral recommendations (inorganic trace-mineral basis). They are never
LP constraints and never decide the verdict. Each is compared with the
*supplemented* amount (premixes and mineral sources only, not maize or soybean
meal) as `at_recommendation`, `below_recommendation` (shown as "% of
recommendation") or `no_data` when the selected premix does not document it.

## CFIA reference maximums (advisory upper limits)

`src/lib/cfia-maximum-nutrients.ts` imports Table 1 (Swine) and Table 2
(Chickens) of the CFIA *Tables of Maximum Nutrient Values for Feeds*
(incorporated by reference into the Feeds Regulations, 2024; page modified
2024-07-03), from
`src/data/nutrition/sources/cfia-maximum-nutrient-values-2024/tables.json`.
No other species' tables are imported.

**Phase mapping.** `phase-mapping.json` maps every programme phase to exactly
one CFIA column or to an explicit `unsupported` status. Nothing is inferred at
run time; a phase missing from the file is also unsupported. The file uses the
agreed **upper-bound rule** and records an explanation for each phase:

- growing pigs: the column whose weight range contains the phase's upper
  published weight (lower bound exclusive, upper inclusive). A 16–26 kg
  starter therefore takes Grower (25 to 50 kg): copper 125 mg/kg and zinc
  300 mg/kg, not the Starter 250 and 3,000. A grow-finish phase ending above
  135 kg is past the heaviest published column, so it is `unsupported` and
  gets no comparison. FeedSport does not extrapolate a column;
- broilers: the column containing the phase's last day, with day 28 as the
  Starter/Grower boundary. CFIA prints Starter as "0 to 8 weeks", which
  overlaps Grower "4 to 8 weeks"; the two columns have identical values;
- gestating gilts and sows: Dry sows; lactating gilts and sows: Lactating
  sows; PIC mature boars: Sexually active boars.

**Assessment.** `buildFormulationAssessment` records `upperLimits`: each CFIA
nutrient FeedSport models (calcium, total phosphorus, sodium, potassium,
copper, iodine, iron, manganese, selenium, zinc, vitamins A, D and E) against
the recipe's *total-diet* concentration, every ingredient included.
Magnesium, sulfur and cobalt are listed as not assessed. Values are compared
as fed; CFIA states them for the total diet at 88% dry matter.

| Status | Meaning |
| --- | --- |
| `exceeds` | The documented contributions alone are above the maximum. Missing values can only add, so this is established. Red. |
| `within` | At or below the maximum and every premix documents the nutrient. For a % nutrient, also when even counting each undocumented ingredient at its full inclusion stays within. |
| `not_documented` | Below only because a premix that does not document it was counted as 0. Unknown, never within; shown with the Missing tag, never red. |

The maxima are never GLPK rows and never change the verdict, headline or
hard-requirement counts. Vitamin and mineral maxima are advisory by design.
The only non-vitamin, non-mineral maximum with a source is the PIC
mature-boar L-lysine HCl limit, which is already a GLPK row and a hard
requirement checked with the same bound; no other maximum is invented.

**Vitamin advice.** When the recipe exceeds the CFIA maximum for vitamin A, D
or E, `comparePremixes` (the same re-runs as the premix advisory) adds
`vitaminAdvice` (`adviseOnVitaminLimits`): each exceedance, its contributing
ingredients and whether the selected premix is responsible, and at most one
recommended alternative. An alternative is recommended only when it is
on-label for the phase, its re-run meets every hard requirement, it documents
every exceeded vitamin, it lowers at least one without raising any, and it
introduces no new vitamin exceedance. Candidates rank by exceedances resolved,
then remaining excess, then cost, never by how many vitamins a label lists.
`resolved` is true only when every exceeded vitamin is `within` in the
re-run; otherwise the advice says the exceedance is reduced, not resolved.
With no candidate, the advice is to verify the premix's vitamin
specifications with its manufacturer. Nothing is replaced automatically: the
farmer reviews the alternative (Compare premixes shows its full recipe, cost,
hard requirements and CFIA vitamins) and chooses Replace premix.

Studio shows one red card per exceedance group in the Advisories tab (one for
the vitamins, one per mineral) and counts it once on the usual advisory
indicator; the CFIA table sits beside, but apart from, the Chapter 7
comparison. The Studio PDF and the public PDF write the same findings in
their Advisories section; MCP reports them under
`nutritional_validation.advisories.upper_limits` and
`premix_advisory.vitamin_upper_limit_advice`.

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
every hard requirement and shows a concrete improvement: more Chapter 7
recommendations reached, a hard requirement the current premix's recipe
misses, or a lower cost (fewer documentation gaps is reported alongside, never
on its own). Higher concentrations alone never count, and an alternative that
introduces or worsens a known CFIA vitamin exceedance is never suggested,
however cheap. A validated CFIA vitamin replacement takes precedence over
these reasons. When the farmer views a simpler, lower-soy or lower-import
recipe, every premix is re-run on that same goal (`PremixComparison.goal`); an
alternative with no such recipe within 3% shows its least-cost recipe, is
flagged `goalUnavailable` and is never suggested or recommended, because it
was not evaluated on the farmer's goal. `premixRecipeEffect` re-runs the recipe without the premix's macro
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
An assessment without `upperLimits` predates the CFIA references: it is shown
as saved, without CFIA findings, until the user re-formulates or re-checks it.
Upper limits are advisory, so their absence never changes a saved verdict.
