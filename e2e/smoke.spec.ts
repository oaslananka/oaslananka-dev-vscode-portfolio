import { expect, test } from '@playwright/test';

for (const route of ['/', '/about', '/projects', '/articles', '/contact']) {
  test(`${route} renders a main heading`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
  });
}

test('command palette remains keyboard-operable', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+Shift+P');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
