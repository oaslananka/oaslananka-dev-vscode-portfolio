import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CANONICAL_IDENTITY_PROFILES,
  personIdentityStatement,
  publicIdentityProfiles,
} from '../lib/person-identity';

test('person identity statement selects a natural English article', () => {
  assert.equal(
    personIdentityStatement('Osman Aslan', 'Edge AI & Embedded Systems Engineer'),
    'Osman Aslan, known online as oaslananka, is an Edge AI & Embedded Systems Engineer.',
  );
  assert.equal(
    personIdentityStatement('Osman Aslan', 'Software Engineer'),
    'Osman Aslan, known online as oaslananka, is a Software Engineer.',
  );
});


test('availability copy is specific and stable', async () => {
  const { profileAvailabilityCopy } = await import('../lib/profile-content');

  assert.equal(
    profileAvailabilityCopy(true),
    'Open to senior software, edge AI, embedded systems and technical leadership roles; selected consulting engagements considered.',
  );
  assert.equal(
    profileAvailabilityCopy(false),
    'Not currently available for new work.',
  );
});

test('public contact channels are deterministic and exclude legacy duplicates', async () => {
  const { publicContactChannels } = await import('../lib/person-identity');
  const socials = [
    { platform: 'github', label: 'GitHub account', url: 'https://github.com/oaslananka' },
    { platform: 'linkedin', label: 'LinkedIn profile', url: 'https://www.linkedin.com/in/oaslananka' },
    { platform: 'dev', label: 'DEV', url: ['https://dev.to', 'oaslananka'].join('/') },
    { platform: 'website', label: 'Website', url: 'https://www.oaslananka.dev' },
    { platform: 'email', label: 'Duplicate email', url: 'mailto:legacy@example.com' },
  ];

  const channels = publicContactChannels({
    email: ' info@oaslananka.dev ',
    socials,
  });

  assert.deepEqual(
    channels.map(({ platform, label }: { platform: string; label: string }) => ({
      platform,
      label,
    })),
    [
      { platform: 'email', label: 'Email' },
      { platform: 'linkedin', label: 'LinkedIn' },
      { platform: 'github', label: 'GitHub' },
    ],
  );
  assert.equal(channels[0]?.url, 'mailto:info@oaslananka.dev');
  assert.equal(channels.some((channel: { platform: string }) => channel.platform === 'dev'), false);
});

test('DEV is absent from canonical and public identity profiles', () => {
  assert.equal(
    CANONICAL_IDENTITY_PROFILES.some((social) => social.platform === 'dev'),
    false,
  );
  assert.equal(
    publicIdentityProfiles([
      { platform: 'dev', label: 'DEV', url: ['https://dev.to', 'oaslananka'].join('/') },
      { platform: 'github', label: 'GitHub', url: 'https://github.com/oaslananka' },
    ]).some((social) => social.platform === 'dev'),
    false,
  );
});
