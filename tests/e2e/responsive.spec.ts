import { test, expect } from '@playwright/test';

test.describe('responsive embed', () => {
  test('mobile viewport shows scene controls without rod copy', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/e/emb_pycad_staging?layout=section');
    await expect(page.locator('.scene-area')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Scene Controls' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Measurements')).toHaveCount(0);
    await expect(page.getByText(/rod/i)).toHaveCount(0);
  });

  test('embed reports content height on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/e/emb_pycad_staging?layout=section');
    await page.waitForSelector('.embed-app', { timeout: 30_000 });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(height).toBeGreaterThan(600);
  });
});
