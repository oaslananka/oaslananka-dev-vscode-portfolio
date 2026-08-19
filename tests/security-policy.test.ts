import assert from 'node:assert/strict';
import test from 'node:test';
import { SignJWT } from 'jose';

import {
  SESSION_AUDIENCE,
  SESSION_ISSUER,
  SESSION_ROLE,
  getSecretKey,
  verifyToken,
} from '../lib/auth-edge';
import {
  ALLOWED_REMOTE_IMAGE_HOSTNAMES,
  isAllowedImageSource,
} from '../lib/image-policy';
import { DEFAULT_THEME, isThemeKey } from '../lib/themes';
import {
  isSafeHttpsUrl,
  isSafeResourceUrl,
  isSafeSocialUrl,
} from '../lib/url-policy';

test('theme keys accept only curated themes', () => {
  assert.equal(isThemeKey(DEFAULT_THEME), true);
  assert.equal(isThemeKey('dracula'), true);
  assert.equal(isThemeKey('unknown-theme'), false);
  assert.equal(isThemeKey("github-dark';alert(1);//"), false);
  assert.equal(isThemeKey(null), false);
});

test('image policy allows local public assets', () => {
  assert.equal(isAllowedImageSource(''), true);
  assert.equal(isAllowedImageSource('/themes/github-dark.png'), true);
  assert.equal(isAllowedImageSource('//evil.example/image.png'), false);
  assert.equal(isAllowedImageSource('/images\\evil.png'), false);
});

test('image policy allows only HTTPS URLs from the configured allowlist', () => {
  const allowedHost = ALLOWED_REMOTE_IMAGE_HOSTNAMES[0];

  assert.equal(
    isAllowedImageSource(`https://${allowedHost}/u/123?v=4`),
    true,
  );
  assert.equal(
    isAllowedImageSource(`http://${allowedHost}/u/123?v=4`),
    false,
  );
  assert.equal(
    isAllowedImageSource(`https://user:password@${allowedHost}/image.png`),
    false,
  );
  assert.equal(
    isAllowedImageSource('https://evil.example/image.png'),
    false,
  );
  assert.equal(isAllowedImageSource('javascript:alert(1)'), false);
});

test('public link policy rejects executable and credentialed URLs', () => {
  assert.equal(isSafeHttpsUrl('https://github.com/oaslananka'), true);
  assert.equal(isSafeHttpsUrl('http://github.com/oaslananka'), false);
  assert.equal(isSafeHttpsUrl('https://user:pass@example.com'), false);
  assert.equal(isSafeHttpsUrl('javascript:alert(1)'), false);

  assert.equal(isSafeResourceUrl('/resume.pdf'), true);
  assert.equal(isSafeResourceUrl('//evil.example/resume.pdf'), false);
  assert.equal(isSafeResourceUrl('/resume\\evil.pdf'), false);

  assert.equal(isSafeSocialUrl('mailto:info@oaslananka.dev'), true);
  assert.equal(isSafeSocialUrl('mailto:not-an-address'), false);
  assert.equal(isSafeSocialUrl('data:text/html,hello'), false);
});

test('admin sessions require a strong secret and exact JWT claims', async () => {
  const originalSecret = process.env.AUTH_SECRET;

  try {
    process.env.AUTH_SECRET = 'too-short';
    assert.throws(() => getSecretKey(), /at least 32 bytes/);

    process.env.AUTH_SECRET = 'test-auth-secret-with-at-least-32-bytes';
    const validToken = await new SignJWT({ role: SESSION_ROLE })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('admin')
      .setIssuer(SESSION_ISSUER)
      .setAudience(SESSION_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(getSecretKey());
    assert.equal(await verifyToken(validToken), true);

    const wrongRoleToken = await new SignJWT({ role: 'viewer' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('admin')
      .setIssuer(SESSION_ISSUER)
      .setAudience(SESSION_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(getSecretKey());
    assert.equal(await verifyToken(wrongRoleToken), false);

    const wrongAudienceToken = await new SignJWT({ role: SESSION_ROLE })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('admin')
      .setIssuer(SESSION_ISSUER)
      .setAudience('another-app')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(getSecretKey());
    assert.equal(await verifyToken(wrongAudienceToken), false);
  } finally {
    if (originalSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = originalSecret;
  }
});
