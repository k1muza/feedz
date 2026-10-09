import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  COMMERCIAL_PREMIXES,
  commercialPremixById,
  commercialPremixCompatibleWithProgramme,
  commercialPremixForProgramme,
} from "./commercial-premixes";

describe("Sustar commercial premix catalogue", () => {
  test("all entries are identifiable and unverified, with no invented prices", () => {
    assert.equal(COMMERCIAL_PREMIXES.length, 5);
    assert.equal(new Set(COMMERCIAL_PREMIXES.map((product) => product.id)).size, 5);
    for (const product of COMMERCIAL_PREMIXES) {
      assert.equal(product.manufacturer, "Chengdu Sustar Feed");
      assert.equal(product.verificationStatus, "unverified");
      assert.equal(product.formulationCompatibility, "unconfirmed");
      assert.equal(product.pricePerTonne, null);
      assert.ok(product.specificationUrl.startsWith("https://www.sustarfeed.com/"));
      assert.ok(product.inclusionPct > 0 && product.inclusionKgPerTonne > 0);
      assert.deepEqual(commercialPremixById(product.id), product);
    }
  });

  test("selects the stage-specific commercial product, never one universal premix", () => {
    const phases: Record<string, string> = {
      "nursery-pig": "X911",
      "grow-finish-pig": "X912",
      "gestating-gilt-sow": "X913",
      "lactating-gilt-sow": "X913",
      "broiler-standard": "X812",
      "layer-standard": "X811",
    };
    for (const [programme, sku] of Object.entries(phases)) {
      const selected = commercialPremixForProgramme(programme);
      assert.equal(selected?.sku, `GlyPro ${sku}`);
      assert.ok(selected && commercialPremixCompatibleWithProgramme(selected, programme));
    }
    assert.equal(commercialPremixForProgramme("cattle-growth"), undefined);
  });

  test("does not substitute a broiler product for layers or pigs", () => {
    const broiler = commercialPremixById("sustar-glypro-x812");
    assert.ok(broiler);
    assert.equal(commercialPremixCompatibleWithProgramme(broiler, "layer-standard"), false);
    assert.equal(commercialPremixCompatibleWithProgramme(broiler, "grow-finish-pig"), false);
  });
});
