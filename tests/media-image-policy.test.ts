import assert from 'node:assert/strict';
import test from 'node:test';
import { ALLOWED_REMOTE_IMAGE_HOSTNAMES, isAllowedImageSource } from '../lib/image-policy';
import { buildPublicContentSecurityPolicy } from '../lib/content-security-policy';

test('self-hosted media allows only immutable, exact host HTTPS image paths', () => {
  const h = 'https://media.oaslananka.dev/files/' + 'a'.repeat(64);
  assert.equal(isAllowedImageSource(h + '.png'), true);
  assert.equal(isAllowedImageSource(h + '.jpg'), true);
  assert.equal(isAllowedImageSource(h + '.webp'), true);
  assert.equal(isAllowedImageSource(h + '.svg'), false);
  assert.equal(isAllowedImageSource(h + '.png?download=1'), false);
  assert.equal(isAllowedImageSource('http://' + h.slice(8) + '.png'), false);
  assert.equal(isAllowedImageSource('https://media.oaslananka.dev.evil.example/files/' + 'a'.repeat(64) + '.png'), false);
  assert.equal(isAllowedImageSource('https://media.oaslananka.dev/v1/media'), false);
  assert.equal(isAllowedImageSource('https://media.oaslananka.dev/files/../secrets.png'), false);
  assert.equal(isAllowedImageSource('https://media.oaslananka.dev:8080/files/' + 'a'.repeat(64) + '.png'), false);
  assert.equal(isAllowedImageSource('https://user:pass@media.oaslananka.dev/files/' + 'a'.repeat(64) + '.png'), false);
  assert.deepEqual([...ALLOWED_REMOTE_IMAGE_HOSTNAMES].sort(), [
    'avatars.githubusercontent.com', 'media.oaslananka.dev',
  ]);
});
test('public content policy allows only the exact media origin', () => {
  const csp = buildPublicContentSecurityPolicy({ production: true });
  assert.match(csp, /img-src [^;]*https:\/\/media\.oaslananka\.dev/);
  assert.doesNotMatch(csp, /https:\/\/\*\.oaslananka\.dev/);
});

