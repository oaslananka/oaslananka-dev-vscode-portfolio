import { createServer } from 'node:http';
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { createReadStream, constants } from 'node:fs';
import { mkdir, open, readdir, stat, lstat, rename, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TYPES = Object.freeze({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' });
const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
const NAME = /^\/files\/([a-f0-9]{64})\.(png|jpg|webp)$/;
const MAX = 2 * 1024 * 1024;
const LIMIT = 512 * 1024 * 1024;

function reply(res, status, payload) {
  const bytes = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': bytes.length,
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(bytes);
}
function authorized(value, expected) {
  if (!expected || Buffer.byteLength(expected) < 32 || !value || value.length > 8192) return false;
  const m = /^Bearer ([\x21-\x7e]+)$/.exec(value);
  return Boolean(m && timingSafeEqual(createHash('sha256').update(m[1]).digest(),
    createHash('sha256').update(expected).digest()));
}
function dimensions(w, h) {
  return w > 0 && h > 0 && w <= 8192 && h <= 8192 && w * h <= 20_000_000;
}
function validPng(b) {
  return b.length >= 45
    && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && b.toString('ascii', 12, 16) === 'IHDR'
    && b.readUInt32BE(8) === 13
    && dimensions(b.readUInt32BE(16), b.readUInt32BE(20))
    && b.subarray(-8, -4).toString('ascii') === 'IEND';
}
const JPEG_FRAME_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
function validJpeg(b) {
  if (b.length < 24 || b[0] !== 255 || b[1] !== 216 || b.at(-2) !== 255 || b.at(-1) !== 217) return false;
  for (let i = 2; i < b.length - 10;) {
    if (b[i++] !== 255) return false;
    while (b[i] === 255) i++;
    const marker = b[i++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x00 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (i + 2 > b.length) return false;
    const length = b.readUInt16BE(i);
    if (length < 2 || i + length > b.length) return false;
    if (JPEG_FRAME_MARKERS.has(marker)) {
      return length >= 7 && dimensions(b.readUInt16BE(i + 3), b.readUInt16BE(i + 5));
    }
    i += length;
  }
  return false;
}
function validWebp(b) {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF'
    || b.toString('ascii', 8, 12) !== 'WEBP' || b.readUInt32LE(4) !== b.length - 8) return false;
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return dimensions(1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3));
  if (kind === 'VP8 ') return dimensions(b.readUInt16LE(26) & 16383, b.readUInt16LE(28) & 16383);
  if (kind === 'VP8L' && b[20] === 47) return dimensions(
    1 + (((b[22] & 63) << 8) | b[21]),
    1 + (((b[24] & 15) << 10) | (b[23] << 2) | ((b[22] & 192) >> 6)));
  return false;
}
function validImage(data, mime) {
  switch (mime) {
    case 'image/png': return validPng(data);
    case 'image/jpeg': return validJpeg(data);
    case 'image/webp': return validWebp(data);
    default: return false;
  }
}
async function body(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2_900_000) { const err = new Error('too_large'); err.status = 413; throw err; }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
function imageInput(text) {
  let input;
  try { input = JSON.parse(text); } catch { return null; }
  if (!input || Array.isArray(input) || !Object.hasOwn(TYPES, input.mimeType)
    || typeof input.contentBase64 !== 'string'
    || input.contentBase64.length > Math.ceil(MAX / 3) * 4 + 4
    || input.contentBase64.length % 4
    || !/^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(input.contentBase64)) return null;
  const data = Buffer.from(input.contentBase64, 'base64');
  return data.length && data.length <= MAX && validImage(data, input.mimeType)
    ? { data, ext: TYPES[input.mimeType], mimeType: input.mimeType } : null;
}
async function usedBytes(root) {
  let total = 0;
  for (const f of await readdir(root)) {
    if (!/^[a-f0-9]{64}\.(png|jpg|webp)$/.test(f)) continue;
    const s = await stat(path.join(root, f));
    if (s.isFile()) total += s.size;
  }
  return total;
}
export function mediaServer({ root, token, publicOrigin, maxTotalBytes = LIMIT }) {
  if (!path.isAbsolute(root || '')) throw new Error('Storage must be absolute');
  if (Buffer.byteLength(token || '') < 32) throw new Error('A separate upload token is required');
  const origin = new URL(publicOrigin);
  if (origin.protocol !== 'https:' || origin.username || origin.password
    || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('HTTPS origin required');
  if (!Number.isSafeInteger(maxTotalBytes) || maxTotalBytes < 1 || maxTotalBytes > LIMIT) throw new Error('Quota invalid');
  const ready = mkdir(root, { recursive: true, mode: 0o700 });
  let queue = Promise.resolve();
  let windowStart = 0; let attempts = 0;
  return createServer(async (req, res) => {
    try {
      await ready;
      if (req.url === '/healthz' && req.method === 'GET') return reply(res, 200, { status: 'ok' });
      const name = NAME.exec(req.url || '');
      if (name && (req.method === 'GET' || req.method === 'HEAD')) {
        try {
          const filepath = path.join(root, name[1] + '.' + name[2]);
          const info = await lstat(filepath);
          if (!info.isFile()) throw new Error('Invalid file');
          const etag = '"' + name[1] + '"';
          const headers = { 'Content-Type': MIME[name[2]], 'Content-Length': info.size,
            'Cache-Control': 'public, max-age=31536000, immutable', ETag: etag,
            'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'cross-origin',
            'Content-Security-Policy': "default-src 'none'; sandbox" };
          if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
          res.writeHead(200, headers);
          if (req.method === 'HEAD') return res.end();
          return createReadStream(filepath, { flags: constants.O_RDONLY | constants.O_NOFOLLOW })
            .on('error', () => res.destroy()).pipe(res);
        } catch {
          return reply(res, 404, { error: 'not_found' });
        }
      }
      if (req.url === '/v1/media' && req.method === 'POST') {
        if (!authorized(req.headers.authorization, token)) return reply(res, 401, { error: 'unauthorized' });
        if (Date.now() - windowStart > 60_000) { windowStart = Date.now(); attempts = 0; }
        if (++attempts > 10) { res.setHeader('Retry-After', '60'); return reply(res, 429, { error: 'rate_limited' }); }
        if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || ''))
          return reply(res, 415, { error: 'unsupported_type' });
        const upload = imageInput(await body(req));
        if (!upload) return reply(res, 422, { error: 'invalid_image' });
        const hash = createHash('sha256').update(upload.data).digest('hex');
        const name = hash + '.' + upload.ext;
        const dest = path.join(root, name);
        const write = async () => {
          try { if ((await stat(dest)).isFile()) return false; } catch (e) { if (e.code !== 'ENOENT') throw e; }
          if ((await usedBytes(root)) + upload.data.length > maxTotalBytes) {
            const e = new Error('quota_exceeded'); e.status = 507; throw e;
          }
          const temp = path.join(root, '.pending-' + randomUUID());
          try {
            const fd = await open(temp, 'wx', 0o600);
            try { await fd.writeFile(upload.data); await fd.sync(); } finally { await fd.close(); }
            await rename(temp, dest);
          } finally { await unlink(temp).catch(() => {}); }
          return true;
        };
        const p = queue.then(write, write);
        queue = p.then(() => {}, () => {});
        const created = await p;
        return reply(res, created ? 201 : 200, {
          url: new URL('/files/' + name, origin).href, sha256: hash,
          mimeType: upload.mimeType, bytes: upload.data.length, created,
        });
      }
      return reply(res, 404, { error: 'not_found' });
    } catch (e) {
      if (res.headersSent) return res.destroy();
      return reply(res, e.status === 413 || e.status === 507 ? e.status : 500,
        { error: e.status === 413 || e.status === 507 ? e.message : 'internal_error' });
    }
  });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  mediaServer({ root: process.env.MEDIA_STORAGE_DIR || '/data',
    token: process.env.MEDIA_UPLOAD_TOKEN, publicOrigin: process.env.MEDIA_PUBLIC_ORIGIN,
  }).listen(Number(process.env.PORT || 8080), '0.0.0.0', () => process.stdout.write('media origin ready\n'));
}
