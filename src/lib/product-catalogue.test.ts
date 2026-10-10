import assert from 'node:assert/strict';
import test from 'node:test';
import { feedProducts } from '@/data/feedProductNutrition';
import {
  defaultProductCatalogueFilters,
  filterProducts,
  matchesProductQuery,
  productEmptyState,
  productQuoteHref,
  productsHrefWithQuery,
  productsHrefWithoutFilters,
  type ProductCatalogueFilters,
} from './product-catalogue';

const soybeanMeal = feedProducts.find((product) => product.id === 'soybean-meal');
assert.ok(soybeanMeal);

test('product search matches exact and partial product names', () => {
  assert.equal(matchesProductQuery(soybeanMeal, 'Soybean meal'), true);
  assert.equal(matchesProductQuery(soybeanMeal, 'soybean'), true);
});

test('product search matches database-shaped alternative terms case-insensitively', () => {
  const databaseProduct = { ...soybeanMeal, searchTerms: ['soya', 'SBM'] };
  assert.equal(matchesProductQuery(databaseProduct, 'soya'), true);
  assert.equal(matchesProductQuery(databaseProduct, 'sbm'), true);
  assert.equal(matchesProductQuery(databaseProduct, 'SOYA'), true);
});

test('product search returns no results for an unknown term', () => {
  assert.deepEqual(filterProducts(feedProducts, 'not-a-feed-product', defaultProductCatalogueFilters), []);
});

test('category and availability filters work individually and together', () => {
  const category: ProductCatalogueFilters = { ...defaultProductCatalogueFilters, category: 'Protein feeds' };
  const availability: ProductCatalogueFilters = { ...defaultProductCatalogueFilters, status: 'Limited' };
  const combined: ProductCatalogueFilters = { ...category, status: 'Available to order' };

  assert.deepEqual(filterProducts(feedProducts, '', category).map(({ id }) => id), ['soybean-meal', 'sunflower-meal', 'fish-meal']);
  assert.deepEqual(filterProducts(feedProducts, '', availability).map(({ id }) => id), ['wheat-bran']);
  assert.deepEqual(filterProducts(feedProducts, '', combined).map(({ id }) => id), ['fish-meal']);
});

test('empty states distinguish search, filters, and combined conditions', () => {
  const filtered: ProductCatalogueFilters = { ...defaultProductCatalogueFilters, category: 'Minerals' };
  assert.equal(productEmptyState('maize', defaultProductCatalogueFilters).title, 'Nothing matches “maize” yet');
  assert.equal(productEmptyState('', filtered).title, 'No ingredients match the selected filters.');
  assert.equal(productEmptyState('maize', filtered).title, 'Nothing matches “maize” with the selected filters.');
});

test('clearing search removes q while preserving unrelated parameters', () => {
  assert.equal(productsHrefWithQuery('/products', 'q=soybean', ''), '/products');
  assert.equal(productsHrefWithQuery('/products', 'q=soybean&animal=pigs&campaign=spring', ''), '/products?animal=pigs&campaign=spring');
  assert.equal(productsHrefWithQuery('/products', 'animal=pigs', 'Soya meal'), '/products?animal=pigs&q=Soya+meal');
});

test('clearing filters preserves the search query and unrelated parameters', () => {
  assert.equal(
    productsHrefWithoutFilters('/products', 'q=soya&category=Protein+feeds&animal=pigs&status=Limited&campaign=spring'),
    '/products?q=soya&campaign=spring',
  );
});

test('quotation URLs remain unchanged', () => {
  assert.equal(productQuoteHref('Soybean meal'), 'https://wa.me/263774684534?text=Please%20quote%20Soybean%20meal');
});
