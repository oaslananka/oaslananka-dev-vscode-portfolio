import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { UI_ICON_NAMES, UI_ICON_SOURCES } from '../lib/ui-icons';

test('the generated public icon sprite covers the typed registry exactly once', async () => {
  const sprite = await readFile(new URL('../public/icons/ui.svg', import.meta.url), 'utf8');

  assert.equal(UI_ICON_NAMES.length, Object.keys(UI_ICON_SOURCES).length);
  assert.equal(new Set(UI_ICON_NAMES).size, UI_ICON_NAMES.length);

  for (const name of UI_ICON_NAMES) {
    const matches = sprite.match(new RegExp(`<symbol id="${name}"(?=\\s|>)`, 'g')) ?? [];
    assert.equal(matches.length, 1, `${name} must exist exactly once`);
  }

  assert.doesNotMatch(sprite, /<script\b/i);
  assert.doesNotMatch(sprite, /\son\w+=/i);
});

test('icon registry uses deterministic local names and known upstream packages', () => {
  for (const [name, source] of Object.entries(UI_ICON_SOURCES)) {
    assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(['vsc', 'si', 'md'].includes(source.package));
    assert.match(source.exportName, /^(?:Vsc|Si|Md)[A-Z]/);
  }
});

import { readdir, readFile as readTextFile } from 'node:fs/promises';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import UiIcon from '../components/UiIcon';

async function publicRuntimeFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (target.endsWith(`${path.sep}components${path.sep}admin`)) continue;
      files.push(...(await publicRuntimeFiles(target)));
    } else if (entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name)) {
      files.push(target);
    }
  }

  return files;
}

test('UiIcon renders one external sprite reference without inline path data', () => {
  const markup = renderToStaticMarkup(
    createElement(UiIcon, { name: 'arrow-right', size: 18, className: 'icon' }),
  );

  assert.match(markup, /<svg[^>]*width="18"[^>]*height="18"/);
  assert.match(markup, /<use href="\/icons\/ui\.svg\?v=1#arrow-right"><\/use>/);
  assert.doesNotMatch(markup, /<path\b/);
});

test('public runtime source does not inline React Icons components', async () => {
  const roots = [
    new URL('../app/(site)', import.meta.url),
    new URL('../components', import.meta.url),
  ];
  const violations: string[] = [];

  for (const root of roots) {
    for (const file of await publicRuntimeFiles(root.pathname)) {
      const source = await readTextFile(file, 'utf8');
      if (/from ['"]react-icons(?:\/[^'"]+)?['"]/.test(source)) {
        violations.push(path.relative(process.cwd(), file));
      }
    }
  }

  assert.deepEqual(violations, []);
});

test('icon sprite URL is versioned before receiving immutable caching', async () => {
  const { UI_ICON_SPRITE_CACHE_CONTROL, UI_ICON_SPRITE_PATH, UI_ICON_SPRITE_URL } =
    await import('../lib/static-assets');

  assert.equal(UI_ICON_SPRITE_PATH, '/icons/ui.svg');
  assert.match(UI_ICON_SPRITE_URL, /^\/icons\/ui\.svg\?v=\d+$/);
  assert.equal(
    UI_ICON_SPRITE_CACHE_CONTROL,
    'public, max-age=31536000, immutable',
  );
});
