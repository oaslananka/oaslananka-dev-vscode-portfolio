import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultProfile, defaultSettings } from '../lib/db/defaults';
import {
  parseAgentDraftPostInput,
  parseAgentPostInput,
  parseAgentProfileInput,
  parseAgentProjectInput,
  parseAgentSettingsInput,
} from '../lib/content-management/json-input';

const settings = { ...defaultSettings, defaultTheme: 'github-dark' as const };

const project = {
  slug: 'sample-project', title: 'Sample', description: 'Current description',
  longDescription: '', role: '', logo: '', coverImage: '', coverImageAlt: '',
  link: '', repo: '', tags: [], outcomes: [], media: [], links: [],
  featured: false, sortOrder: 0,
};
const post = {
  slug: 'sample-post', title: 'Sample', excerpt: '', body: 'Previous text',
  coverImage: '', tags: [], published: false,
  publishedAt: new Date('2026-01-01T10:00:00.000Z'),
};

test('agent patch replaces only requested fields without deleting existing data', () => {
  const updatedProfile = parseAgentProfileInput({ role: 'Engineer' }, defaultProfile);
  assert.equal(updatedProfile.role, 'Engineer');
  assert.equal(updatedProfile.name, defaultProfile.name);
  assert.deepEqual(updatedProfile.education, defaultProfile.education);

  const updatedProject = parseAgentProjectInput({ description: 'Updated' }, project);
  assert.equal(updatedProject.description, 'Updated');
  assert.equal(updatedProject.slug, project.slug);
  assert.equal(updatedProject.sortOrder, project.sortOrder);

  const updatedSettings = parseAgentSettingsInput({ siteTitle: 'New title' }, settings);
  assert.equal(updatedSettings.siteTitle, 'New title');
  assert.deepEqual(updatedSettings.keywords, settings.keywords);
});

test('agent mutation validation rejects unknown fields and malformed payloads', () => {
  for (const value of [null, [], 42, '', {}]) {
    assert.throws(() => parseAgentProjectInput(value, project));
  }
  assert.throws(() => parseAgentProfileInput({ id: 2 }, defaultProfile), /Unsupported content field: id/);
  assert.throws(() => parseAgentProjectInput({ updatedAt: '2026-01-01' }, project), /Unsupported content field/);
  assert.throws(() => parseAgentSettingsInput({ defaultTheme: 'bad-theme' }, settings));
  assert.throws(() => parseAgentProjectInput({ coverImage: '/cover.png' }, project), /coverImageAlt/);
  assert.throws(() => parseAgentProjectInput({ tags: Array.from({ length: 40 }, (_, i) => String(i)) }, project));
});

test('post JSON dates must be valid UTC timestamps and complete schemas remain enforced', () => {
  const changed = parseAgentPostInput({ publishedAt: '2026-10-16T12:00:00.000Z', body: 'Updated' }, post);
  assert.equal(changed.publishedAt.toISOString(), '2026-10-16T12:00:00.000Z');
  assert.equal(changed.body, 'Updated');
  assert.equal(changed.published, false);

  for (const date of ['not-a-date', '2026-10-16', '2026-10-16T12:00:00+03:00', '2101-01-01T00:00:00.000Z', 123]) {
    assert.throws(() => parseAgentPostInput({ publishedAt: date }, post));
  }
  assert.throws(() => parseAgentPostInput({ published: true }));
  assert.equal(parseAgentPostInput({ ...post, publishedAt: post.publishedAt.toISOString() }).slug, post.slug);
});


test('creating articles only permits unpublished, validated content', () => {
  const draft = parseAgentDraftPostInput({ title: 'Draft article', slug: 'draft-article', body: '# Preview' });
  assert.equal(draft.published, false);
  assert.equal(draft.publishedAt instanceof Date, true);
  assert.equal(draft.excerpt, '');
  assert.deepEqual(draft.tags, []);
  for (const patch of [
    { title: 'Title', slug: 'draft', published: true },
    { title: 'Title', slug: 'draft', published: false },
    { title: 'Title', slug: 'draft', publishedAt: '2026-10-16T00:00:00Z' },
    { title: 'Title', slug: '../escape' },
    { slug: 'draft', title: 'Title', createdAt: 'fake' },
    { slug: 'draft' },
  ]) {
    assert.throws(() => parseAgentDraftPostInput(patch));
  }
});
