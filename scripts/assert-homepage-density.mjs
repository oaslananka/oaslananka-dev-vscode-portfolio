import { readFile } from 'node:fs/promises';

import {
  LOCAL_HOMEPAGE_TARGET,
  assertHomepageDensity,
  validateLocalHomepageTarget,
} from './homepage-density-policy.mjs';
import { measureHtmlDensity } from './report-html-density.mjs';

const LOCAL_HOMEPAGE_URL = new URL(
  `../${LOCAL_HOMEPAGE_TARGET}`,
  import.meta.url,
);

async function readTarget(target) {
  if (/^https?:\/\//i.test(target)) {
    const response = await fetch(target, {
      headers: { accept: 'text/html' },
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new Error(`Could not fetch ${target}: HTTP ${response.status}.`);
    }
    return { source: response.url, html: await response.text() };
  }

  validateLocalHomepageTarget(target);
  return {
    source: LOCAL_HOMEPAGE_TARGET,
    html: await readFile(LOCAL_HOMEPAGE_URL, 'utf8'),
  };
}

async function runCli() {
  const target = process.argv[2] ?? LOCAL_HOMEPAGE_TARGET;
  const { source, html } = await readTarget(target);
  const result = measureHtmlDensity(html);

  assertHomepageDensity(result);

  console.log(`homepage_density_source=${source}`);
  console.log(`homepage_density_percent=${result.ratioPercent}`);
  console.log(`homepage_html_bytes=${result.totalHtmlBytes}`);
  console.log(`homepage_brotli_bytes=${result.brotliHtmlBytes}`);
  console.log(`homepage_visible_text_characters=${result.visibleTextCharacters}`);
}

try {
  await runCli();
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Homepage density assertion failed.',
  );
  process.exitCode = 1;
}
