import { brotliCompressSync, gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const BLOCK_PATTERNS = {
  script: /<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi,
  style: /<style\b[^>]*>[\s\S]*?<\/style\b[^>]*>/gi,
  svg: /<svg\b[^>]*>[\s\S]*?<\/svg\b[^>]*>/gi,
};

function matchingBlocks(html, pattern) {
  return [...html.matchAll(new RegExp(pattern.source, pattern.flags))].map(
    (match) => match[0],
  );
}

function byteLength(value) {
  return Buffer.byteLength(value, 'utf8');
}

function decodeHtmlEntities(value) {
  const named = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi,
    (entity, decimal, hexadecimal, name) => {
      if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
      if (hexadecimal) {
        return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      }
      return named[name.toLowerCase()] ?? entity;
    },
  );
}

export function measureHtmlDensity(html) {
  const scripts = matchingBlocks(html, BLOCK_PATTERNS.script);
  const styles = matchingBlocks(html, BLOCK_PATTERNS.style);
  const svgs = matchingBlocks(html, BLOCK_PATTERNS.svg);
  const totalHtmlBytes = byteLength(html);

  const visibleText = decodeHtmlEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(BLOCK_PATTERNS.script, ' ')
      .replace(BLOCK_PATTERNS.style, ' ')
      .replace(/<(?:template|noscript)\b[^>]*>[\s\S]*?<\/(?:template|noscript)\b[^>]*>/gi, ' ')
      .replace(BLOCK_PATTERNS.svg, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
  const visibleTextCharacters = [...visibleText].length;

  return {
    totalHtmlBytes,
    gzipHtmlBytes: gzipSync(html).byteLength,
    brotliHtmlBytes: brotliCompressSync(html).byteLength,
    visibleText,
    visibleTextCharacters,
    ratioPercent:
      totalHtmlBytes === 0
        ? 0
        : Number(((visibleTextCharacters / totalHtmlBytes) * 100).toFixed(2)),
    scriptCount: scripts.length,
    scriptBytes: scripts.reduce((total, block) => total + byteLength(block), 0),
    styleCount: styles.length,
    styleBytes: styles.reduce((total, block) => total + byteLength(block), 0),
    svgCount: svgs.length,
    svgBytes: svgs.reduce((total, block) => total + byteLength(block), 0),
  };
}

async function runCli() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const target = args.find((argument) => !argument.startsWith('--'));
  if (!target) {
    throw new Error('Usage: npm run report:html-density -- <url> [--json]');
  }

  const url = new URL(target);
  const response = await fetch(url, {
    headers: { accept: 'text/html' },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`Could not fetch ${url}: HTTP ${response.status}.`);
  }

  const html = await response.text();
  const result = { url: response.url, ...measureHtmlDensity(html) };
  if (json) {
    console.log(JSON.stringify(result));
    return;
  }

  console.log(`url=${result.url}`);
  console.log(`html_bytes=${result.totalHtmlBytes}`);
  console.log(`html_gzip_bytes=${result.gzipHtmlBytes}`);
  console.log(`html_brotli_bytes=${result.brotliHtmlBytes}`);
  console.log(`visible_text_characters=${result.visibleTextCharacters}`);
  console.log(`text_to_html_percent=${result.ratioPercent}`);
  console.log(`script_count=${result.scriptCount}`);
  console.log(`script_bytes=${result.scriptBytes}`);
  console.log(`svg_count=${result.svgCount}`);
  console.log(`svg_bytes=${result.svgBytes}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : 'HTML density report failed.');
    process.exitCode = 1;
  });
}
