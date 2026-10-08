import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { poolEntryFromListItem } from "@/components/formulation-studio/engine";

import { ingredientRuleUpdate, type IngredientListItemRuleInput } from "./ingredient-lists";

const cases: Array<{
  rule: IngredientListItemRuleInput;
  row: { role: string; min_pct: number | null; max_pct: number | null; fixed_pct: number | null };
  pool: Record<string, unknown>;
}> = [
  { rule: { role: "available", maxPct: 24 }, row: { role: "available", min_pct: null, max_pct: 24, fixed_pct: null }, pool: { role: "available", price: 310, max: 24 } },
  { rule: { role: "required", minPct: 8, maxPct: 20 }, row: { role: "required", min_pct: 8, max_pct: 20, fixed_pct: null }, pool: { role: "required", price: 310, min: 8, max: 20 } },
  { rule: { role: "fixed", fixedPct: 5 }, row: { role: "fixed", min_pct: null, max_pct: null, fixed_pct: 5 }, pool: { role: "fixed", price: 310, fixed: 5 } },
  { rule: { role: "excluded" }, row: { role: "excluded", min_pct: null, max_pct: null, fixed_pct: null }, pool: { role: "excluded", price: 310 } },
];

describe("reusable ingredient rules", () => {
  for (const entry of cases) {
    test(`persists and restores ${entry.rule.role}`, () => {
      assert.deepEqual(ingredientRuleUpdate(entry.rule), entry.row);
      assert.deepEqual(
        poolEntryFromListItem({
          role: entry.row.role as IngredientListItemRuleInput["role"],
          price: 310,
          minPct: entry.row.min_pct,
          maxPct: entry.row.max_pct,
          fixedPct: entry.row.fixed_pct,
        }),
        entry.pool,
      );
    });
  }
});
