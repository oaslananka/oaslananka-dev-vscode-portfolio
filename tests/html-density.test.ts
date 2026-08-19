import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HOMEPAGE_DENSITY_POLICY,
  LOCAL_HOMEPAGE_TARGET,
  assertHomepageDensity,
  validateLocalHomepageTarget,
} from '../scripts/homepage-density-policy.mjs';
import { measureHtmlDensity } from '../scripts/report-html-density.mjs';

test('homepage density local target is restricted to the generated homepage', () => {
  assert.doesNotThrow(() => validateLocalHomepageTarget(LOCAL_HOMEPAGE_TARGET));
  assert.throws(
    () => validateLocalHomepageTarget('../secret.html'),
    /may only read/,
  );
});

test('homepage density policy protects concise copy and HTML payload independently', () => {
  assert.equal(HOMEPAGE_DENSITY_POLICY.minRatioPercent, 9.75);
  assert.equal(HOMEPAGE_DENSITY_POLICY.minVisibleTextCharacters, 8_000);
  assert.equal(HOMEPAGE_DENSITY_POLICY.maxBrotliHtmlBytes, 12_500);
});

test('homepage density policy accepts the exact guarded boundary', () => {
  assert.doesNotThrow(() =>
    assertHomepageDensity({
      ratioPercent: HOMEPAGE_DENSITY_POLICY.minRatioPercent,
      visibleTextCharacters: HOMEPAGE_DENSITY_POLICY.minVisibleTextCharacters,
      brotliHtmlBytes: HOMEPAGE_DENSITY_POLICY.maxBrotliHtmlBytes,
    }),
  );
});

test('homepage density policy rejects ratio and compressed-size regressions', () => {
  assert.throws(
    () =>
      assertHomepageDensity({
        ratioPercent: HOMEPAGE_DENSITY_POLICY.minRatioPercent - 0.01,
        visibleTextCharacters: HOMEPAGE_DENSITY_POLICY.minVisibleTextCharacters,
        brotliHtmlBytes: HOMEPAGE_DENSITY_POLICY.maxBrotliHtmlBytes,
      }),
    /text-to-HTML ratio/,
  );

  assert.throws(
    () =>
      assertHomepageDensity({
        ratioPercent: HOMEPAGE_DENSITY_POLICY.minRatioPercent,
        visibleTextCharacters: HOMEPAGE_DENSITY_POLICY.minVisibleTextCharacters,
        brotliHtmlBytes: HOMEPAGE_DENSITY_POLICY.maxBrotliHtmlBytes + 1,
      }),
    /Brotli HTML size/,
  );

  assert.throws(
    () =>
      assertHomepageDensity({
        ratioPercent: HOMEPAGE_DENSITY_POLICY.minRatioPercent,
        visibleTextCharacters:
          HOMEPAGE_DENSITY_POLICY.minVisibleTextCharacters - 1,
        brotliHtmlBytes: HOMEPAGE_DENSITY_POLICY.maxBrotliHtmlBytes,
      }),
    /visible text/,
  );
});

test('HTML density excludes executable and styling payloads from visible text', () => {
  const html = `<!doctype html>
<html><head>
<style>.hidden { display:none }</style>
<script>self.__next_f.push([1,"serialized text"])</script>
</head><body>
<!-- ignored comment -->
<main><h1>Edge &amp; AI</h1><p>Production systems.</p></main>
<svg viewBox="0 0 16 16"><path d="M0 0h16v16z" /></svg>
</body></html>`;

  const result = measureHtmlDensity(html);

  assert.equal(result.visibleText, 'Edge & AI Production systems.');
  assert.equal(result.visibleTextCharacters, 29);
  assert.ok(result.totalHtmlBytes > result.visibleTextCharacters);
  assert.ok(result.scriptBytes > 0);
  assert.ok(result.styleBytes > 0);
  assert.ok(result.svgBytes > 0);
  assert.equal(result.scriptCount, 1);
  assert.equal(result.svgCount, 1);
  assert.equal(
    result.ratioPercent,
    Number(((result.visibleTextCharacters / result.totalHtmlBytes) * 100).toFixed(2)),
  );
});

test('HTML density handles pages without readable text', () => {
  const result = measureHtmlDensity('<html><body><script>1</script></body></html>');

  assert.equal(result.visibleText, '');
  assert.equal(result.visibleTextCharacters, 0);
  assert.equal(result.ratioPercent, 0);
});

test('HTML density tolerates whitespace and extra tokens in closing tags', () => {
  const html = `<main>Visible content.</main>
<script>hidden script</script\t\n data-extra>
<style>hidden style</style\t data-extra>
<svg><text>hidden svg</text></svg\t data-extra>
<template>hidden template</template\t data-extra>
<noscript>hidden noscript</noscript\t data-extra>`;

  const result = measureHtmlDensity(html);

  assert.equal(result.visibleText, 'Visible content.');
  assert.equal(result.scriptCount, 1);
  assert.equal(result.styleCount, 1);
  assert.equal(result.svgCount, 1);
});
