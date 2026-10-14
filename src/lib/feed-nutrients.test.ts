import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FEED_NUTRIENTS } from "./feed-nutrients";
import { feedProgrammePhaseById } from "./feed-programmes";
import { buildConstraintSpecs } from "./feed-optimizer";

describe("FEED_NUTRIENTS", () => {
  it("has unique ids", () => {
    const ids = FEED_NUTRIENTS.map((n) => n.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("links each nutrient to a constraint the optimiser builds", () => {
    const phase = feedProgrammePhaseById("grow-finish-pig", "br2024-5-43-63-91d-26-47kg")!;
    const built = new Set([...buildConstraintSpecs(phase, "ME"), ...buildConstraintSpecs(phase, "NE")].map((spec) => spec.id));
    for (const n of FEED_NUTRIENTS) if (n.constraintId) assert.ok(built.has(n.constraintId), n.id + " → " + n.constraintId);
  });

});
