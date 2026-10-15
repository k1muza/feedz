import { expect, test, type Locator, type Page } from '@playwright/test';

// Regression checks for the public-site UI review: CTA hover contrast, arrow wrapping,
// footer links under the fixed dock, and a single brand mark.

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
];

test.beforeEach(async ({ page }) => {
  await page.route('https://images.unsplash.com/**', (route) => route.abort());
});

/** WCAG contrast ratio between an element's computed text colour and its background (walking up to the first opaque one). */
async function contrast(locator: Locator) {
  return locator.evaluate((element) => {
    const parse = (value: string) => (value.match(/[\d.]+/g) ?? []).map(Number);
    const luminance = ([r, g, b]: number[]) => {
      const channel = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    let node: Element | null = element;
    let background = [255, 255, 255];
    while (node) {
      const rgba = parse(getComputedStyle(node).backgroundColor);
      if (rgba.length === 3 || (rgba.length === 4 && rgba[3] === 1)) { background = rgba.slice(0, 3); break; }
      node = node.parentElement;
    }
    const [a, b] = [luminance(parse(getComputedStyle(element).color)), luminance(background)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}

/** Contrast of a link and its arrow at rest, on hover, on keyboard focus and while pressed. */
async function expectReadableInAllStates(page: Page, link: Locator, arrow: Locator) {
  const check = async (state: string) => {
    expect(await contrast(link), `${state} text`).toBeGreaterThanOrEqual(4.5);
    expect(await contrast(arrow), `${state} arrow`).toBeGreaterThanOrEqual(4.5);
  };
  await check('default');
  await link.hover();
  await page.waitForTimeout(250); // let the colour transition finish
  await check('hover');
  await page.mouse.move(0, 0);
  await link.focus();
  await check('focus');
  await link.hover();
  await page.mouse.down();
  await page.waitForTimeout(250);
  await check('active');
  await page.mouse.up();
}

test('hero primary CTA stays readable in every interaction state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const cta = page.locator('a.fs-button-primary[href="/products"]');
  // Stop navigation so the pressed state can be measured.
  await cta.evaluate((element) => element.addEventListener('click', (event) => event.preventDefault()));
  await expectReadableInAllStates(page, cta, cta.locator('span'));
});

test('featured product CTA text and arrow stay readable in every interaction state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const cta = page.getByRole('main').getByRole('link', { name: /View full specification/ });
  await cta.evaluate((element) => element.addEventListener('click', (event) => event.preventDefault()));
  await expectReadableInAllStates(page, cta, cta.locator('span'));
});

test('audience navigation arrows stay on the same line as the last word', async ({ page }) => {
  await page.goto('/');
  const labels = page.getByRole('main').getByRole('link', { name: /Start with your animal|Compare specs and MOQ|Check a formulation/ });
  await expect(labels).toHaveCount(3);

  for (let width = 320; width <= 1440; width += 20) {
    await page.setViewportSize({ width, height: 900 });
    const misplaced = await labels.evaluateAll((links) => links.flatMap((link) => {
      const copy = link.querySelector('span:last-child')!;
      const arrow = copy.querySelector('[aria-hidden="true"]')!;
      const text = copy.firstChild as Text;
      const lastWordStart = text.data.trimEnd().lastIndexOf(' ') + 1;
      const range = document.createRange();
      range.setStart(text, lastWordStart);
      range.setEnd(text, text.data.trimEnd().length);
      const word = [...range.getClientRects()].at(-1)!;
      const arrowBox = arrow.getBoundingClientRect();
      return Math.abs(word.top - arrowBox.top) > 2 ? [text.data.trim()] : [];
    }));
    expect(misplaced, `arrows wrapped alone at ${width}px`).toEqual([]);
  }
});

for (const viewport of VIEWPORTS) {
  test(`footer links are not covered by the fixed dock (${viewport.name})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));

    const footerLinks = page.locator('footer a');
    expect(await footerLinks.count()).toBeGreaterThan(10);
    const covered = await footerLinks.evaluateAll((links) => links.flatMap((link) => {
      // Centre each link; links in the last screenful end up at maximum scroll, where the dock sits over them.
      link.scrollIntoView({ block: 'center', behavior: 'instant' });
      const box = link.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return hit && link.contains(hit) ? [] : [`${link.textContent?.trim()} (under ${hit?.tagName.toLowerCase()}.${hit?.className})`];
    }));
    expect(covered).toEqual([]);

    // The legal links are the ones the review found hidden; click through to prove they work.
    await page.getByRole('contentinfo').getByRole('link', { name: 'Terms', exact: true }).click();
    await expect(page).toHaveURL(/\/terms-of-service$/);
  });

  test(`homepage has no horizontal overflow (${viewport.name})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('expanded chat panel fits inside a short desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 520 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask FeedSport' }).click();
  const panel = page.getByRole('complementary', { name: 'Ask FeedSport' });
  await expect(panel).toBeVisible();
  await page.waitForTimeout(400); // entry animation
  const box = (await panel.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(520);
});

test('header and footer use the same brand mark', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const mark = (scope: Locator) => scope.locator('span[aria-hidden="true"]').first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { transform: style.transform, background: style.backgroundColor, radius: style.borderRadius };
  });
  const header = await mark(page.getByRole('link', { name: 'FeedSport home' }));
  const footer = await mark(page.getByRole('contentinfo').getByRole('link', { name: 'FeedSport' }).first());
  expect(header).toEqual(footer);
  expect(header.background).toBe('rgb(217, 154, 43)');
});
