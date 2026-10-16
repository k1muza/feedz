# FeedSport Playground — Product & Implementation Specification

**Version:** 1.1  
**Status:** Proposed / ready for implementation planning  
**Date:** 15 October 2026  
**Product:** FeedSport Studio  
**Scope:** Pig and poultry feed formulations  
**Repository:** https://github.com/k1muza/feedz

## 1. Purpose

Build an interactive, low-friction formulation sandbox where farmers can experiment with ingredient inclusion percentages and prices, observe nutrient and cost changes, ask the optimiser to rebalance around chosen constraints, compare variations, and deliberately transfer a promising formulation into Studio.

**Product distinction:** Playground is for exploration; Studio is for saved formulation management. Playground must not introduce a competing nutrient database, optimiser, set of validation rules, or persistent formulation store.

**Principal requirement:** **Fixed** is a first-class ingredient setting, consistent with the roles already recognised by FeedSport Studio. Fixed ingredients retain their specified inclusion percentages during automatic balancing and optimisation, unless the farmer explicitly edits the fixed target. Manufacturer-mandated premix doses are immutable.

## 2. Goals and non-goals

### Goals

1. Give immediate, trustworthy feedback when a farmer changes a recipe.
2. Make it easy to declare some ingredients **Fixed** while others remain available for adjustment or optimisation.
3. Keep recipe mass balance and nutritional assessment unambiguous, including incomplete or impossible experiments.
4. Enable side-by-side cost, nutrient, adequacy and advisory comparisons against an immutable baseline.
5. Transfer an experiment into Studio without silently overwriting the source formulation.
6. Reuse existing assessment and optimisation logic and preserve exact numerical precision.

### Non-goals for the initial release

- Animal growth, feed conversion, profitability or farm-performance simulation.
- Automatically publishing, manufacturing, certifying or ordering feed.
- Replacing Studio's formulation and version management.
- Inventing nutrition values for missing nutrient data or modifying published targets.
- Supporting species other than pigs and poultry.
- Automatic blending of multiple ingredient quantities behind the user's back.

## 3. Entry and workspace

Users can create an experiment from (a) an eligible featured formulation, (b) an existing saved Studio formulation, or (c) a compatible template. Opening a saved formulation must create a separate working copy; no source record is changed.

The experiment records animal species, programme, phase, energy system, batch mass, available ingredient pool, per-ingredient prices and inclusion rules. The user sees a split workspace on desktop (ingredient editor left, live summary right), and a stacked equivalent on mobile.

Initial tabs/sections:

- **Ingredients:** inclusion controls, roles, prices and mass balance.
- **Nutrients:** live requirement values, deviations and source/data status.
- **Advisories:** existing supplementation, upper-limit and practical advisories.
- **Compare:** baseline versus experimental variants.

Status labels must distinguish **Complete**, **Incomplete**, **Evaluating**, **Meets hard requirements**, **Does not meet hard requirements**, **Unknown data**, and **Error**. The latest result must be marked stale while edits have not yet been evaluated; do not display a green verdict attached to outdated ingredients.

## 4. Ingredient settings — first-class Fixed support

Each ingredient has one canonical inclusion **role** (not a separate overlapping lock system):

| Setting | Meaning | User can change amount directly? | Optimiser may change inclusion? |
|---|---|---|---|
| **Available** | Can be used from zero up to its allowed maximum. | Yes | Yes |
| **Required** | Must appear at or above the configured minimum, within its maximum. | Yes, within limits | Yes, within limits |
| **Fixed** | Must remain at the explicit fixed inclusion percentage. | Only through an intentional **Edit fixed amount** action | **No** |
| **Excluded** | Must have zero inclusion. | No, until role changed | **No** |

### 4.1 Fixed controls

- Every eligible ingredient row exposes a role selector: **Available / Required / Fixed / Excluded**. A lock icon may be a shortcut to **Fixed**, but it must map to the same canonical role rather than a second boolean flag.
- Choosing **Fixed** captures the current exact inclusion percentage as `fixedPct` and displays a visible **Fixed at X%** label. If the current amount is zero, encourage **Excluded** rather than a zero-valued fixed amount.
- Users may intentionally **Edit fixed amount** (enter a new target and confirm), subject to all applicable individual and aggregate inclusion restrictions and available mass. Ordinary slider movements and balancing never change this target.
- Changing **Fixed** back to **Available** or **Required** removes the fixed constraint; where a previous non-fixed role and bounds exist, restore them explicitly and predictably.
- Fixing an ingredient does **not** lock its price. Farmers may still edit prices and see cost impacts without changing quantities.
- A fixed ingredient cannot be designated as an automatic balancing ingredient.
- All fixed inclusion values survive experiment comparison, undo/redo and handoff to Studio.

