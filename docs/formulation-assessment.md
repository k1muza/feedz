# Formulation assessment model

## Root cause investigated on 10 October 2026

The reproduced Grow-Finish Pig result was internally consistent but presented
with inconsistent meanings of “success.” The calculation path was:

1. The selected programme phase loads basal nutrient requirements from the
   Brazilian Tables programme data and separate vitamin/trace-mineral
   supplementation targets from the programme's supplementation tables.
2. Studio calls the optimizer in its default basal mode. Energy, protein,
   amino acids, major minerals and applicable practical constraints are hard LP
   constraints. Supplemental vitamin and trace-mineral targets are deliberately
   not added to that LP when `includeSupplementationTargets` is false.
3. After an optimal recipe is found, the API evaluates the finished recipe
   again with supplementation targets enabled.
4. Diet analysis tracks a value and its completeness separately. An omitted
   premix nutrient is marked unknown with the ingredient ID; it is not replaced
   by zero. Non-premix ingredients are structural zeroes for *supplemented*
   micronutrients because those targets measure deliberate supplementation,
   not natural total-diet content.
5. The previous category reducer combined known target failures and missing
   data into the single status `not_met`.
6. The previous workspace rendered basal optimizer feasibility and the broader
   category result as equal-status badges. This produced the contradictory
   green “Feasible” and red “Vitamins — Not met” messages.
7. Saved Studio summaries discarded the broader validation and set every
   optimized result's failure count to zero. Their independent renderer then
   labeled those versions “Meets all.”
8. Workspace, saved lists, comparisons and PDFs each derived wording from
   different fields.

### Why Sustar GlyPro X912 cannot be fully verified

X912 is fixed at its manufacturer-published dose of 0.2% (2 kg/t). Its loaded
manufacturer minimum-guarantee profile declares vitamins A, D, K, B1, B2, B6,
B12, pantothenic acid, niacin, folic acid and biotin. It does **not** declare
vitamin E or total choline. The product page also identifies X912 while its
nutrient-table heading says X911, so supplier confirmation is already required.

At 0.2%, the declared minima can be credited conservatively. Vitamin E and
choline remain unknown. Recommended inclusion proves the amount used, not the
composition the manufacturer has not published. Therefore the correct result
is `needs_verification`, with those two checks marked `unknown`; it is neither a
confirmed deficiency nor a verified complete-feed result.

## Canonical model

`src/lib/formulation-assessment.ts` is the single assessment builder, while
`src/lib/formulation-assessment-model.ts` contains its browser-safe schema and
labels. Together they are the canonical assessment source. It records:

- whether the optimizer found a feasible recipe;
- one of `verified`, `needs_verification` or `infeasible`;
- every applicable nutrient as `met`, `below_target`, `above_limit` or
  `unknown`;
- category states `met`, `unmet`, `unknown` or `not_assessed`;
- missing ingredient IDs, target source, plain-language reason and corrective
  guidance; and
- post-solve failures of optimizer-enforced constraints as consistency errors.

An optimized recipe is `verified` only when every applicable check in the
declared scope is supported by sufficient data and passes. A feasible recipe
with a known failure, missing data or an unassessed category is
`needs_verification`. An optimizer failure is `infeasible`.

The assessment is returned by formulation APIs, stored inside new saved-version
summaries and consumed by Studio workspace, saved lists, history, comparison
and PDFs. Older saved summaries are left unchanged and shown conservatively as
“Verification unavailable” until reopened and recalculated; their recipes and
historical calculation inputs are not modified.

The declared scope covers modeled programme energy, protein, amino-acid and
major-mineral requirements plus loaded vitamin and trace-mineral
supplementation targets. It does not verify ingredient quality, weighing,
mixing, storage or animal-specific health conditions.
