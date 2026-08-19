import { expect, test } from '@playwright/test';

test('static pages expose self-referencing social metadata', async ({ page }) => {
  await page.goto('/projects');

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/projects$/,
  );
  await expect(
    page.locator('link[rel="alternate"][type="text/markdown"]'),
  ).toHaveAttribute('href', /\/projects\.md$/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Edge AI, Embedded & AI Engineering Projects',
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    /\/projects$/,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    'content',
    /^https?:\/\//,
  );
});

test('homepage advertises and negotiates its Markdown representation', async ({
  page,
  request,
}) => {
  const htmlResponse = await page.goto('/');
  await expect(
    page.locator('link[rel="alternate"][type="text/markdown"]'),
  ).toHaveAttribute('href', /\/index\.md$/);
  expect(htmlResponse?.headers()['vary']).toContain('Accept');
  expect(htmlResponse?.headers()['link']).toContain('/index.md');

  const markdownResponse = await request.get('/', {
    headers: { accept: 'text/markdown' },
  });
  expect(markdownResponse.ok()).toBeTruthy();
  expect(markdownResponse.headers()['content-type']).toContain('text/markdown');
  expect(markdownResponse.headers()['vary']).toContain('Accept');
  expect(markdownResponse.headers()['link']).toContain('rel="canonical"');
  const markdown = await markdownResponse.text();
  expect(markdown).toMatch(/^---\ntitle:/);
  expect(markdown).toContain('## Sitemap');

  const directMirror = await request.get('/.md');
  expect(directMirror.ok()).toBeTruthy();
  expect(directMirror.headers()['content-type']).toContain('text/markdown');
  expect(directMirror.headers()['link']).toContain('rel="canonical"');
  expect(await directMirror.text()).toContain('## Sitemap');
});

test('every static canonical page has a direct and negotiated Markdown representation', async ({
  page,
  request,
}) => {
  const paths = [
    '/about',
    '/projects',
    '/articles',
    '/github',
    '/glossary',
    '/contact',
    '/privacy',
  ];

  for (const path of paths) {
    await test.step(path, async () => {
      await page.goto(path);
      await expect(
        page.locator('link[rel="alternate"][type="text/markdown"]'),
      ).toHaveAttribute('href', new RegExp(`${path.replaceAll('/', '\\/')}\\.md$`));
      await expect(page.getByRole('link', { name: 'Glossary' }).last()).toHaveAttribute(
        'href',
        '/glossary',
      );

      for (const response of [
        await request.get(`${path}.md`),
        await request.get(path, { headers: { accept: 'text/markdown' } }),
      ]) {
        expect(response.ok(), path).toBeTruthy();
        expect(response.headers()['content-type']).toContain('text/markdown');
        expect(response.headers()['vary']).toContain('Accept');
        expect(response.headers()['link']).toContain('rel="canonical"');
        expect(response.headers()['x-robots-tag']).toContain('noindex');
        const body = await response.text();
        expect(body).toMatch(/^---\ntitle:/);
        expect(body).toContain('## Sitemap');
      }
    });
  }
});

test('project and article pages expose slug-specific Markdown mirrors', async ({
  page,
  request,
}) => {
  for (const section of ['/projects', '/articles']) {
    await page.goto(section);
    const href = await page
      .locator(`a[href^="${section}/"]`)
      .first()
      .getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);
    await expect(
      page.locator('link[rel="alternate"][type="text/markdown"]'),
    ).toHaveAttribute('href', new RegExp(`${href!.replaceAll('/', '\\/')}\\.md$`));

    const direct = await request.get(`${href}.md`);
    expect(direct.ok()).toBeTruthy();
    expect(direct.headers()['content-type']).toContain('text/markdown');
    expect(await direct.text()).toContain('## Sitemap');

    const negotiated = await request.get(href!, {
      headers: { accept: 'text/markdown' },
    });
    expect(negotiated.ok()).toBeTruthy();
    expect(negotiated.headers()['content-type']).toContain('text/markdown');
  }

  for (const path of [
    '/projects/definitely-missing-content.md',
    '/articles/definitely-missing-content.md',
  ]) {
    expect((await request.get(path)).status()).toBe(404);
  }
});

test('Sismo Smart has canonical HTML, Markdown, and sitemap discovery', async ({
  page,
  request,
}) => {
  await page.goto('/projects/sismo-smart');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/projects\/sismo-smart$/,
  );

  const markdown = await request.get('/projects/sismo-smart.md');
  expect(markdown.status()).toBe(200);
  expect(await markdown.text()).toContain('## Public evidence boundary');

  const sitemap = await request.get('/sitemap.xml');
  expect(await sitemap.text()).toContain('/projects/sismo-smart</loc>');
});