### 4.2 Manufacturer restrictions

Commercial premixes with mandatory manufacturer doses are **manufacturer-fixed**, not user-unlockable fixed roles. Show the specified inclusion amount and a concise explanation. Farmers can substitute an eligible premix, but cannot alter its manufacturer's dose through role changes, sliders, balancing, manual entry or crafted API requests. Preserve the existing one-premix compatibility rule and restrictions for manufacturer-recipe-only products.

### 4.3 Constraints and impossible fixed selections

- No setting may exceed ingredient or aggregate limits. The stricter applicable bound wins; a user's manual setting cannot override FeedSport constraints.
- If fixed amounts sum to more than 100%, the configuration is invalid and the editor must explain which fixed values caused it.
- Even when fixed amounts sum to no more than 100%, optimisation may be infeasible due to other fixed/required constraints or nutrition. Explain the conflict; do not release fixed amounts automatically or pretend a feasible formulation was found.
- Preserve small inclusions at full computational precision. The displayed rounded number must never silently become the underlying fixed target.

**Example (illustrative):** A farmer fixes maize at 50% and soybean meal at 20% and uses an eligible premix at its published dose. The optimiser may modify only the remaining, eligible, non-fixed ingredients. It must not change maize to 49.8% or soybean meal to 20.3% simply to obtain a cheaper solution.

## 5. Manual adjustment and mass balancing

### 5.1 Editing

For each editable ingredient show name, role, inclusion percent, amount in kg, unit price, line cost and constraints. Use sliders for ordinary inclusions and direct numeric entry for all inclusions, especially microingredients. Precision and step size must accommodate inclusion rates well below 0.1%.

### 5.2 Automatic balancing (initial implementation)

- Auto-balance is optional and visible. The farmer selects **one** eligible, non-fixed balancing ingredient (often maize). Do not select a balancing ingredient silently when one is not clearly suitable.
- When the farmer changes any other adjustable ingredient by +Δ%, change the designated balancing ingredient by −Δ%, and vice versa for a reduction. The balancing ingredient is displayed as automatically controlled until the farmer selects a different balancing ingredient or disables auto-balance.
- Reject the proposed edit with an actionable explanation if the balancing ingredient would cross a minimum/maximum, violate a combined limit, become negative or otherwise make the recipe invalid. Preserve the previously valid percentages. Do **not** silently vary fixed or other non-balancing ingredients.
- Manufacturer-fixed premixes, fixed ingredients and excluded ingredients are not candidates for auto-balancing.

### 5.3 Free editing without auto-balance

When auto-balance is off, the farmer can change any adjustable amount independently. The interface shows the running total and the shortfall/excess against 100% without normalising, inventing filler or certifying a partial mixture.

A fully formed recipe is evaluated against its exact entered amounts and the existing documented rounding tolerance. An incomplete recipe may show known ingredient contributions and provisional spend, **clearly labelled partial**, but must not show a complete-diet nutritional verdict. In particular, do not silently rescale materially incomplete mixes to 100%.

### 5.4 Cost calculation

For each ingredient: `lineCost = batchKg × inclusionPct / 100 × pricePerKg`. Provide total batch cost and cost per tonne for complete mixes. Clearly disclose unpriced ingredients and mark total cost as **incomplete** rather than treating absent prices as zero. Price editing updates cost without changing nutritional content.

## 6. Live nutritional assessment

