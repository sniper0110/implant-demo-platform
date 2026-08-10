import { test, expect } from '@playwright/test';

test('standalone app renders header and scene area', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.app-header')).toBeVisible();
  await expect(page.locator('.scene-area')).toBeVisible();
});

test('embed route serves iframe shell', async ({ page }) => {
  await page.goto('/e/emb_pycad_staging');
  await expect(page.locator('.embed-app, .app')).toBeVisible({ timeout: 30_000 });
});

test('loader script is served', async ({ request }) => {
  const response = await request.get('/embed/v1.js');
  expect(response.ok()).toBeTruthy();
  const body = await response.text();
  expect(body.length).toBeGreaterThan(100);
});
