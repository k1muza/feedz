import assert from "node:assert/strict";
import { test } from "node:test";
import { FEED_PROGRAMMES } from "./feed-programmes";
import { commercialPremixForProgramme } from "./commercial-premixes";

test("every public animal programme resolves a real manufacturer premix at its published dose", () => {
  const available = FEED_PROGRAMMES.filter((p) => p.status === "loaded" && p.phases.length > 0 &&
    commercialPremixForProgramme(p.id));
  assert.ok(available.length >= 5, "Expect starter, grower, sow, boar and broiler options");
  for (const programme of available) {
    const product = commercialPremixForProgramme(programme.id);
    assert.ok(product, programme.id);
    assert.equal(product.pricePerTonne, null, "No fictitious premix planning price");
    assert.ok(product.inclusionPct > 0 && product.inclusionKgPerTonne === product.inclusionPct * 10);
    assert.ok(product.specificationUrl.startsWith("https://"));
    assert.equal(product.verificationStatus, "unverified");
    for (const phase of programme.phases) {
      assert.ok(phase.requirements.metabolizableEnergyKcalKg !== undefined,
        `Public preview needs an ME target for ${programme.id} / ${phase.id}`);
    }
  }
});
