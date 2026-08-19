import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  articleAuthoritySections,
  authorityProfileRefresh,
  authoritySettingsRefresh,
  projectAuthoritySections,
} from '../lib/db/content-authority';
import { CANONICAL_IDENTITY_PROFILES } from '../lib/person-identity';
import {
  defaultPosts,
  defaultProfile,
  defaultProjects,
  defaultSettings,
} from '../lib/db/defaults';

test('authority content is complete, evidence-led, and free of placeholder claims', () => {
  assert.equal(Object.keys(projectAuthoritySections).length, 7);
  assert.equal(Object.keys(articleAuthoritySections).length, 5);
  assert.equal(authorityProfileRefresh.writing.length, 5);
  assert.equal(authoritySettingsRefresh.keywords.length <= 30, true);

  for (const project of defaultProjects) {
    assert.match(project.longDescription, /## Evidence you can inspect/);
    assert.match(project.longDescription, /## Engineering trade-offs/);
    assert.doesNotMatch(project.longDescription, /\b(?:TBD|TODO|lorem ipsum)\b/i);
  }

  for (const post of defaultPosts) {
    assert.match(post.body, /## Applied evidence and related work/);
    assert.doesNotMatch(post.body, /\b(?:TBD|TODO|lorem ipsum)\b/i);
  }

  assert.equal(defaultProfile.heroDescription, authorityProfileRefresh.heroDescription);
  assert.deepEqual(defaultProfile.writing, [...authorityProfileRefresh.writing]);
  assert.equal(defaultSettings.siteDescription, authoritySettingsRefresh.siteDescription);
});

test('Sismo Smart case study is featured and privacy-safe', () => {
  const project = defaultProjects.find((item) => item.slug === 'sismo-smart');
  assert.ok(project);
  assert.equal(project.featured, true);
  assert.equal(project.sortOrder, -1);
  assert.equal(project.role, 'Founder & Lead Engineer');
  assert.equal(project.repo, '');
  assert.equal(project.link, '');
  assert.match(project.longDescription, /## Public evidence boundary/);
  assert.match(project.longDescription, /customer names, deployment quantities/);
  assert.doesNotMatch(project.longDescription, /customer names?:? [A-Z]/);
  assert.doesNotMatch(project.longDescription, /\d+ deployments?/i);
});

test('canonical profile uses approved companies and precise tenure wording', () => {
  assert.equal(defaultProfile.experience[0]?.company, 'Sismo Smart');
  assert.equal(
    defaultProfile.experience[1]?.company,
    'Confidential renewable-energy startup',
  );

  const authoredProfile = [
    defaultProfile.heroDescription,
    ...defaultProfile.bio,
    ...defaultProfile.experience.flatMap((item) => [
      item.description,
      ...item.points,
    ]),
  ].join(' ');
  assert.match(
    authoredProfile,
    /Over a decade building connected and embedded systems, including recent edge-AI and computer-vision products\./,
  );
  assert.doesNotMatch(authoredProfile, /shipping IoT and edge-AI/i);
});

test('content migration covers every canonical project and published article exactly once', async () => {
  const migration = await readFile(
    new URL('../lib/db/migrations/20260720211708_seo-content-authority/migration.sql', import.meta.url),
    'utf8',
  );

  for (const slug of Object.keys(projectAuthoritySections).filter(
    (projectSlug) => projectSlug !== 'sismo-smart',
  )) {
    assert.equal(migration.split(`$authority$${slug}$authority$`).length - 1, 1, slug);
  }
  for (const slug of Object.keys(articleAuthoritySections)) {
    assert.equal(migration.split(`$authority$${slug}$authority$`).length - 1, 1, slug);
  }

  assert.match(migration, /UPDATE "profile"/);
  assert.match(migration, /UPDATE "site_settings"/);
  assert.match(migration, /position\('## Evidence you can inspect'/);
  assert.match(migration, /position\('## Applied evidence and related work'/);
  assert.doesNotMatch(migration, /Custom SQL migration file/);
});

function portfolioLiterals(sql: string): string[] {
  return [...sql.matchAll(/\$portfolio\$([\s\S]*?)\$portfolio\$/g)].map(
    (match) => match[1] ?? '',
  );
}

function parsedPortfolioJson(sql: string): unknown[] {
  return portfolioLiterals(sql).flatMap((literal) => {
    try {
      return [JSON.parse(literal)];
    } catch {
      return [];
    }
  });
}

test('portfolio revision migration matches canonical profile and Sismo data', async () => {
  const migration = await readFile(
    new URL(
      '../lib/db/migrations/20260727000000_portfolio_content_revision/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );
  const sismo = defaultProjects.find((project) => project.slug === 'sismo-smart');
  const productionFirstArticle = defaultPosts.find(
    (post) => post.slug === 'production-first-edge-ai',
  );
  assert.ok(sismo);
  assert.ok(productionFirstArticle);

  assert.match(migration, /ADD COLUMN "education" jsonb DEFAULT '\[\]' NOT NULL/);
  assert.match(migration, /profile_education_shape_check/);
  assert.match(migration, /UPDATE "profile"/);
  assert.match(migration, /INSERT INTO "projects"/);
  assert.match(migration, /ON CONFLICT \("slug"\) DO UPDATE/);
  assert.match(migration, /Confidential renewable-energy startup/);
  assert.match(migration, /Sismo Smart/);
  assert.match(migration, /Ege University/);
  assert.match(migration, /Middle East Technical University/);
  assert.match(migration, /UPDATE "posts"/);
  assert.match(migration, new RegExp(productionFirstArticle.excerpt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(migration, /shipping IoT and edge-AI/i);
  assert.doesNotMatch(migration, /dev\.to\/oaslananka/);
  assert.doesNotMatch(migration, /resume_url\s*=/);

  const parsed = parsedPortfolioJson(migration);
  for (const expected of [
    defaultProfile.experience,
    defaultProfile.education,
    sismo.tags,
    sismo.outcomes,
    sismo.media,
    sismo.links,
  ]) {
    const actual = parsed.find(
      (candidate) => JSON.stringify(candidate) === JSON.stringify(expected),
    );
    assert.deepEqual(actual, expected);
  }
});

test('verified identity profiles cover every canonical public account', async () => {
  const expected = new Map([
    ['github', 'https://github.com/oaslananka'],
    ['linkedin', 'https://www.linkedin.com/in/oaslananka'],
    ['pypi', 'https://pypi.org/user/oaslananka/'],
    ['npm', 'https://www.npmjs.com/~oaslananka'],
    ['peerlist', 'https://peerlist.io/oaslananka'],
  ]);

  for (const [platform, url] of expected) {
    const matches = defaultProfile.socials.filter(
      (social) => social.platform === platform,
    );
    assert.equal(matches.length, 1, platform);
    assert.equal(matches[0]?.url, url, platform);
  }

  assert.deepEqual(
    CANONICAL_IDENTITY_PROFILES.map(({ platform, url }) => [platform, url]),
    [...expected],
  );
});
