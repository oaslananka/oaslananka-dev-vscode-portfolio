import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultProfile, defaultSettings } from '../lib/db/defaults';
import {
  restorePostInput,
  restoreProfileInput,
  restoreProjectInput,
  restoreSettingsInput,
} from '../lib/content-management/history-input';
import { assertExpectedRevision } from '../lib/content-management/revision';

const projectRow = {
  id: 42,
  revision: 2,
  slug: 'history-project',
  title: 'Original project',
  description: 'Verified project',
  long_description: 'History body',
  role: '', logo: '', cover_image: '', cover_image_alt: '',
  link: '', repo: '', tags: [], outcomes: [], media: [], links: [],
  featured: false, sort_order: 0,
};

test('history snapshot mapping preserves complete project and article input', () => {
  const project = restoreProjectInput(projectRow);
  assert.equal(project.title, 'Original project');
  assert.equal(project.longDescription, 'History body');
  assert.equal(project.slug, 'history-project');
  assert.equal('id' in project, false);
  assert.equal('revision' in project, false);

  const article = restorePostInput({
    id: 1, revision: 3, slug: 'history-article', title: 'Article',
    excerpt: 'Short', body: '# Original', cover_image: '', tags: [],
    published: false, published_at: '2026-10-16T15:30:00+00:00',
  });
  assert.equal(article.publishedAt.toISOString(), '2026-10-16T15:30:00.000Z');
  assert.equal(article.published, false);
  assert.equal('revision' in article, false);
});

test('history snapshots for profile and site settings preserve nested content', () => {
  const profileRow = Object.fromEntries(Object.entries(defaultProfile).map(([key, value]) => [
    key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), value,
  ]));
  const profile = restoreProfileInput(profileRow);
  assert.deepEqual(profile.education, defaultProfile.education);
  const settings = restoreSettingsInput({
    site_title: defaultSettings.siteTitle,
    site_description: defaultSettings.siteDescription,
    keywords: defaultSettings.keywords,
    default_theme: defaultSettings.defaultTheme,
    og_heading: defaultSettings.ogHeading,
  });
  assert.equal(settings.siteTitle, defaultSettings.siteTitle);
});

test('corrupt history and revision preconditions fail closed', () => {
  assert.throws(() => restoreProjectInput(null));
  assert.throws(() => restoreProjectInput({ ...projectRow, description: '' }));
  assert.throws(() => restoreProjectInput({ ...projectRow, cover_image: '/cover.png' }));
  assert.throws(() => restorePostInput({ slug: 'missing-fields' }));
  for (const value of [-1, 0, NaN, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => assertExpectedRevision(value));
  }
  assert.doesNotThrow(() => assertExpectedRevision(2));
});
