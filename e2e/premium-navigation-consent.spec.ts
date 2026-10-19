import { expect, test } from '@playwright/test';

test('mobile primary navigation exposes readable labels and remains touch-friendly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main pages' });

  for (const label of ['Home', 'Projects', 'Articles', 'Contact']) {
    const link = nav.getByRole('link', { name: label });
    await expect(link).toBeVisible();
    const bounds = await link.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }

  await expect(nav.getByRole('link', { name: 'Projects' }).locator('span')).toBeVisible();
  await nav.getByRole('link', { name: 'Projects' }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(nav.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewport);
});

test('desktop privacy choice is compact, accessible, and preserves essential-only behavior', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'Privacy choices' });
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds?.height).toBeLessThan(130);
  await expect(panel.getByRole('button', { name: 'Essential only' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Allow analytics' })).toBeVisible();
  await panel.getByRole('button', { name: 'Essential only' }).click();
  await expect(panel).toBeHidden();
  await page.reload();
  await expect(panel).toBeHidden();
});

test('consent panel clears mobile navigation and remains compact', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'Privacy choices' });
  await expect(panel).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Main pages' });
  const [panelBox, navBox] = await Promise.all([panel.boundingBox(), nav.boundingBox()]);
  expect(panelBox?.height).toBeLessThan(200);
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(navBox!.y - 1);
});
