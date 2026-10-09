-- Editorial article ingredient ids refer to products, not formulation ingredients.
-- The retired synthetic product id 'premix' must not make editing articles fail.
-- Keep the article's premix discussion; send old product links to the
-- premixes-and-additives category rather than a nonexistent product page.
UPDATE public.articles
SET
  ingredients = array_remove(ingredients, 'premix'),
  body = replace(body, '/products/premix', '/products/categories/premixes-additives')
WHERE
  'premix' = ANY(ingredients)
  OR body LIKE '%/products/premix%';
