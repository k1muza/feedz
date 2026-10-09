/**
 * Article ingredient links are editorial product references, not feed-formulation
 * ingredient ids. Retiring a product must not block otherwise valid article edits.
 * An obsolete link is dropped during save; the migration cleans stored articles.
 */
export const RETIRED_ARTICLE_PRODUCT_IDS = ["premix"] as const;

export function normalizeArticleProductReferences(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.filter((id) => !RETIRED_ARTICLE_PRODUCT_IDS.some((retired) => retired === id));
}
