import { expect, test } from '@playwright/test';

import { E2E_ADMIN_PASSWORD } from './constants';

test('admin approval navigation uses a document request, not an RSC prefetch', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Password').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const link = page.getByRole('link', { name: 'AI approvals' });
  await expect(link).toHaveAttribute('href', '/admin/agent-approvals');

  const navigation = page.waitForRequest((request) =>
    request.isNavigationRequest() &&
    new URL(request.url()).pathname === '/admin/agent-approvals',
  );
  await link.click();
  const request = await navigation;

  expect(request.resourceType()).toBe('document');
  expect(request.headers().rsc).toBeUndefined();
  await expect(page).toHaveURL(/\/admin\/agent-approvals$/);
  await expect(page.getByRole('heading', { name: 'AI change approvals' })).toBeVisible();
});
