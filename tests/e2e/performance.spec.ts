import { test, expect } from '@playwright/test';

const FAST_3G = {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 150,
};

async function emulateFast3G(page: import('@playwright/test').Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', FAST_3G);
}

test('embed loader stays under 10KB gzip', async ({ request }) => {
  const response = await request.get('/embed/v1.js');
  expect(response.ok()).toBeTruthy();
  const buffer = await response.body();
  expect(buffer.byteLength).toBeLessThan(10 * 1024);
});

test('config endpoint returns staging embed', async ({ request }) => {
  const response = await request.get('/api/config/emb_pycad_staging');
  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  expect(json.embedId).toBe('emb_pycad_staging');
  expect(json.layout).toBe('section');
});

test('initial shell loads before model fetch', async ({ page }) => {
  await page.goto('/e/emb_pycad_staging?layout=section');
  await expect(page.locator('.embed-app, .app')).toBeVisible({ timeout: 15_000 });
  const canvas = page.locator('.scene-canvas');
  await expect(canvas).toBeVisible({ timeout: 60_000 });
});

test('shell paints within 3s on Fast 3G', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Network throttling uses CDP on Chromium only');
  await emulateFast3G(page);
  const started = Date.now();
  await page.goto('/e/emb_pycad_staging?layout=section', { waitUntil: 'commit' });
  const shell = page.locator('.app-header, .embed-loading-progress, #root [role="status"]');
  await expect(shell.first()).toBeVisible({ timeout: 5_000 });
  expect(Date.now() - started).toBeLessThan(3_000);
});

test('canvas paints after shell on Fast 3G', async ({ page, browserName }) => {
  test.setTimeout(120_000);
  test.skip(browserName !== 'chromium', 'Network throttling uses CDP on Chromium only');
  await emulateFast3G(page);
  await page.goto('/e/emb_pycad_staging?layout=section');
  await expect(page.locator('.app-header, .embed-loading-progress').first()).toBeVisible({
    timeout: 5_000,
  });
  await expect(page.locator('.scene-canvas canvas')).toBeVisible({ timeout: 90_000 });
});