- Reassess complete, valid recipes automatically after edits, with a target debounce of around 300 ms rather than sending a request for each intermediate slider position.
- Use the existing canonical FeedSport calculation and assessment pipeline and numerical-tolerance rules; avoid client-side “approximate nutrient verdicts.”
- The headline displays formulation cost, batch mass, hard requirements met/total and prominent key nutrients appropriate to the selected phase (e.g., energy, crude protein, SID lysine, calcium, digestible/available phosphorus).
- The detailed nutrient view shows minimum/maximum, calculated value, unit, actual deviation, met/not met, nutrient data status, and supporting ingredient contributions where available.
- Retain the distinction among **hard requirements** (feasibility), **Brazilian Tables Chapter 7 supplementation advisories** (recommendations), and **CFIA reference maximum advisories** (advisory only). Keep established red CFIA exceedances inside Advisories; never turn them into new LP hard constraints through Playground.
- Preserve the current rules for missing values, assumed-zero premix nutrients, unverified user data, nutrient provenance and manufacturer documentation.
- Cancel or ignore older, slower assessments. A response applies only when it matches the current recipe's input signature and catalogue/programme basis.

## 7. Rebalance remaining ingredients

Provide a **Rebalance remaining ingredients** button with an objective selector, initially **Least cost**; other goals may reuse currently supported Studio goals where appropriate.

On request:

1. Freeze all Fixed ingredient inclusion percentages and all manufacturer-mandated premix doses.
2. Preserve Required and Excluded roles, other configured minimums/maximums, combined/family ceilings, phase eligibility and selected ingredient pool.
3. Optimise only eligible degrees of freedom using FeedSport's existing solver and validation pipeline.
4. Present the solution and its assessment **as a proposed variation**, not silently replace the current experiment. The farmer may apply or discard it.
5. If infeasible, show relevant shortfalls/conflicts and leave the current quantities unchanged. Never loosen fixed values, substitute premixes or exclude ingredients without the farmer's explicit consent.

The server must enforce the same constraints even if a client crafts or modifies the request. Numerically exact fixed values must be sent as `minInclusionPct == maxInclusionPct` (or the shared equivalent), not as rounded displayed percentages.

## 8. Baseline, experiments and comparison

- The starting recipe is the immutable **Baseline**.
- Support up to three named temporary variants, e.g., **Experiment A**, **B**, **C**.
- Each variant snapshots the *full reproducible input*: programme/phase, ingredient percentages, roles and fixed targets, constraints, prices, batch size, energy system and nutrition-data basis as available.
- Compare costs, complete/incomplete price coverage, ingredient quantities, key nutrients, hard requirement counts, advisories, data gaps and whether a formulation is complete.
- Show delta from baseline and highlight differences without suggesting that lower cost means nutritionally superior.
- Only directly compare formulations evaluated against the same programme, phase, energy system and consistent reference basis. On changing these, require an explicit reset/new experiment rather than producing misleading deltas.
- Provide **Undo**, **Redo**, **Reset to baseline**, **Duplicate experiment**, **Apply variant**. None may modify the original Studio formulation.

## 9. Transfer to Studio

**Use this in Studio** transfers the selected complete experiment as a **new draft or new version**, with an explicit destination choice where appropriate. The transfer must carry **exact** percentages, ingredient roles (including Fixed), fixed targets, prices, batch size, species, programme, phase and comparison/context metadata where supported.

Revalidate using the canonical server-side rules before storage; show any changed data basis or price assumptions. Do not overwrite the source formulation by default. If the experiment is incomplete or known to fail hard requirements, either block final save or transfer it as an explicitly labelled **draft requiring correction**; never present it as production-ready.

## 10. Technical architecture and reuse

**Confirmed relevant code locations from repository review:**

- `src/components/formulation-studio/engine.ts`: existing `Role = "available" | "required" | "fixed" | "excluded"`, `PoolEntry.fixed`, manual validation and `evaluateManual`.
- `src/components/formulation-studio/studio.tsx`: Studio state, saved versions and comparisons.
- `src/lib/formulation-assessment.ts` and `src/lib/formulation-assessment-model.ts`: canonical hard requirements, supplementation/CFIA advisories and data-status model.
- `src/app/api/feed-formulation/evaluate/route.ts`: existing manual recipe evaluation endpoint.
- `src/app/api/feed-formulation/optimize/route.ts`: existing optimisation endpoint; already accepts min/max inclusion constraints.
- `docs/formulation-assessment.md`: documented numerical tolerances and assessment policy.

**Proposed modules:** `PlaygroundPage`, `usePlayground`, `IngredientWorkbench`, `MassBalanceControl`, `useLiveAssessment`, `PlaygroundSummary`, `PlaygroundComparison`, plus a small shared input/validation layer rather than duplicated implementation.

