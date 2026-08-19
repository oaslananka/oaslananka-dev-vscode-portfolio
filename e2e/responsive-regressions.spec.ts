import { expect, test } from '@playwright/test';

const CONTRIBUTIONS_API = 'https://github-contributions-api.jogruber.de';

const contributionFixture = {
  total: { lastYear: 2 },
  contributions: [
    { date: '2026-07-18', count: 0, level: 0 },
    { date: '2026-07-19', count: 1, level: 1 },
    { date: '2026-07-20', count: 1, level: 1 },
  ],
};

async function mockContributionCalendar(page: import('@playwright/test').Page) {
  await page.route(`${CONTRIBUTIONS_API}/v4/**`, async (route) => {
    await route.fulfill({ json: contributionFixture });
  });
}

test('security policy allows the GitHub contribution API', async ({ page }) => {
  const response = await page.goto('/');
  const policy = response?.headers()['content-security-policy'] ?? '';

  expect(policy).toContain("connect-src 'self'");
  expect(policy).toContain(CONTRIBUTIONS_API);
});

test('article cards fit a 320px viewport without clipped stats', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/articles');

  const geometry = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>('a[href^="/articles/"]'),
    ).map((card) => {
      const rect = card.getBoundingClientRect();
      return { left: rect.left, right: rect.right };
    });
    const stats = Array.from(
      document.querySelectorAll<HTMLElement>('[class*="__stats"]'),
    ).map((item) => ({
      clientWidth: item.clientWidth,
      scrollWidth: item.scrollWidth,
    }));

    return {
      viewportWidth,
      documentWidth: document.documentElement.scrollWidth,
      cards,
      stats,
    };
  });

  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.cards.length).toBeGreaterThan(0);
  for (const card of geometry.cards) {
    expect(card.left).toBeGreaterThanOrEqual(-1);
    expect(card.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  }
  expect(geometry.stats.length).toBeGreaterThan(0);
  for (const stats of geometry.stats) {
    expect(stats.scrollWidth).toBeLessThanOrEqual(stats.clientWidth + 1);
  }
});

test('article cards use the available desktop width', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/articles');

  const firstCard = page.locator('a[href^="/articles/"]:has(img)').first();
  await expect(firstCard).toBeVisible();

  const geometry = await firstCard.evaluate((card) => {
    const image = card.querySelector('img');
    const imageWrapper = image?.parentElement;

    return {
      cardWidth: card.getBoundingClientRect().width,
      imageWidth: imageWrapper?.getBoundingClientRect().width ?? 0,
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    };
  });

  expect(geometry.cardWidth).toBeGreaterThanOrEqual(700);
  expect(geometry.imageWidth).toBeGreaterThanOrEqual(150);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
});

test('GitHub contribution calendar does not overflow its desktop card', async ({ page }) => {
  await mockContributionCalendar(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/github');

  const section = page
    .getByRole('heading', { level: 2, name: 'Contribution Activity' })
    .locator('xpath=ancestor::section');

  await expect(section).toBeVisible();
  const calendar = section.locator('article');
  await calendar.waitFor({ state: 'attached', timeout: 10_000 });

  const contributions = calendar.locator('xpath=parent::*');
  await expect
    .poll(() =>
      contributions.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    )
    .toBe(true);
});

test('GitHub contribution calendar remains available on mobile', async ({ page }) => {
  await mockContributionCalendar(page);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/github');

  const region = page.getByRole('region', {
    name: /GitHub contribution calendar for @/,
  });

  await region.scrollIntoViewIfNeeded();
  await expect(region).toBeVisible();
  await expect(region).toHaveAttribute('aria-busy', 'false');
  await expect(region.locator('article')).toBeVisible();

  const geometry = await region.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(geometry.width).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
});

test('about page keeps a readable desktop measure', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/about');

  const heading = page.getByRole('main').getByRole('heading', { level: 1 });
  const aboutHeader = heading.locator('xpath=ancestor::header');
  const container = aboutHeader.locator('xpath=..');

  await expect(container).toBeVisible();
  expect(
    await container.evaluate((element) => element.getBoundingClientRect().width),
  ).toBeGreaterThanOrEqual(720);
});

test('contact controls meet the mobile touch-target minimum', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/contact');

  const controls = page.locator(
    'form input:not([type="hidden"]):not([aria-hidden="true"]), form select, form textarea, form button[type="submit"]',
  );
  await expect(controls.first()).toBeVisible();

  const heights = await controls.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().height),
  );
  expect(heights.length).toBeGreaterThan(0);
  for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);
});

test('repeated server validation errors refocus the invalid field', async ({ page }) => {
  await page.goto('/contact');

  const form = page.locator('form');
  const name = page.getByLabel('Name');
  const email = page.getByLabel('Email');
  const message = page.getByLabel('Message');
  const submit = page.getByRole('button', { name: 'Send message' });

  await form.evaluate((element) => {
    (element as HTMLFormElement).noValidate = true;
  });
  await name.fill('Test User');
  await email.fill('test@example.com');
  await message.fill('short');
  await submit.click();

  const alert = page.locator('#contact-form-error');
  await expect(alert).toHaveText('Please write a little more.');
  await expect(message).toBeFocused();
  await expect(message).toHaveAttribute('aria-invalid', 'true');
  await expect(message).toHaveAttribute('aria-describedby', 'contact-form-error');

  await name.fill('Test User');
  await email.fill('test@example.com');
  await message.fill('short');
  await name.focus();
  await form.evaluate((element) => {
    (element as HTMLFormElement).noValidate = true;
  });
  await submit.click();
  await expect(message).toBeFocused();
});

test('about skill categories preserve heading order', async ({ page }) => {
  await page.goto('/about');

  const skills = page
    .getByRole('heading', { level: 2, name: 'Skills' })
    .locator('xpath=ancestor::section');
  await expect(skills.getByRole('heading', { level: 3 }).first()).toBeVisible();
  await expect(skills.getByRole('heading', { level: 4 })).toHaveCount(0);
});
