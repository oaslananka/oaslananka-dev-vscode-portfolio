import { expect, test } from '@playwright/test';

import { E2E_CRON_SECRET } from './constants';
import { INDEXNOW_KEY, INDEXNOW_KEY_PATH } from '../lib/indexnow';
import { UI_ICON_SPRITE_URL } from '../lib/static-assets';

const publicRoutes = [
  '/',
  '/about',
  '/projects',
  '/articles',
  '/glossary',
  '/contact',
  '/settings',
] as const;

const indexableRoutes = [
  '/',
  '/about',
  '/projects',
  '/articles',
  '/github',
  '/glossary',
  '/contact',
] as const;

for (const route of publicRoutes) {
  test(`${route} renders its primary content`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const response = await page.goto(route);

    expect(response?.ok()).toBe(true);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
}

test('About presents education in the intended section order', async ({ page }) => {
  await page.goto('/about');

  const headings = page.getByRole('heading', { level: 2 });
  const labels = await headings.allTextContents();
  const experienceIndex = labels.indexOf('Experience');
  const educationIndex = labels.indexOf('Education');
  const skillsIndex = labels.indexOf('Skills');
  const profilesIndex = labels.indexOf('Verified profiles');

  expect(experienceIndex).toBeGreaterThan(-1);
  expect(educationIndex).toBeGreaterThan(experienceIndex);
  expect(skillsIndex).toBeGreaterThan(educationIndex);
  expect(profilesIndex).toBeGreaterThan(skillsIndex);
  await expect(
    page.getByText(
      'Thesis: A Big Data– and AI-Driven Embedded Systems Framework for Structural Health Monitoring',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 3, name: 'Middle East Technical University' }),
  ).toBeVisible();
});

test('Sismo Smart is featured and exposes only the public evidence boundary', async ({ page }) => {
  await page.goto('/');

  const selectedWork = page.locator('section').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'Systems with visible engineering evidence',
    }),
  });
  const featuredLinks = selectedWork.locator('a[href^="/projects/"]');
  await expect(featuredLinks.first()).toHaveAttribute('href', '/projects/sismo-smart');
  await expect(
    selectedWork.getByRole('heading', { level: 3, name: 'Sismo Smart' }),
  ).toBeVisible();

  await page.goto('/projects/sismo-smart');
  await expect(
    page.getByRole('heading', { level: 2, name: 'Public evidence boundary' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /It does not publish customer names, deployment quantities, private datasets, commercial terms, detection accuracy, alert latency or certification claims\./,
    ),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Source repository' })).toHaveCount(0);
});

test('homepage methodology remains concise and evidence-linked', async ({ page }) => {
  await page.goto('/');

  const section = page.locator('section').filter({
    has: page.getByRole('heading', {
      level: 2,
      name: 'What production-ready means in my work',
    }),
  });
  await expect(section).toHaveCount(1);
  await expect(
    section.getByRole('link', { name: 'Inspect the KiCad MCP Pro evidence' }),
  ).toHaveAttribute('href', '/projects/kicad-mcp-pro');

  const wordCount = (await section.innerText()).trim().split(/\s+/).filter(Boolean).length;
  expect(wordCount).toBeLessThan(800);
});

test('About shows approved public and confidential company labels', async ({ page }) => {
  await page.goto('/about');

  await expect(page.getByText('Sismo Smart', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Confidential renewable-energy startup', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/a decade of shipping IoT and edge-AI/i)).toHaveCount(0);
});

test('contact shows specific availability and deterministic channels', async ({ page }) => {
  await page.goto('/contact');

  await expect(
    page.getByText(
      'Open to senior software, edge AI, embedded systems and technical leadership roles; selected consulting engagements considered.',
    ),
  ).toBeVisible();

  const channelSection = page.getByRole('heading', {
    level: 2,
    name: 'Other contact channels',
  }).locator('..');
  await expect(channelSection.getByRole('link', { name: 'Email' })).toHaveCount(1);
  await expect(channelSection.getByRole('link', { name: 'LinkedIn' })).toHaveCount(1);
  await expect(channelSection.getByRole('link', { name: 'GitHub' })).toHaveCount(1);
  await expect(channelSection.getByRole('link', { name: 'DEV' })).toHaveCount(0);
  await expect(channelSection.getByRole('link', { name: 'Website' })).toHaveCount(0);
});

test('ignores malformed keydown events without a key value', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/contact');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('keydown', { bubbles: true }));
  });

  expect(pageErrors).toEqual([]);
});

