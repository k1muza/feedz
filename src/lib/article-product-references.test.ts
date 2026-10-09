import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import { feedProductCatalog } from "@/data/feedProducts";
import { knowledgeArticles } from "@/data/knowledgeArticles";
import { normalizeArticleProductReferences } from "./article-product-references";

describe("article product references after theoretical premix retirement", () => {
  test("existing articles only link currently valid editorial catalogue product IDs", () => {
    const ids = new Set(feedProductCatalog.map((product) => product.id));
    for (const article of knowledgeArticles) {
      for (const id of article.ingredients) {
        assert.ok(ids.has(id), `Invalid product ID ${id} in article ${article.slug}`);
      }
      assert.ok(!article.body.includes("/products/premix"), `Stale article product link: ${article.slug}`);
    }
  });

  test("normalizes the legacy premix reference without changing valid product links", () => {
    assert.deepEqual(
      normalizeArticleProductReferences(["soybean-meal", "premix", "lysine"]),
      ["soybean-meal", "lysine"],
    );
    assert.deepEqual(normalizeArticleProductReferences(["premix"]), []);
    assert.equal(normalizeArticleProductReferences(undefined), undefined);
  });

  test("generated SQL seed has no broken premix product references", () => {
    const seed = readFileSync("supabase/seed.sql", "utf8");
    assert.doesNotMatch(seed, /['"]premix['"]/);
    assert.doesNotMatch(seed, /\/products\/premix\b/);
  });
});
