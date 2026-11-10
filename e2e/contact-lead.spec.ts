import { expect, test } from '@playwright/test';

async function watchSavedContactEvents(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const trackingWindow = window as Window & { contactSavedCount?: number };
    trackingWindow.contactSavedCount = 0;
    window.addEventListener('portfolio:contact-saved', () => {
      trackingWindow.contactSavedCount = (trackingWindow.contactSavedCount ?? 0) + 1;
    });
  });
}

async function fillContactForm(page: import('@playwright/test').Page) {
  await page.locator('input[name="name"]').fill('Automated Contact Test');
  await page.locator('input[name="email"]').fill('test@example.invalid');
  await page.locator('textarea[name="message"]').fill(
    'An isolated test submission verifying consent-aware contact lead measurement.',
  );
}

test('honeypot decoy success does not signal a saved contact', async ({ page }) => {
  await watchSavedContactEvents(page);
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Allow analytics' }).click();
  await fillContactForm(page);

  await page.locator('input[name="website"]').evaluate((element) => {
    (element as HTMLInputElement).value = 'https://spam.example.invalid';
  });
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Thanks' })).toBeVisible();
  expect(await page.evaluate(
    () => (window as Window & { contactSavedCount?: number }).contactSavedCount,
  )).toBe(0);
});

test('a saved message signals exactly one lead in disposable database E2E', async ({ page }) => {
  test.skip(
    !process.env.CI
      || process.env.DATABASE_DRIVER !== 'node-postgres'
      || !process.env.DATABASE_URL?.includes('127.0.0.1')
      || Boolean(process.env.RESEND_API_KEY),
    'Requires disposable CI PostgreSQL and no notification provider',
  );

  await watchSavedContactEvents(page);
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Allow analytics' }).click();
  await fillContactForm(page);
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Thanks' })).toBeVisible();
  await expect.poll(() => page.evaluate(
    () => (window as Window & { contactSavedCount?: number }).contactSavedCount,
  )).toBe(1);
});
