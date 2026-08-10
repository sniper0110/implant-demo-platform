import { test, expect } from '@playwright/test';

test('section embed fixture mounts iframe', async ({ page }) => {
  await page.goto('/tests/fixtures/section-embed.html');
  await expect(page.locator('[data-pycad-embed]')).toBeVisible();
  await expect(page.locator('iframe[title="PYCAD Interactive Implant Demo"]')).toBeVisible({
    timeout: 30_000,
  });
});

test('full layout fixture uses larger min height', async ({ page }) => {
  await page.goto('/tests/fixtures/full-embed.html');
  const container = page.locator('[data-pycad-embed]');
  await expect(container).toBeVisible();
  const minHeight = await container.evaluate((node) => getComputedStyle(node).minHeight);
  expect(parseInt(minHeight, 10)).toBeGreaterThanOrEqual(720);
});
