import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultProfile } from '../lib/db/defaults';
import type { Profile } from '../lib/db/schema';
import { buildSiteShellData } from '../lib/site-shell';

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 1,
    ...defaultProfile,
    updatedAt: new Date('2026-07-21T00:00:00.000Z'),
    ...overrides,
  };
}

test('site shell projection serializes only fields used by persistent client UI', () => {
  const shell = buildSiteShellData(profile());

  assert.deepEqual(Object.keys(shell).sort(), [
    'bioIntroduction',
    'githubUrl',
    'name',
    'skills',
    'socials',
    'tagline',
  ]);
  assert.equal(shell.name, defaultProfile.name);
  assert.equal(shell.bioIntroduction, defaultProfile.bio[0]);
  assert.deepEqual(shell.skills, defaultProfile.skills);
  assert.deepEqual(
    shell.socials,
    defaultProfile.socials.map(({ platform, label }) => ({ platform, label })),
  );
  assert.equal(shell.githubUrl, 'https://github.com/oaslananka');
  assert.equal('experience' in shell, false);
  assert.equal('writing' in shell, false);
  assert.equal('heroDescription' in shell, false);
});

test('site shell ignores unsafe GitHub URLs and uses the neutral fallback', () => {
  const shell = buildSiteShellData(
    profile({
      socials: [
        { platform: 'github', label: 'unsafe', url: 'javascript:alert(1)' },
        { platform: 'linkedin', label: 'profile', url: 'https://linkedin.com/in/example' },
      ],
    }),
  );

  assert.equal(shell.githubUrl, 'https://github.com');
  assert.deepEqual(shell.socials, [
    { platform: 'github', label: 'unsafe' },
    { platform: 'linkedin', label: 'profile' },
  ]);
});