**Required engineering check:** The current manual `/evaluate` request accepts ingredient IDs and percentages but does not itself accept Studio pool constraints, ingredient price settings or custom premix profiles. Before shipping, ensure Playground evaluation applies the **same pool and fixed-role validation** as Studio and the optimiser, and supports whichever premix data scope Playground exposes. Prefer extracting shared validation over writing a second policy. The optimiser must also honour exact Fixed targets on the server.

Use a unique request signature, debouncing and stale-response protection for live evaluation. Keep experiments client-side/in session by default; no database write until explicit transfer. Avoid unnecessary solver calls: direct ingredient edits trigger assessment, not optimisation. Nutrition metadata and provenance remain authoritative from the existing catalogue and assessment services.

## 11. Accessibility and experience

- Mouse, touch and keyboard editing must all work.
- Every slider has an equivalent precise numeric input with labelled units.
- Clear lock state for Fixed ingredients; icons must not be the only explanation.
- Provide descriptive, non-alarming error messages and aria-live status changes.
- Responsive mobile view; no dependence on hover, horizontal scrolling to reach essential actions, or tiny fixed-percentage controls.
- Expose a visible **Experimental — not a manufacturing instruction** notice without overwhelming the interface.

## 12. Release plan

**Phase 1 — Interactive editing:** Playground page, clone baseline, roles including first-class Fixed, manufacturer immutability, precise editing, optional single-ingredient auto-balance, live costs, live canonical nutritional assessment and validation.

**Phase 2 — Optimisation and comparison:** Rebalance around Fixed constraints, solver-infeasibility explanations, up to three variants, undo/redo and comparison.

**Phase 3 — Studio handoff and hardening:** Explicit transfer of full roles/targets, server revalidation, mobile and accessibility refinements, full QA, observability and performance tuning.

## 13. Acceptance tests

1. A farmer can mark soybean meal **Fixed at 20%** and can see the explicit role and value.
2. Changing maize by a slider with auto-balance enabled never changes soybean meal's fixed 20%.
3. A farmer can edit the *fixed target* only through an intentional action; the new target is visibly confirmed and validated.
4. Switching Fixed back to Available or Required removes the fixed constraint and restores the intended adjustable behaviour.
5. Fixing an ingredient quantity never prevents updating its price; changing a price does not change nutritional values.
6. Manufacturer-mandated premix doses cannot be unlocked or changed through UI input, rebalance calls or crafted API requests.
7. A balancing ingredient cannot be Fixed or Excluded; edits that exceed its valid bounds are refused without silently altering other ingredients.
8. Multiple fixed ingredients exceeding 100%, or otherwise conflicting with nutritional feasibility, yield clear errors and no false valid solution.
9. Automatic balancing maintains a valid 100% mix when feasible; free editing can produce an incomplete mix but never a false complete-diet verdict.
10. Rebalancing preserves *full-precision* fixed amounts exactly to the established numerical tolerance and changes only permitted ingredients.
11. Infeasible optimiser runs do not replace the current experiment or silently relax constraints.
12. A manual Playground recipe and the same recipe in Studio receive the same canonical assessment, including ingredient/family limits and known documentation gaps.
13. Live slider changes ignore out-of-order evaluation responses; verdicts always correspond to the latest quantities.
14. Very small additive inclusions survive editing, fixing, compare, optimisation and transfer without destructive rounding.
15. Missing nutrient documentation is marked unknown; missing ingredient prices never display as zero-cost complete formulations.
16. Chapter 7 and CFIA reference advisories remain in their existing categories and do not unexpectedly become hard constraints.
17. Variants preserve role, fixed target, price and ingredient percentage differences, and the baseline remains unchanged.
18. Cross-phase variants are not compared as if their nutrient requirements were identical.
19. Transfer creates a new Studio draft/version, retaining fixed roles and targets; it does not overwrite the original.
20. Major edit, compare, rebalancing and transfer flows are usable by keyboard and on mobile.

## 14. Definition of done

A farmer can open a pig grower or broiler finisher recipe, **fix** selected ingredients at exact inclusion percentages, adjust another ingredient while FeedSport maintains mass balance, see the cost and canonical nutritional assessment update, rebalance only the unfixed ingredients, compare results against the baseline, and transfer one experiment to a new Studio draft **without modifying the original or circumventing FeedSport constraints**.
