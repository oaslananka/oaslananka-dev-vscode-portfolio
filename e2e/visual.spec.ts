import { expect, test } from '@playwright/test';

const stableConsent = JSON.stringify({
  choice: 'essential',
  updatedAt: '2026-07-26T00:00:00.000Z',
  version: 1,
});

test.beforeEach(async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Visual baselines use Chromium only.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(
    ({ consent }) => {
      localStorage.setItem('theme', 'github-dark');
      localStorage.setItem('oaslananka:privacy-consent', consent);
    },
    { consent: stableConsent },
  );
});

test('homepage desktop visual baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('homepage-desktop.png', { fullPage: true });
});

test('homepage mobile visual baseline', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('homepage-mobile.png', { fullPage: true });
});

test('command palette visual baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open Command Palette' }).click();
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog.locator(':scope > div')).toHaveScreenshot('command-palette.png');
});

test('terminal visual baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Toggle terminal' }).click();
  await expect(page.getByRole('region', { name: 'Interactive terminal' })).toHaveScreenshot(
    'terminal.png',
  );
});
