import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
} from 'jose';

import {
  resolveAdminAccessConfig,
  verifyAdminAccessToken,
} from '../lib/admin-access';
import { proxy } from '../proxy';

const issuer = 'https://example.cloudflareaccess.com';
const audience = '0123456789abcdef';
const adminHost = 'admin.example.com';

const accessEnvironment = {
  ADMIN_ACCESS_HOST: 'admin.oaslananka.dev',
  CF_ACCESS_TEAM_DOMAIN: issuer,
  CF_ACCESS_AUD: audience,
  ADMIN_ACCESS_EMAILS: 'owner@example.com',
} as const;

async function withAccessEnvironment(
  callback: () => Promise<void>,
): Promise<void> {
  const previous = Object.fromEntries(
    Object.keys(accessEnvironment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, accessEnvironment);

  try {
    await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function signedToken(email: string, options?: { audience?: string }) {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = 'test-key';
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(issuer)
    .setAudience(options?.audience ?? audience)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
  return {
    token,
    keySet: createLocalJWKSet({ keys: [publicJwk] }),
  };
}

test('admin access remains disabled when no Cloudflare variables are configured', () => {
  assert.equal(resolveAdminAccessConfig({}), null);
});

test('partial Cloudflare configuration fails closed', () => {
  assert.throws(
    () => resolveAdminAccessConfig({ CF_ACCESS_TEAM_DOMAIN: issuer }),
    /must be configured together/,
  );
});

test('admin access configuration normalizes and deduplicates allowed emails', () => {
  const config = resolveAdminAccessConfig({
    ADMIN_ACCESS_HOST: adminHost,
    CF_ACCESS_TEAM_DOMAIN: `${issuer}/`,
    CF_ACCESS_AUD: audience,
    ADMIN_ACCESS_EMAILS: ' Owner@Example.com,owner@example.com\nadmin@example.com ',
  });

  assert.ok(config);
  assert.equal(config.host, adminHost);
  assert.equal(config.issuer, issuer);
  assert.deepEqual(config.allowedEmails, [
    'owner@example.com',
    'admin@example.com',
  ]);
});

test('admin access rejects malformed dedicated hosts safely', () => {
  for (const value of [
    'https://admin.example.com',
    'admin.example.com/path',
    'admin.example.com:443',
    'localhost',
    '.example.com',
  ]) {
    assert.throws(
      () =>
        resolveAdminAccessConfig({
          ADMIN_ACCESS_HOST: value,
          CF_ACCESS_TEAM_DOMAIN: issuer,
          CF_ACCESS_AUD: audience,
          ADMIN_ACCESS_EMAILS: 'owner@example.com',
        }),
      /ADMIN_ACCESS_HOST/,
    );
  }
});

test('configured admin access redirects admin routes to the dedicated host first', async () => {
  await withAccessEnvironment(async () => {
    const response = await proxy(
      new NextRequest('https://www.oaslananka.dev/admin/login?from=%2Fadmin'),
    );

    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get('location'),
      'https://admin.oaslananka.dev/admin/login?from=%2Fadmin',
    );
  });
});

test('dedicated admin host still requires a Cloudflare Access assertion', async () => {
  await withAccessEnvironment(async () => {
    const response = await proxy(
      new NextRequest('https://admin.oaslananka.dev/admin/login'),
    );

    assert.equal(response.status, 403);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });
});

test('valid Cloudflare Access JWT requires issuer, audience, and allowlisted email', async () => {
  const config = resolveAdminAccessConfig({
    ADMIN_ACCESS_HOST: adminHost,
    CF_ACCESS_TEAM_DOMAIN: issuer,
    CF_ACCESS_AUD: audience,
    ADMIN_ACCESS_EMAILS: 'owner@example.com',
  });
  assert.ok(config);

  const valid = await signedToken('Owner@Example.com');
  assert.equal(
    await verifyAdminAccessToken(valid.token, config, valid.keySet),
    true,
  );

  const deniedEmail = await signedToken('other@example.com');
  assert.equal(
    await verifyAdminAccessToken(deniedEmail.token, config, deniedEmail.keySet),
    false,
  );

  const wrongAudience = await signedToken('owner@example.com', {
    audience: 'wrong-audience',
  });
  assert.equal(
    await verifyAdminAccessToken(
      wrongAudience.token,
      config,
      wrongAudience.keySet,
    ),
    false,
  );
});


test('admin access rejects malformed email allowlists safely', () => {
  for (const value of [
    'missing-at.example.com',
    '@example.com',
    'owner@',
    'owner@example',
    'owner@@example.com',
    'owner @example.com',
  ]) {
    assert.throws(
      () =>
        resolveAdminAccessConfig({
          ADMIN_ACCESS_HOST: adminHost,
          CF_ACCESS_TEAM_DOMAIN: issuer,
          CF_ACCESS_AUD: audience,
          ADMIN_ACCESS_EMAILS: value,
        }),
      /valid email addresses/,
    );
  }
});

test('coverage policy includes the perimeter verifier', async () => {
  const { readFile } = await import('node:fs/promises');
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { scripts: Record<string, string> };
  assert.match(
    packageJson.scripts['test:coverage'],
    /--include='lib\/admin-access\.ts'/,
  );
});
