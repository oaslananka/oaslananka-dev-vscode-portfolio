import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

interface ValidationModule {
  ADMIN_CONTENT_LIMITS: {
    tagCount: number;
    tagLength: number;
    postBodyLength: number;
    sortOrderMin: number;
    sortOrderMax: number;
    educationCount: number;
  };
  parseSafeId(value: FormDataEntryValue | null, label?: string): number;
  parseProfileForm(formData: FormData): Record<string, unknown>;
  parseSettingsForm(formData: FormData): Record<string, unknown>;
  parseProjectForm(formData: FormData): Record<string, unknown>;
  parsePostForm(formData: FormData): Record<string, unknown>;
}

async function loadValidation(): Promise<ValidationModule> {
  const url = pathToFileURL(
    path.join(process.cwd(), 'lib/admin/validation.ts'),
  ).href;

  try {
    return (await import(url)) as ValidationModule;
  } catch (error) {
    assert.fail(`admin validation module must load: ${(error as Error).message}`);
  }
}

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

test('admin identifiers accept only positive safe integers', async () => {
  const { parseSafeId } = await loadValidation();

  assert.equal(parseSafeId('42', 'Project ID'), 42);
  for (const value of ['', '0', '-1', '1.5', '9007199254740992', 'abc']) {
    assert.throws(
      () => parseSafeId(value, 'Project ID'),
      /Project ID must be a positive safe integer/,
    );
  }
});

test('profile validation reports the exact nested field and enforces bounds', async () => {
  const { parseProfileForm } = await loadValidation();
  const data = form({
    name: 'Test Engineer',
    role: 'Engineer',
    tagline: 'Reliable systems',
    greeting: 'Hello',
    heroDescription: 'Builds production systems.',
    location: 'Türkiye',
    email: 'test@example.com',
    avatarUrl: '',
    resumeUrl: '',
    bio: 'Paragraph one.',
    socials: '[]',
    skills: JSON.stringify([
      { category: 'Languages', items: ['x'.repeat(81)] },
    ]),
    experience: '[]',
    education: '[]',
    writing: '[]',
  });

  assert.throws(() => parseProfileForm(data), /skills\.0\.items\.0/i);
});

test('education validation trims values and enforces strict bounded records', async () => {
  const { ADMIN_CONTENT_LIMITS, parseProfileForm } = await loadValidation();
  const validValues = {
    name: 'Test Engineer',
    role: 'Engineer',
    tagline: 'Reliable systems',
    greeting: 'Hello',
    heroDescription: 'Builds production systems.',
    location: 'Türkiye',
    email: 'test@example.com',
    avatarUrl: '',
    resumeUrl: '',
    bio: 'Paragraph one.',
    socials: '[]',
    skills: '[]',
    experience: '[]',
    education: JSON.stringify([
      {
        institution: ' Ege University ',
        qualification: ' M.Sc., Civil & Structural Engineering ',
        details: ' Thesis title ',
      },
    ]),
    writing: '[]',
  };

  const parsed = parseProfileForm(form(validValues)) as {
    education: Array<{
      institution: string;
      qualification: string;
      details: string;
    }>;
  };
  assert.deepEqual(parsed.education, [
    {
      institution: 'Ege University',
      qualification: 'M.Sc., Civil & Structural Engineering',
      details: 'Thesis title',
    },
  ]);

  const unknownKey = form({
    ...validValues,
    education: JSON.stringify([
      {
        institution: 'Ege University',
        qualification: 'M.Sc.',
        details: '',
        year: '2026',
      },
    ]),
  });
  assert.throws(() => parseProfileForm(unknownKey), /education\.0/i);

  const tooMany = form({
    ...validValues,
    education: JSON.stringify(
      Array.from({ length: ADMIN_CONTENT_LIMITS.educationCount + 1 }, () => ({
        institution: 'Ege University',
        qualification: 'M.Sc.',
        details: '',
      })),
    ),
  });
  assert.throws(() => parseProfileForm(tooMany), /education/i);

  const missingInstitution = form({
    ...validValues,
    education: JSON.stringify([
      { institution: '', qualification: 'M.Sc.', details: '' },
    ]),
  });
  assert.throws(
    () => parseProfileForm(missingInstitution),
    /education\.0\.institution/i,
  );
});

test('settings validation trims, deduplicates, and bounds keywords', async () => {
  const { ADMIN_CONTENT_LIMITS, parseSettingsForm } = await loadValidation();
  const data = form({
    siteTitle: ' Portfolio ',
    siteDescription: ' Engineering portfolio. ',
    keywords: 'TypeScript, TypeScript, Edge AI',
    defaultTheme: 'github-dark',
    ogHeading: '',
  });

  const parsed = parseSettingsForm(data) as { keywords: string[]; siteTitle: string };
  assert.equal(parsed.siteTitle, 'Portfolio');
  assert.deepEqual(parsed.keywords, ['TypeScript', 'Edge AI']);

  data.set(
    'keywords',
    Array.from({ length: ADMIN_CONTENT_LIMITS.tagCount + 1 }, (_, i) => `k${i}`).join(','),
  );
  assert.throws(() => parseSettingsForm(data), /keywords/i);
});

