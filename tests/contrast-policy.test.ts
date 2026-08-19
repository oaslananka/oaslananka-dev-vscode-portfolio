import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function token(css: string, name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `Missing solid color token --${name}`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((value) => Number.parseInt(value, 16) / 255);
  assert.ok(channels && channels.length === 3);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (left, right) => right - left,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

test('semantic status tokens meet WCAG AA contrast', () => {
  const css = read('styles/themes.css');
  for (const state of ['success', 'error', 'warning']) {
    const ratio = contrast(
      token(css, `status-${state}-text`),
      token(css, `status-${state}-bg`),
    );
    assert.ok(ratio >= 4.5, `${state} contrast ${ratio.toFixed(2)} is below 4.5`);
  }
});

test('flagged content uses theme-safe text and status tokens', () => {
  const files = [
    'styles/ArticleCard.module.css',
    'styles/ContactForm.module.css',
    'styles/Admin.module.css',
    'styles/ArticlesPage.module.css',
    'styles/AboutPage.module.css',
  ];
  for (const file of files) {
    const css = read(file);
    assert.doesNotMatch(css, /color:\s*rgba\(255,\s*255,\s*255,\s*0\.[0-8]+\)/);
    assert.doesNotMatch(css, /color:\s*#(?:6ee7a0|ff9a9a|e6c07b)/i);
  }

  const contact = read('styles/ContactForm.module.css');
  assert.match(contact, /background:\s*var\(--status-success-bg\)/);
  assert.match(contact, /color:\s*var\(--status-success-text\)/);

  const admin = read('styles/Admin.module.css');
  for (const state of ['success', 'error', 'warning']) {
    assert.match(admin, new RegExp(`var\\(--status-${state}-text\\)`));
    assert.match(admin, new RegExp(`var\\(--status-${state}-bg\\)`));
  }
});
