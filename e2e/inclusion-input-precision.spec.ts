import { expect, test, type Page } from '@playwright/test';

import { INCLUSION_INPUT_PROPS } from '../src/lib/inclusion-input';

// Native browser validation of the attributes every Studio inclusion % input
// spreads (manual amounts, minimum/fixed, maximum, reusable-list rules). The
// Studio screens need a signed-in Supabase session, which this suite runs
// without, so the inputs are rendered here with exactly those attributes.

const attributes = (props: Record<string, string | number>) =>
  Object.entries(props).map(([name, value]) => `${name === 'inputMode' ? 'inputmode' : name}="${value}"`).join(' ');

async function nativeValidity(page: Page, props: Record<string, string | number>, values: string[]) {
  await page.setContent(`<form>${values.map((_, i) => `<input id="v${i}" ${attributes(props)}>`).join('')}</form>`);
  const results: Record<string, { valid: boolean; stepMismatch: boolean; rangeUnderflow: boolean; rangeOverflow: boolean; message: string }> = {};
  for (const [i, value] of values.entries()) {
    const input = page.locator(`#v${i}`);
    await input.fill(value);
    results[value] = await input.evaluate((element: HTMLInputElement) => ({
      valid: element.validity.valid,
      stepMismatch: element.validity.stepMismatch,
      rangeUnderflow: element.validity.rangeUnderflow,
      rangeOverflow: element.validity.rangeOverflow,
      message: element.validationMessage,
    }));
  }
  return results;
}

test.describe('ingredient inclusion % inputs', () => {
  test('the old step="0.1" reproduces the reported Chrome error', async ({ page }) => {
    const results = await nativeValidity(page, { type: 'number', step: '0.1', min: 0, max: 100 }, ['63.85', '2.23', '25.00']);
    expect(results['63.85'].stepMismatch).toBe(true);
    expect(results['63.85'].message).toContain('63.8');
    expect(results['2.23'].stepMismatch).toBe(true);
    expect(results['25.00'].valid).toBe(true);
  });

  test('every application-generated or typed inclusion is natively valid', async ({ page }) => {
    // Saved QA amounts, small crystalline amino acids, the fixed premix and full-precision optimiser values.
    const values = ['63.85', '2.23', '25.00', '0.05', '3.20', '3.2', '0.00018', '0.150653585115847', '2.7693', '0', '100'];
    const results = await nativeValidity(page, INCLUSION_INPUT_PROPS, values);
    for (const value of values) expect(results[value], value).toMatchObject({ valid: true, stepMismatch: false });
  });

  test('negative and above-100% amounts are natively invalid, matching the application', async ({ page }) => {
    const results = await nativeValidity(page, INCLUSION_INPUT_PROPS, ['-0.5', '100.01']);
    expect(results['-0.5']).toMatchObject({ valid: false, rangeUnderflow: true });
    expect(results['100.01']).toMatchObject({ valid: false, rangeOverflow: true });
  });
});
