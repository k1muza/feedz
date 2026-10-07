# FeedSport MCP Server – Initial Product & Technical Spec

## 1. Overview

FeedSport should expose its feed formulation capabilities through an MCP server so AI agents such as ChatGPT, Claude, and other MCP-compatible clients can formulate and analyse livestock feeds using FeedSport’s existing formulation engine.

The MCP server should act as a thin agent-facing layer over FeedSport’s existing data and formulation logic.

The AI agent should interpret the user’s intent and select the appropriate tools, while FeedSport remains responsible for:

- nutrient requirements;
- ingredient composition;
- ingredient inclusion limits;
- formulation constraints;
- optimization;
- feasibility checking;
- costing;
- result validation.

The language model must not perform the actual formulation calculations itself.

---

## 2. Objective

Allow an AI agent to handle requests such as:

> Formulate the cheapest grower feed for 50–80 kg pigs using maize, soybean meal, wheat bran and premix.

The agent should be able to discover available FeedSport programmes and ingredients, submit a formulation request, and receive a structured, validated result.

---

## 3. Initial Scope

Version 0.1 should be read/computation-only.

No formulations should be saved or user data modified through MCP in the initial version.

Expose the following MCP tools:

### `get_programmes`

Returns livestock feeding programmes available on FeedSport.

Example output:

```json
[
  {
    "id": "pig-grower-50-80",
    "name": "Pig Grower 50–80 kg",
    "species": "pig",
    "source": "PIC"
  }
]
```

---

### `get_programme`

Returns the nutritional requirements and metadata for a specific programme.

Example:

```json
{
  "id": "pig-grower-50-80",
  "name": "Pig Grower 50–80 kg",
  "requirements": {
    "metabolizable_energy": {
      "min": 13.2,
      "unit": "MJ/kg"
    },
    "crude_protein": {
      "min": 17.5,
      "unit": "%"
    },
    "sid_lysine": {
      "min": 0.91,
      "unit": "%"
    }
  },
  "source": "PIC"
}
```

---

### `search_ingredients`

Allows an agent to discover ingredients available in FeedSport.

Filters may include:

- ingredient name;
- category;
- country/market;
- nutrient;
- supplier;
- availability.

Example request:

```json
{
  "query": "wheat bran"
}
```

---

### `get_ingredient`

Returns the FeedSport nutrient profile, price and default inclusion constraints for an ingredient.

Example:

```json
{
  "id": "wheat-bran",
  "name": "Wheat Bran",
  "price_per_tonne": 260,
  "nutrients": {
    "crude_protein": 15.4,
    "metabolizable_energy": 10.8
  },
  "default_constraints": {
    "max_inclusion_percent": 20
  },
  "source": "FeedSport ingredient database"
}
```

---

### `formulate`

Primary formulation tool.

Inputs should include:

```json
{
  "programme_id": "pig-grower-50-80",
  "objective": "least_cost",
  "ingredients": [
    "maize",
    "soybean-meal",
    "wheat-bran",
    "grower-premix"
  ],
  "constraints": {
    "wheat-bran": {
      "max_percent": 15
    }
  }
}
```

FeedSport should translate this into the appropriate GLPK optimization model.

Example result:

```json
{
  "status": "optimal",
  "cost_per_tonne": 381.42,
  "ingredients": [
    {
      "ingredient": "maize",
      "percentage": 63.1
    },
    {
      "ingredient": "soybean-meal",
      "percentage": 20.4
    }
  ],
  "nutritional_profile": {},
  "requirement_comparison": {},
  "programme": {},
  "data_sources": {}
}
```

---

### `analyse_formulation`

Allows an agent to submit an existing formulation and compare it against a FeedSport programme.

Example request:

```json
{
  "programme_id": "pig-grower-50-80",
  "recipe": [
    {
      "ingredient": "maize",
      "percentage": 65
    },
    {
      "ingredient": "soybean-meal",
      "percentage": 25
    },
    {
      "ingredient": "premix",
      "percentage": 10
    }
  ]
}
```

FeedSport should return:

- calculated nutrient profile;
- programme requirements;
- deficiencies;
- excessive nutrients;
- formulation cost;
- whether the formulation passes.

---

## 4. Formulation Behaviour

FeedSport must remain authoritative for formulation decisions.

The MCP layer must not allow an AI agent to silently:

- reduce nutrient minimums;
- exceed nutrient maximums;
- bypass ingredient inclusion constraints;
- invent missing nutrient values;
- alter FeedSport programme requirements;
- treat an infeasible formulation as valid.

If no valid solution exists, FeedSport should return:

```json
{
  "status": "infeasible",
  "issues": [
    {
      "nutrient": "sid_lysine",
      "requirement": 0.91,
      "best_achievable": 0.84
    }
  ]
}
```

Where possible, FeedSport may also return useful diagnostic information such as potentially missing ingredient categories.

---

## 5. Data Provenance

Every formulation result should identify the data used.

For example:

```json
{
  "programme_source": "PIC",
  "programme_version": "2026",
  "ingredient_source": "Brazilian Tables",
  "ingredient_database_version": "2026-10-01",
  "solver": "GLPK"
}
```

This is important because different nutrient databases and feeding programmes may produce different results.

---

## 6. Architecture

```text
AI Agent
   │
   ▼
FeedSport MCP Server
   │
   ▼
FeedSport Application Services
   │
   ├── Programme Service
   ├── Ingredient Service
   ├── Pricing Service
   └── Formulation Service
              │
              ▼
             GLPK
```

