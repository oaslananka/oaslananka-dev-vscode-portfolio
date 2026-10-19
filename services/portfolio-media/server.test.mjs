import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mediaServer } from './server.mjs';

const token = 'unit-test-token-only-0123456789-abcdefghijklmnop';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+9XcAAAAASUVORK5CYII=', 'base64');
const headers = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };
async function fixture(extra = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'portfolio-media-'));
  const server = mediaServer({ root, token, publicOrigin: 'https://media.example.test/', ...extra });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const close = async () => { await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); };
  return { root, base, close };
}
const payload = () => JSON.stringify({ mimeType: 'image/png', contentBase64: png.toString('base64') });
test('configuration fails closed', () => {
  assert.throws(() => mediaServer({ root: '/tmp/media', token: 'short', publicOrigin: 'https://media.example.test/' }), /token/);
  assert.throws(() => mediaServer({ root: 'relative', token, publicOrigin: 'https://media.example.test/' }), /absolute/);
  assert.throws(() => mediaServer({ root: '/tmp/media', token, publicOrigin: 'http://media.example.test/' }), /HTTPS/);
  assert.throws(() => mediaServer({ root: '/tmp/media', token, publicOrigin: 'https://media.example.test/', maxTotalBytes: 1e10 }), /Quota/);
});
test('authenticated immutable image: write, read, HEAD, 304, duplicate, no listing', async () => {
  const f = await fixture();
  try {
    let r = await fetch(f.base + '/v1/media', { method: 'POST', headers, body: payload() });
    assert.equal(r.status, 201);
    const created = await r.json();
    assert.match(created.url, /^https:\/\/media\.example\.test\/files\/[0-9a-f]{64}\.png$/);
    assert.equal(created.created, true);
    const name = new URL(created.url).pathname;
    r = await fetch(f.base + name);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'image/png');
    assert.match(r.headers.get('cache-control'), /immutable/);
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), png);
    assert.deepEqual(await readFile(path.join(f.root, path.basename(name))), png);
    r = await fetch(f.base + name, { method: 'HEAD' });
    assert.equal(r.status, 200);
    r = await fetch(f.base + name, { headers: { 'If-None-Match': '"' + created.sha256 + '"' } });
    assert.equal(r.status, 304);
    r = await fetch(f.base + '/v1/media', { method: 'POST', headers, body: payload() });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).created, false);
    assert.equal((await fetch(f.base + '/files')).status, 404);
    assert.equal((await fetch(f.base + name + '?x=1')).status, 404);
  } finally { await f.close(); }
});
test('bad credentials, bad content and unsupported media fail closed', async () => {
  const f = await fixture();
  const post = (body, hdrs = headers) => fetch(f.base + '/v1/media', { method: 'POST', headers: hdrs, body });
  try {
    assert.equal((await post(payload(), { 'content-type': 'application/json' })).status, 401);
    assert.equal((await post(payload(), { ...headers, authorization: 'Bearer incorrect' })).status, 401);
    assert.equal((await post(payload(), { ...headers, 'content-type': 'text/plain' })).status, 415);
    assert.equal((await post(JSON.stringify({ mimeType: 'image/svg+xml', contentBase64: 'PHN2Zy8+' }))).status, 422);
    assert.equal((await post(JSON.stringify({ mimeType: 'image/png', contentBase64: 'PHNjcmlwdD4=' }))).status, 422);
    assert.equal((await post(JSON.stringify({ mimeType: 'image/jpeg', contentBase64: png.toString('base64') }))).status, 422);
  } finally { await f.close(); }
});
test('quota rejects and does not persist images', async () => {
  const f = await fixture({ maxTotalBytes: png.length - 1 });
  try {
    const r = await fetch(f.base + '/v1/media', { method: 'POST', headers, body: payload() });
    assert.equal(r.status, 507);
    assert.equal((await r.json()).error, 'quota_exceeded');
  } finally { await f.close(); }
});
