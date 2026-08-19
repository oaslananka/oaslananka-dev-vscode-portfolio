import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { E2E_ADMIN_PASSWORD } from './constants';

const routes = [
  '/',
  '/about',
  '/projects',
  '/articles',
  '/github',
  '/glossary',
  '/contact',
  '/settings',
  '/admin/login',
] as const;

const disposableDatabaseEnabled =
  process.env.DATABASE_DRIVER === 'node-postgres' &&
  Boolean(process.env.DATABASE_URL);

async function expectNoWcagViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const details = results.violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help}\n${violation.nodes
          .map((node) => `  ${node.target.join(' ')} — ${node.failureSummary ?? ''}`)
          .join('\n')}`,
    )
    .join('\n\n');

  expect(results.violations, details).toEqual([]);
}

async function login(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.getByLabel('Password').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

for (const route of routes) {
  test(`${route} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(route);
    await expectNoWcagViolations(page);
  });
}

test('open command palette has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open Command Palette' }).click();
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();

  await expectNoWcagViolations(page);
});

test('open terminal has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Toggle terminal' }).click();
  await expect(page.getByRole('region', { name: 'Interactive terminal' })).toBeVisible();

  await expectNoWcagViolations(page);
});

test('authenticated admin pages have no WCAG A/AA violations', async ({ page }) => {
  test.skip(
    !disposableDatabaseEnabled,
    'Requires the disposable PostgreSQL E2E environment.',
  );

  await login(page);

  for (const route of [
    '/admin',
    '/admin/profile',
    '/admin/settings',
    '/admin/projects',
    '/admin/projects/new',
    '/admin/posts',
    '/admin/posts/new',
    '/admin/messages',
  ]) {
    await test.step(`Route: ${route}`, async () => {
      await page.goto(route);
      await expectNoWcagViolations(page);
    });
  }
});


test('silent project demo exposes visual descriptions without audio', async ({ page }) => {
  await page.goto('/projects/sky-track-vision');

  const video = page.getByLabel('SkyTrackVision AirSim perception and mission demo');
  await expect(video).toBeVisible();
  expect(await video.evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
  await expect(video.locator('track[kind="descriptions"]')).toHaveAttribute(
    'src',
    '/projects/sky-track-vision/demo.en.vtt',
  );
  await expect(page.getByText('Silent recording; no audio track is present.')).toBeVisible();
  await expectNoWcagViolations(page);
});