The MCP server should reuse the same application services used by the FeedSport web application.

Formulation logic should not be duplicated inside the MCP implementation.

---

## 7. Authentication

The first development version may run without external authentication.

A hosted production MCP service should eventually support FeedSport user/API authentication.

Authentication will later allow:

- rate limiting;
- usage quotas;
- customer-specific prices;
- private ingredients;
- saved formulations;
- subscription plans.

---

## 8. Future Tools

Once the read-only formulation workflow is stable, additional tools may include:

```text
save_formulation
get_saved_formulations
duplicate_formulation
create_formulation_report
calculate_batch
calculate_feed_requirements
compare_formulations
find_alternative_ingredients
optimise_existing_formulation
```

---

## 9. Example Agent Workflow

User:

> I need a cheap grower ration for pigs between 50 and 80 kg. I have maize, soybean meal, wheat bran and premix.

Agent:

```text
1. get_programmes()
2. get_programme("pig-grower-50-80")
3. search_ingredients(...)
4. formulate(...)
```

FeedSport returns the mathematically valid formulation.

The agent then presents the formulation and explains the result to the user.

---

## 10. Success Criteria for v0.1

The proof of concept is successful when an MCP-compatible AI client can:

1. discover available FeedSport programmes;
2. discover FeedSport ingredients;
3. request a formulation using selected ingredients;
4. receive a valid GLPK-generated ration;
5. inspect its nutritional profile;
6. receive a clear infeasible response when no valid formulation exists.

The initial goal is not to build a conversational nutritionist inside FeedSport.

The goal is to make the existing FeedSport formulation engine safely usable by AI agents.
---

## 11. Diagnostics Layer (v0.2)

`formulate` returns *what* the solver chose. The diagnostics tools let an agent ask FeedSport *why* and *what if*, instead of guessing from the numbers:

> Why isn't wheat bran being selected?
>
> What ingredient would make this ration cheaper?

All diagnostics tools take the same inputs as `formulate` (`programme_id`, `ingredients`, `constraints`, `energy_system`) and remain read-only.

### Method

- **Marginal answers come from the LP itself.** GLPK row duals give each requirement's shadow price; reduced costs (price minus the shadow value of what an ingredient supplies) tell how far an ingredient's price is from break-even.
- **Actual effects are confirmed by re-solving.** Any reported saving, fix or scenario outcome comes from solving the modified formulation, not from extrapolating duals.
- **Requirements are never relaxed.** Diagnostics may change prices, ingredients or the request's own inclusion limits, but FeedSport requirements and default inclusion limits stay in force.
- Every result includes `findings`: short plain-language statements generated from the solver output, which agents should quote rather than paraphrase.

### `explain_formulation`

Explains the least-cost solution:

- limiting (binding) nutrients, ranked by cost, with the cost of tightening each by one unit and by 1%;
- for each selected ingredient, its share of each limiting nutrient;
- for each ingredient held at a limit, the saving per 1% the limit is moved;
- for each excluded ingredient, the price gap, the entry price below which it would be selected, and the cost of forcing 1% in.

`ingredients_to_explain` focuses the findings and may name ingredients that were not offered; those are priced against the solution without being added.

Example finding:

> Wheat bran is not selected: at $300.00/t it is $225.02/t too expensive for the nutrients it supplies, so it would only enter below $74.98/t. Forcing 1% in would add about $2.25/t.

### `diagnose_infeasibility`

Determines why no solution exists:

- inclusion-limit conflicts (minimums above 100%, maximums below 100%);
- requirements no blend of the ingredients can reach within their limits, with the best achievable value;
- a minimal set of requirements that cannot be met together (deletion filter over the requirement set);
- the closest achievable diet's remaining shortfalls;
- confirmed fixes: single priced FeedSport ingredients to add, otherwise a small sufficient set; or removing the request's own limits.

`candidate_ingredients` restricts which ingredients are tried as fixes.

### `run_sensitivity_analysis`

Re-solves the formulation under explicit `scenarios` (each a set of price or inclusion-limit changes), or by default varies each ingredient's price by `price_steps_percent` (±10%). Reports cost change, recipe shifts and nutrients that become or stop being limiting.

### `find_ingredient_opportunities`

Prices every candidate ingredient (default: all priced FeedSport ingredients not already listed) against the current shadow prices, then re-solves with each one that would enter. Returns the limiting nutrients, confirmed savings, inclusion, what each candidate displaces and which nutrients make it valuable, plus near misses with the price at which they would become worthwhile.

Example finding:

> The most limiting nutrient is Metabolizable energy, followed by SID lysine and SID methionine + cysteine.
> Introducing Lysine-HCl at $2400.00/t (0.14% inclusion) lowers cost by $6.88/t to $457.50/t, mainly as a source of SID lysine; it reduces Soybean meal 29.2% → 25.0%.

FeedSport optimizes cost against fixed requirements; animal-performance effects are not modelled.

### `compare_formulation_strategies`

Side-by-side cost, ingredient count, soybean-meal inclusion, binding requirements and recipe for:

- least cost;
- simpler recipe, lower soy and lower imports (each within 3% of least cost);
- without the request's own inclusion limits (when any were given);
- forced-ingredient variants (`force_ingredients`);
- other programmes, e.g. a high-performance phase (`compare_programme_ids`).
