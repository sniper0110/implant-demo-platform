import { test, expect } from '@playwright/test';

test('section embed fixture mounts iframe', async ({ page }) => {
  await page.goto('/tests/fixtures/section-embed.html');
  await expect(page.locator('[data-pycad-embed]')).toBeVisible();
  await expect(page.locator('iframe[title="PYCAD Interactive Implant Demo"]')).toBeVisible({
    timeout: 30_000,
  });
});

test('section embed loads iframe on mobile without user interaction', async ({ page, browserName }) => {
  test.setTimeout(60_000);
  test.skip(browserName !== 'chromium', 'Mobile project uses Chromium device emulation');

  const embedResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/e/emb_pycad_staging') && response.ok(),
    { timeout: 30_000 },
  );
  await page.goto('/tests/fixtures/section-embed.html');
  const embedResponse = await embedResponsePromise;
  expect(embedResponse.ok()).toBeTruthy();

  const iframe = page.locator('iframe[title="PYCAD Interactive Implant Demo"]');
  await expect(iframe).toBeVisible({ timeout: 10_000 });
  await expect(iframe).toHaveAttribute('src', /emb_pycad_staging/);
  await expect(iframe).not.toHaveAttribute('loading', 'lazy');
  await expect(page.locator('.pycad-embed-placeholder')).toBeHidden({ timeout: 30_000 });
});

test('full layout fixture uses larger min height', async ({ page }) => {
  await page.goto('/tests/fixtures/full-embed.html');
  const container = page.locator('[data-pycad-embed]');
  await expect(container).toBeVisible();
  const minHeight = await container.evaluate((node) => getComputedStyle(node).minHeight);
  expect(parseInt(minHeight, 10)).toBeGreaterThanOrEqual(720);
});