test('production security headers are present', async ({ page }) => {
  const response = await page.goto('/');
  const headers = response?.headers() ?? {};

  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['x-powered-by']).toBeUndefined();
});

test('public icons render from the versioned immutable sprite', async ({
  page,
  request,
}) => {
  const spriteResponse = await request.get(UI_ICON_SPRITE_URL);

  expect(spriteResponse.ok()).toBe(true);
  expect(spriteResponse.headers()['cache-control']).toBe(
    'public, max-age=31536000, immutable',
  );
  expect(spriteResponse.headers()['content-type']).toContain('image/svg+xml');
  expect(await spriteResponse.text()).toMatch(
    /<symbol id="files"[^>]*>[\s\S]+<\/symbol>/,
  );

  await page.goto('/');
  const homeIcon = page.locator(
    `a[aria-label="Home"] svg:has(use[href="${UI_ICON_SPRITE_URL}#files"])`,
  );
  await expect(homeIcon).toBeVisible();

  const bounds = await homeIcon.boundingBox();
  expect(bounds?.width ?? 0).toBeGreaterThan(0);
  expect(bounds?.height ?? 0).toBeGreaterThan(0);
});

test('terminal is keyboard-operable and executes commands', async ({ page }) => {
  await page.goto('/');

  const toggle = page.getByRole('button', { name: 'Toggle terminal' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  const terminal = page.getByRole('region', { name: 'Interactive terminal' });
  await expect(terminal).toBeVisible();

  const commandInput = page.getByRole('textbox', { name: 'Terminal command' });
  await page.getByRole('button', { name: 'Focus terminal command' }).click();
  await expect(commandInput).toBeFocused();
  await commandInput.fill('help');
  await commandInput.press('Enter');
  await expect(terminal.getByText('Available commands:')).toBeVisible();

  await page.getByRole('button', { name: 'Close terminal' }).click();
  await expect(terminal).toBeHidden();
});

test('selected theme persists after a reload', async ({ page }) => {
  await page.goto('/settings');

  await page.getByRole('button', { name: /Dracula/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');
});

test('command palette opens, accepts search, and closes with Escape', async ({
  page,
}) => {
  await page.goto('/');

  const opener = page.getByRole('button', { name: 'Open Command Palette' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.tagName)).toBe('DIALOG');

  const search = page.getByRole('combobox', { name: 'Command palette search' });
  await search.fill('settings');
  await expect(page.getByRole('listbox', { name: 'Commands' })).toBeVisible();

  await search.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('defers the heavy GitHub route until navigation', async ({ page }) => {
  const githubRequests: string[] = [];

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/github') {
      githubRequests.push(request.url());
    }
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(githubRequests).toEqual([]);

  await page.getByRole('link', { name: 'GitHub activity' }).click();
  await expect(page).toHaveURL(/\/github$/);
  expect(githubRequests.length).toBeGreaterThan(0);
});

test('robots and sitemap expose healthy public URLs', async ({ request }) => {
  const robotsResponse = await request.get('/robots.txt');
  expect(robotsResponse.ok()).toBe(true);

  const robots = await robotsResponse.text();
  expect(robots).toContain('User-Agent: *');
  expect(robots).toContain('Disallow: /admin');
  expect(robots).toContain('Disallow: /api');
  expect(robots).toMatch(/Sitemap: https?:\/\/.*\/sitemap\.xml/);

  const sitemapResponse = await request.get('/sitemap.xml');
  expect(sitemapResponse.ok()).toBe(true);

  const sitemap = await sitemapResponse.text();
  const urls = Array.from(
    sitemap.matchAll(/<loc>([^<]+)<\/loc>/g),
    (match) => match[1],
  );
  const paths = urls.map((url) => new URL(url).pathname);

  expect(paths).toEqual(expect.arrayContaining([...indexableRoutes]));
  expect(
    paths.some(
      (path) =>
        path.startsWith('/admin') ||
        path.startsWith('/api') ||
        path === '/settings',
    ),
  ).toBe(false);

  const results = await Promise.all(
    urls.map(async (url) => {
      const path = new URL(url).pathname;
      return { url, response: await request.get(path) };
    }),
  );

  for (const { url, response } of results) {
    expect(response.ok(), `${url} should return a successful response`).toBe(
      true,
    );
  }
});

test('canonical metadata and structured data remain valid', async ({ page }) => {
  for (const route of indexableRoutes) {
    const response = await page.goto(route);
    expect(response?.ok()).toBe(true);

    const canonicalHref = await page
      .locator('link[rel="canonical"]')
      .getAttribute('href');
    expect(canonicalHref).not.toBeNull();
    expect(new URL(canonicalHref!, 'http://localhost').pathname).toBe(route);
  }

  await page.goto('/');
  const schemas = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const schemaTypes = schemas.map((schema) => {
    const data = JSON.parse(schema) as { '@type'?: string };
    return data['@type'];
  });

  expect(schemaTypes).toEqual(
    expect.arrayContaining(['Person', 'WebSite', 'BreadcrumbList']),
  );

  await page.goto('/settings');
  const settingsCanonical = await page
    .locator('link[rel="canonical"]')
    .getAttribute('href');
  expect(settingsCanonical).not.toBeNull();
  expect(new URL(settingsCanonical!, 'http://localhost').pathname).toBe(
    '/settings',
  );

  const robots = await page
    .locator('meta[name="robots"]')
    .getAttribute('content');
  expect(robots).toContain('noindex');
  expect(robots).toContain('nofollow');
});

test('serves the IndexNow ownership key', async ({ request }) => {
  const response = await request.get(INDEXNOW_KEY_PATH);

  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('text/plain');
  expect(await response.text()).toBe(INDEXNOW_KEY);
});

test('retention cleanup requires its cron bearer secret', async ({ request }) => {
  const unauthorized = await request.get('/api/cron/retention');
  expect(unauthorized.status()).toBe(401);

  const authorized = await request.get('/api/cron/retention', {
    headers: { authorization: `Bearer ${E2E_CRON_SECRET}` },
  });

  if (process.env.DATABASE_URL) {
    expect(authorized.ok()).toBe(true);
    expect(await authorized.json()).toMatchObject({
      ok: true,
      deleted: {
        contactMessages: expect.any(Number),
        rateLimitAttempts: expect.any(Number),
      },
    });
  } else {
    expect(authorized.status()).toBe(503);
  }
});

test('contact notification redrive requires its cron bearer secret', async ({ request }) => {
  const unauthorized = await request.get('/api/cron/contact-notifications');
  expect(unauthorized.status()).toBe(401);
  expect(unauthorized.headers()['cache-control']).toBe('no-store');

  const authorized = await request.get('/api/cron/contact-notifications', {
    headers: { authorization: `Bearer ${E2E_CRON_SECRET}` },
  });
  expect(authorized.headers()['cache-control']).toBe('no-store');

  if (process.env.DATABASE_URL) {
    expect(authorized.ok()).toBe(true);
    expect(await authorized.json()).toMatchObject({
      ok: true,
      delivery: {
        configured: false,
        claimed: 0,
        sent: 0,
        retried: 0,
        failed: 0,
        skipped: 0,
      },
    });
  } else {
    expect(authorized.status()).toBe(503);
  }
});

test('admin routes require authentication and reject an invalid password', async ({
  page,
}) => {
  await page.goto('/admin');

  await expect(page).toHaveURL(/\/admin\/login\?from=%2Fadmin$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.getByLabel('Password').fill('definitely-not-the-ci-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Incorrect password.')).toBeVisible();
});


test('privacy settings close with Escape and restore focus', async ({ page }) => {
  await page.goto('/');

  const panel = page.getByRole('region', { name: 'Privacy choices' });
  await expect(panel).toBeVisible();
  await page.getByRole('button', { name: 'Essential only' }).click();
  await expect(panel).toBeHidden();

  const opener = page.getByRole('button', { name: 'Open privacy choices' });
  await opener.click();
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(opener).toBeFocused();
});
