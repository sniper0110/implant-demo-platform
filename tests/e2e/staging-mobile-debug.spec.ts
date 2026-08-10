import { test, expect, devices } from '@playwright/test';

const STAGING = 'https://implant-demo.pycad.co';

test.use({ ...devices['Pixel 5'] });

test('staging embed loads model on mobile after CSP fix', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const response = await page.goto(`${STAGING}/e/emb_pycad_staging?layout=section`, {
    waitUntil: 'networkidle',
    timeout: 120_000,
  });

  const csp = response?.headers()['content-security-policy'] ?? '';
  expect(csp).toContain('wasm-unsafe-eval');

  await expect(page.locator('.scene-canvas canvas')).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(8000);

  const wasmErrors = consoleErrors.filter((line) => line.includes('WebAssembly') || line.includes('Could not load'));
  expect(wasmErrors).toEqual([]);
});
