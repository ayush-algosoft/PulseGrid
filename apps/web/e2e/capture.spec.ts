import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { expect, test } from '@playwright/test';

// Screenshot capture for the README. Run on demand:
//   CAPTURE=1 pnpm --filter @pulsegrid/web exec playwright test capture
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/screenshots');

test.describe('capture', () => {
  test.skip(!process.env.CAPTURE, 'set CAPTURE=1 to capture screenshots');

  test('capture key screens', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2500); // let the stream populate panes
    await expect(page.getByText('Top Movers')).toBeVisible();
    await page.screenshot({ path: path.join(OUT, 'dashboard.png'), fullPage: false });

    await page.goto('/asset/NVDA');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, 'asset-detail.png'), fullPage: false });

    await page.goto('/replay');
    await page.getByText('Flash Crash').first().click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, 'replay.png'), fullPage: false });

    await page.goto('/activity');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, 'activity.png'), fullPage: false });
  });
});
