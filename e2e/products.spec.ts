import { expect, test } from '@playwright/test';

const catalogue = (page: import('@playwright/test').Page) => page.getByRole('main');
const catalogueSearch = (page: import('@playwright/test').Page) => catalogue(page).getByRole('search').getByRole('textbox');

test.beforeEach(async ({ page }) => {
  await page.route('https://images.unsplash.com/**', (route) => route.abort());
});

test('alternative search is case-insensitive and survives refresh', async ({ page }) => {
  await page.goto('/products?q=SOYA');

  await expect(catalogueSearch(page)).toHaveValue('SOYA');
  await expect(catalogue(page).getByRole('heading', { name: 'Soybean meal', exact: true })).toBeVisible();
  await expect(catalogue(page).getByText('1 ingredient', { exact: true })).toBeVisible();

  await page.reload();
  await expect(catalogueSearch(page)).toHaveValue('SOYA');
  await expect(catalogue(page).getByRole('heading', { name: 'Soybean meal', exact: true })).toBeVisible();
});

test('clear search preserves parameters and browser history restores search state', async ({ page }) => {
  await page.goto('/products?q=soya&campaign=spring');
  await catalogue(page).getByRole('button', { name: 'Clear search' }).click();

  await expect(page).toHaveURL('/products?campaign=spring');
  await expect(catalogueSearch(page)).toHaveValue('');
  await expect(catalogue(page).getByText('9 ingredients', { exact: true })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL('/products?q=soya&campaign=spring');
  await expect(catalogueSearch(page)).toHaveValue('soya');
  await expect(catalogue(page).getByText('1 ingredient', { exact: true })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL('/products?campaign=spring');
  await expect(catalogueSearch(page)).toHaveValue('');
  await expect(catalogue(page).getByText('9 ingredients', { exact: true })).toBeVisible();
});

test('submitting a partial search updates the URL and no-match state', async ({ page }) => {
  await page.goto('/products?campaign=spring');
  await catalogueSearch(page).fill('bean');
  await catalogueSearch(page).press('Enter');

  await expect(page).toHaveURL('/products?campaign=spring&q=bean');
  await expect(catalogue(page).getByRole('heading', { name: 'Soybean meal', exact: true })).toBeVisible();

  await catalogueSearch(page).fill('unknown ingredient');
  await catalogueSearch(page).press('Enter');
  await expect(catalogue(page).getByRole('heading', { name: 'Nothing matches “unknown ingredient” yet' })).toBeVisible();
});

test('filter empty states distinguish filters from combined search and preserve q when cleared', async ({ page }) => {
  await page.goto('/products');
  await catalogue(page).getByRole('button', { name: /^Energy feeds/ }).click();
  await catalogue(page).getByRole('button', { name: 'Limited', exact: true }).click();
  await expect(catalogue(page).getByRole('heading', { name: 'No ingredients match the selected filters.' })).toBeVisible();

  await catalogue(page).getByRole('button', { name: 'Clear filters' }).click();
  await expect(catalogue(page).getByText('9 ingredients', { exact: true })).toBeVisible();

  await page.goto('/products?q=soybean');
  await catalogue(page).getByRole('button', { name: /^Energy feeds/ }).click();
  await expect(catalogue(page).getByRole('heading', { name: 'Nothing matches “soybean” with the selected filters.' })).toBeVisible();
  await catalogue(page).getByRole('button', { name: 'Clear filters' }).click();
  await expect(page).toHaveURL('/products?q=soybean');
  await expect(catalogueSearch(page)).toHaveValue('soybean');
  await expect(catalogue(page).getByRole('heading', { name: 'Soybean meal', exact: true })).toBeVisible();
});

test('category and availability filters combine without changing quote links', async ({ page }) => {
  await page.goto('/products');
  await catalogue(page).getByRole('button', { name: /^Protein feeds/ }).click();
  await expect(catalogue(page).getByText('3 ingredients', { exact: true })).toBeVisible();
  await catalogue(page).getByRole('button', { name: 'Available to order', exact: true }).click();
  await expect(catalogue(page).getByText('1 ingredient', { exact: true })).toBeVisible();
  await expect(catalogue(page).getByRole('heading', { name: 'Fish meal', exact: true })).toBeVisible();

  await catalogue(page).getByRole('button', { name: /^All 9$/ }).click();
  await catalogue(page).getByRole('button', { name: 'Any', exact: true }).click();
  const soybeanCard = catalogue(page).locator('article').filter({ has: page.getByRole('heading', { name: 'Soybean meal', exact: true }) });
  await expect(soybeanCard.getByRole('link', { name: 'Quote' })).toHaveAttribute('href', 'https://wa.me/263774684534?text=Please%20quote%20Soybean%20meal');
});

test('mobile header search overlay submits into the catalogue', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Search ingredients', exact: true }).click();
  const mobileSearch = page.getByRole('search').getByRole('searchbox', { name: 'Search feed ingredients' });
  await expect(mobileSearch).toBeFocused();
  await mobileSearch.fill('soya');
  await page.getByRole('search').getByRole('button', { name: 'Search', exact: true }).click();

  await expect(page).toHaveURL('/products?q=soya');
  await expect(catalogue(page).getByRole('heading', { name: 'Soybean meal', exact: true })).toBeVisible();
});

test('manifest favicon references the existing asset', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).icons).toEqual([
    { src: '/favicon.webp', sizes: 'any', type: 'image/webp' },
  ]);
  expect((await request.get('/favicon.webp')).ok()).toBe(true);
});
