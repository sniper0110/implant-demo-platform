import { test, expect } from '@playwright/test';

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
