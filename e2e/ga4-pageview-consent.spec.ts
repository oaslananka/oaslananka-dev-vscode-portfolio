import { expect, test } from '@playwright/test';

test('GA4 tracks an internal route change only after analytics consent', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Allow analytics' }).click();
  await page.locator('a[href="/projects"]').first().click();
  await expect(page).toHaveURL(/\/projects$/);

  await expect.poll(async () => page.evaluate(() => {
    const dataLayer = (window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? [];
    return dataLayer.filter((event) =>
      event[0] === 'event'
      && event[1] === 'page_view'
      && (event[2] as { page_path?: string })?.page_path === '/projects',
    ).length;
  })).toBe(1);
});

test('GA4 never tracks route changes with essential-only consent', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Essential only' }).click();
  await page.locator('a[href="/projects"]').first().click();
  await expect(page).toHaveURL(/\/projects$/);
  const count = await page.evaluate(() => {
    const dataLayer = (window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? [];
    return dataLayer.filter((event) => event[0] === 'event' && event[1] === 'page_view').length;
  });
  expect(count).toBe(0);
});
