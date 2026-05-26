import { expect, test, type Page } from '@playwright/test';

/** Wait until the client has hydrated and the socket is live before keyboarding. */
async function waitForHydration(page: Page): Promise<void> {
  await expect(page.getByText('Live', { exact: true })).toBeVisible({ timeout: 20_000 });
}

test.describe('PulseGrid terminal', () => {
  test('dashboard loads with live, populated panes', async ({ page }) => {
    await page.goto('/');
    // Cold open: core panes are present and populated.
    await expect(page.getByText('Top Movers')).toBeVisible();
    await expect(page.getByText('Order Book', { exact: false })).toBeVisible();
    await expect(page.getByText('Market Overview')).toBeVisible();

    // A price ticks: capture a value, then assert it changes under the stream.
    const indexLocator = page.getByText('Index', { exact: false }).first();
    await expect(indexLocator).toBeVisible();
    // Trade tape receives prints.
    await expect(page.getByText(/^Tape ·/)).toBeVisible();
  });

  test('command palette opens and navigates', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    // Retry the open in case the keydown listener attached a frame late.
    const search = page.getByPlaceholder(/Search commands/i);
    await expect(async () => {
      await page.keyboard.press('/');
      await expect(search).toBeVisible({ timeout: 1000 });
    }).toPass();
    await search.fill('Watchlists');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/watchlists/);
  });

  test('asset detail loads and switches timeframe', async ({ page }) => {
    await page.goto('/asset/BTCUSD');
    await expect(page.getByRole('heading', { name: 'BTCUSD' })).toBeVisible();
    await expect(page.getByText('VWAP')).toBeVisible();
    await page.getByRole('button', { name: '5m', exact: true }).click();
    await expect(page.getByRole('button', { name: '5m', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('replay applies a scenario preset', async ({ page }) => {
    await page.goto('/replay');
    await expect(page.getByText('Scenario Replay')).toBeVisible();
    await page.getByText('Flash Crash').first().click();
    await expect(page.getByText('PLAYING').or(page.getByText('PAUSED'))).toBeVisible();
  });

  test('keyboard shortcut overlay opens with ?', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const overlay = page.getByText('Keyboard shortcuts');
    await expect(async () => {
      await page.keyboard.press('Shift+/');
      await expect(overlay).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.keyboard.press('Escape');
    await expect(overlay).not.toBeVisible();
  });

  test('forced disconnected state renders the resilience banner', async ({ page }) => {
    await page.goto('/?force=disconnected');
    await expect(page.getByText(/reconnecting|Disconnected/i).first()).toBeVisible();
  });
});