test('article metadata uses a resolvable generated image and one page H1', async ({
  page,
  request,
}) => {
  await page.goto('/articles');
  const firstArticle = page.locator('a[href^="/articles/"]').first();
  const href = await firstArticle.getAttribute('href');

  expect(href).toBeTruthy();
  await page.goto(href!);
  await expect(page.locator('h1')).toHaveCount(1);

  const imageUrl = await page
    .locator('meta[property="og:image"]')
    .getAttribute('content');
  expect(imageUrl).toMatch(/\/articles\/[^/]+\/opengraph-image[^/]*\?/);

  const imageResponse = await request.get(imageUrl!);
  expect(imageResponse.ok()).toBeTruthy();
  expect(imageResponse.headers()['content-type']).toContain('image/png');
});

test('unknown dynamic social-image slugs return 404', async ({ page, request }) => {
  const sections = [
    { indexPath: '/projects', hrefPrefix: '/projects/' },
    { indexPath: '/articles', hrefPrefix: '/articles/' },
  ];

  for (const { indexPath, hrefPrefix } of sections) {
    await page.goto(indexPath);
    const href = await page
      .locator(`a[href^="${hrefPrefix}"]`)
      .first()
      .getAttribute('href');

    expect(href).toBeTruthy();
    await page.goto(href!);

    const imageUrl = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content');
    expect(imageUrl).toBeTruthy();

    const missingImageUrl = new URL(imageUrl!);
    const pathSegments = missingImageUrl.pathname.split('/');
    pathSegments[2] = 'definitely-missing-content';
    missingImageUrl.pathname = pathSegments.join('/');

    const response = await request.get(missingImageUrl.toString());
    expect(response.status()).toBe(404);
  }
});

test('404 responses are noindex and do not inherit the home canonical', async ({ page }) => {
  const response = await page.goto('/missing-seo-page');
  const robotsDirectives = await page
    .locator('meta[name="robots"]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('content') ?? ''),
    );

  expect(response?.status()).toBe(404);
  expect(robotsDirectives.some((content) => content.includes('noindex'))).toBe(true);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test('unknown project and article slugs return hard 404 responses', async ({
  request,
}) => {
  for (const path of [
    '/projects/definitely-missing-content',
    '/articles/definitely-missing-content',
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
  }
});

test('machine discovery endpoints are canonical and well formed', async ({ request }) => {
  const [robots, llms, llmsFull, feed, sitemap, sitemapMarkdown, agents] =
    await Promise.all([
      request.get('/robots.txt'),
      request.get('/llms.txt'),
      request.get('/llms-full.txt'),
      request.get('/feed.xml'),
      request.get('/sitemap.xml'),
      request.get('/sitemap.md'),
      request.get('/AGENTS.md'),
    ]);

  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain('User-Agent: OAI-SearchBot');
  await expect(await request.get('/privacy')).toBeOK();
  await expect(await request.get('/glossary')).toBeOK();

  const llmsText = await llms.text();
  expect(llms.headers()['content-type']).toContain('text/plain');
  expect(llmsText).toContain('## Canonical pages');
  expect(llmsText).toMatch(/\[RSS feed\]\(.*\/feed\.xml\)/);
  expect(llmsText).toContain('/llms-full.txt');

  const llmsFullText = await llmsFull.text();
  expect(llmsFull.ok()).toBeTruthy();
  expect(llmsFullText).toContain('## Projects');
  expect(llmsFullText).toContain('## Articles');

  const markdownSitemapText = await sitemapMarkdown.text();
  expect(sitemapMarkdown.headers()['content-type']).toContain('text/markdown');
  expect((markdownSitemapText.match(/^## /gm) ?? []).length).toBeGreaterThanOrEqual(4);

  const agentText = await agents.text();
  expect(agents.headers()['content-type']).toContain('text/markdown');
  expect(agentText).toContain('## Installation');
  expect(agentText).toContain('## Configuration');
  expect(agentText).toContain('## Usage');

  const feedText = await feed.text();
  expect(feed.headers()['content-type']).toContain('application/rss+xml');
  expect(feedText).toContain('<rss version="2.0"');

  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain('/privacy</loc>');
  expect(sitemapText).toContain('/glossary</loc>');
  expect(sitemapText).not.toContain('/admin');
  expect(sitemapText).not.toContain('/settings');
  for (const entry of sitemapText.match(/<url>[\s\S]*?<\/url>/g) ?? []) {
    expect(entry).toContain('<lastmod>');
  }
});
