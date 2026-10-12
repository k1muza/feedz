import { expect, test } from '@playwright/test';

const studioVideo = (page: import('@playwright/test').Page) => page.getByTestId('studio-tour-video');

test('real walkthrough autoplays, pauses offscreen, and preserves manual pause', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/studio-tour');

  const video = studioVideo(page);
  await video.scrollIntoViewIfNeeded();
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('poster', '/videos/studio-walkthrough-poster.jpg');
  await expect(video.locator('source[type="video/webm"]')).toHaveAttribute('src', '/videos/studio-walkthrough.webm');
  await expect(video.locator('source[type="video/mp4"]')).toHaveAttribute('src', '/videos/studio-walkthrough.mp4');

  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(1);
  expect(await video.evaluate((element: HTMLVideoElement) => ({
    duration: element.duration,
    height: element.videoHeight,
    muted: element.muted,
    width: element.videoWidth,
  }))).toEqual({ duration: 36.433, height: 764, muted: true, width: 1600 });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);

  await page.getByRole('button', { name: 'Pause Studio walkthrough' }).click();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await page.locator('footer').scrollIntoViewIfNeeded();
  await video.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);

  await page.getByRole('button', { name: 'Play Studio walkthrough', exact: true }).click();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
  await page.locator('footer').scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);

  await video.evaluate((element: HTMLVideoElement) => { element.currentTime = 10; });
  await page.getByRole('button', { name: 'Replay Studio walkthrough from the beginning' }).click();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeLessThan(2);

  await expect(page.getByRole('link', { name: 'Create a free account' }).first()).toHaveAttribute('href', '/studio/signup');
  await expect(page.getByRole('link', { name: 'Try the quick calculator' })).toHaveAttribute('href', '/formulations');
  await expect(page.getByText('Captured UI')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /demonstration screen/i })).toHaveCount(0);
});

test('reduced motion disables autoplay but still permits user playback', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/studio-tour');

  const video = studioVideo(page);
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(1);
  await page.waitForTimeout(300);
  expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await page.getByRole('button', { name: 'Play Studio walkthrough', exact: true }).click();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
});

test('mobile player keeps the full frame without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/studio-tour');

  const video = studioVideo(page);
  await video.scrollIntoViewIfNeeded();
  await expect(video).toBeVisible();
  const dimensions = await video.evaluate((element: HTMLVideoElement) => {
    const rect = element.getBoundingClientRect();
    return {
      aspectRatio: rect.width / rect.height,
      objectFit: getComputedStyle(element).objectFit,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(dimensions.objectFit).toBe('contain');
  expect(dimensions.aspectRatio).toBeCloseTo(1600 / 764, 2);
  expect(dimensions.overflow).toBe(0);
  await expect(page.getByRole('button', { name: /Studio walkthrough/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replay Studio walkthrough from the beginning' })).toBeVisible();
});

test('ingredient section renders the reusable Studio panel', async ({ page }) => {
  await page.goto('/studio-tour');

  const section = page.getByRole('region', { name: 'Example Studio ingredient pool' });
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByTestId('ingredient-pool-panel')).toBeVisible();
  await expect(section.getByText('Sustar GlyPro X912')).toBeVisible();

  await section.getByRole('button', { name: 'Show all 12 · 5 more available' }).click();
  await expect(section.getByText('L-Threonine')).toBeVisible();
  await section.getByRole('button', { name: 'Show fewer' }).click();
  await expect(section.getByText('L-Threonine')).toHaveCount(0);
});

test('shows direct format links when the video reports a playback failure', async ({ page }) => {
  await page.goto('/studio-tour');

  const video = studioVideo(page);
  await video.scrollIntoViewIfNeeded();
  await video.evaluate((element: HTMLVideoElement) => element.dispatchEvent(new Event('error')));
  const fallback = page.getByRole('alert').filter({ hasText: 'The walkthrough could not play in this browser.' });
  await expect(fallback).toContainText('The walkthrough could not play in this browser.');
  await expect(fallback.getByRole('link', { name: 'MP4 version' })).toHaveAttribute('href', '/videos/studio-walkthrough.mp4');
  await expect(fallback.getByRole('link', { name: 'WebM version' })).toHaveAttribute('href', '/videos/studio-walkthrough.webm');
});
