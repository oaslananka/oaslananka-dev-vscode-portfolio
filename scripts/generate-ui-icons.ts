import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { IconType } from 'react-icons';
import * as mdIcons from 'react-icons/md';
import * as siIcons from 'react-icons/si';
import * as vscIcons from 'react-icons/vsc';

import { UI_ICON_NAMES, UI_ICON_SOURCES } from '../lib/ui-icons';

const iconPackages = {
  md: mdIcons,
  si: siIcons,
  vsc: vscIcons,
} as const;

function attribute(openTag: string, name: string): string | undefined {
  return openTag.match(new RegExp(`\\s${name}="([^"]+)"`))?.[1];
}

function renderSymbol(name: (typeof UI_ICON_NAMES)[number]): string {
  const source = UI_ICON_SOURCES[name];
  const iconModule = iconPackages[source.package] as Record<string, unknown>;
  const Icon = iconModule[source.exportName] as IconType | undefined;

  if (!Icon) {
    throw new Error(
      `Icon export ${source.exportName} was not found in react-icons/${source.package}.`,
    );
  }

  const markup = renderToStaticMarkup(createElement(Icon, { size: 24 }));
  const openTagEnd = markup.indexOf('>');
  const closeTagStart = markup.lastIndexOf('</svg>');
  if (!markup.startsWith('<svg') || openTagEnd < 0 || closeTagStart < 0) {
    throw new Error(`Could not parse rendered icon ${source.exportName}.`);
  }

  const openTag = markup.slice(0, openTagEnd + 1);
  const body = markup.slice(openTagEnd + 1, closeTagStart);
  const viewBox = attribute(openTag, 'viewBox');
  if (!viewBox) {
    throw new Error(`Rendered icon ${source.exportName} has no viewBox.`);
  }

  const inheritedAttributes = ['fill', 'stroke', 'stroke-width']
    .map((key) => {
      const value = attribute(openTag, key);
      return value ? ` ${key}="${value}"` : '';
    })
    .join('');

  return `<symbol id="${name}" viewBox="${viewBox}"${inheritedAttributes}>${body}</symbol>`;
}

async function main(): Promise<void> {
  const target = path.resolve('public/icons/ui.svg');
  const symbols = UI_ICON_NAMES.map(renderSymbol).join('');
  const sprite =
    `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols}</svg>\n`;

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, sprite, 'utf8');
  console.log(`generated_icons=${UI_ICON_NAMES.length}`);
  console.log(`generated_path=${target}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Icon generation failed.');
  process.exitCode = 1;
});