test('project validation rejects unsafe sort orders and malformed nested JSON', async () => {
  const { ADMIN_CONTENT_LIMITS, parseProjectForm } = await loadValidation();
  const data = form({
    title: 'Verified Project',
    slug: '',
    description: 'A verified project.',
    longDescription: '',
    role: 'Maintainer',
    logo: '',
    coverImage: '',
    coverImageAlt: '',
    link: '',
    repo: '',
    tags: 'TypeScript',
    outcomes: '[]',
    media: '[]',
    links: '[]',
    sortOrder: String(ADMIN_CONTENT_LIMITS.sortOrderMax + 1),
  });

  assert.throws(() => parseProjectForm(data), /sort order/i);
  data.set('sortOrder', '0');
  data.set('media', '[{"type":"image","src":"/x.png"}]');
  assert.throws(() => parseProjectForm(data), /media\.0\.alt/i);
});

test('post validation rejects invalid dates and oversized Markdown', async () => {
  const { ADMIN_CONTENT_LIMITS, parsePostForm } = await loadValidation();
  const data = form({
    title: 'Verified Article',
    slug: '',
    excerpt: 'Summary.',
    body: 'Body',
    coverImage: '',
    tags: 'Testing',
    publishedAt: 'not-a-date',
  });

  assert.throws(() => parsePostForm(data), /published date/i);
  data.set('publishedAt', '2026-07-20T12:00');
  data.set('body', 'x'.repeat(ADMIN_CONTENT_LIMITS.postBodyLength + 1));
  assert.throws(() => parsePostForm(data), /body/i);
});

test('production-shaped admin forms pass the bounded contracts', async () => {
  const {
    parseProfileForm,
    parseSettingsForm,
    parseProjectForm,
    parsePostForm,
  } = await loadValidation();

  assert.equal(
    (parseProfileForm(
      form({
        name: 'Osman Aslan',
        role: 'Edge AI & Embedded Systems Engineer',
        tagline: 'Reliable physical systems',
        greeting: "Hello, I'm",
        heroDescription: 'Builds device-to-cloud products.',
        location: 'İzmir, Türkiye',
        email: 'hello@example.com',
        avatarUrl: '/avatar.webp',
        resumeUrl: '/resume.pdf',
        bio: 'First paragraph.\n\nSecond paragraph.',
        socials: JSON.stringify([
          { platform: 'github', label: 'GitHub', url: 'https://github.com/oaslananka' },
        ]),
        skills: JSON.stringify([
          { category: 'Languages', items: ['TypeScript', 'Python'] },
        ]),
        experience: JSON.stringify([
          {
            role: 'Engineer',
            company: 'Example',
            period: '2025 — Present',
            description: 'Builds systems.',
            points: ['Owns verification.'],
          },
        ]),
        education: '[]',
        writing: JSON.stringify([
          { label: 'Article', url: 'https://example.com/article' },
        ]),
      }),
    ) as { name: string }).name,
    'Osman Aslan',
  );

  assert.doesNotThrow(() =>
    parseSettingsForm(
      form({
        siteTitle: 'Portfolio',
        siteDescription: 'Engineering portfolio.',
        keywords: 'edge AI, embedded systems',
        defaultTheme: 'github-dark',
        ogHeading: '',
      }),
    ),
  );

  assert.doesNotThrow(() =>
    parseProjectForm(
      form({
        title: 'KiCad MCP Pro',
        slug: 'kicad-mcp-pro',
        description: 'A production engineering tool.',
        longDescription: '# Overview\n\nDetails.',
        role: 'Maintainer',
        logo: '/projects/kicad/logo.webp',
        coverImage: '/projects/kicad/cover.webp',
        coverImageAlt: 'KiCad project interface',
        link: 'https://example.com',
        repo: 'https://github.com/oaslananka/kicad-mcp',
        tags: 'TypeScript, MCP',
        outcomes: '["Repeatable verification"]',
        media: '[]',
        links: '[]',
        sortOrder: '10',
      }),
    ),
  );

  assert.doesNotThrow(() =>
    parsePostForm(
      form({
        title: 'Production-first edge AI',
        slug: 'production-first-edge-ai',
        excerpt: 'A practical engineering article.',
        body: '# Method\n\nUse evidence.',
        coverImage: '',
        tags: 'Edge AI, Engineering',
        publishedAt: '2026-07-20T12:00',
      }),
    ),
  );
});
