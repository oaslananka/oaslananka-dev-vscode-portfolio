import fs from 'node:fs';
import zlib from 'node:zlib';

const manifestPath =
  '.next/server/app/(site)/github/page_client-reference-manifest.js';
const routeKey = '/(site)/github/page';
const entryKey = '[project]/app/(site)/github/page';

if (!fs.existsSync(manifestPath)) {
  throw new Error('Build the app before reporting the GitHub route bundle.');
}

const manifestSource = fs.readFileSync(manifestPath, 'utf8');
const assignment = `globalThis.__RSC_MANIFEST[${JSON.stringify(routeKey)}] = `;
const manifestStart = manifestSource.indexOf(assignment);
const manifestEnd = manifestSource.lastIndexOf(';');
if (manifestStart < 0 || manifestEnd <= manifestStart) {
  throw new Error(`Missing RSC manifest entry: ${routeKey}`);
}
const manifest = JSON.parse(
  manifestSource.slice(manifestStart + assignment.length, manifestEnd),
);

function measurements(files) {
  const rows = [...new Set(files)]
    .sort((left, right) => left.localeCompare(right))
    .map((file) => {
      const normalized = file.replace(/^\/_next\//, '');
      const content = fs.readFileSync(`.next/${normalized}`);
      return {
        file: normalized,
        raw: content.length,
        gzip: zlib.gzipSync(content).length,
        brotli: zlib.brotliCompressSync(content).length,
      };
    });

  return {
    files: rows,
    total: rows.reduce(
      (sum, row) => ({
        raw: sum.raw + row.raw,
        gzip: sum.gzip + row.gzip,
        brotli: sum.brotli + row.brotli,
      }),
      { raw: 0, gzip: 0, brotli: 0 },
    ),
  };
}

const initialFiles = manifest.entryJSFiles?.[entryKey] ?? [];
const initialSet = new Set(
  initialFiles.map((file) => file.replace(/^\/_next\//, '')),
);
const loadableManifestPath =
  '.next/server/app/(site)/github/page/react-loadable-manifest.json';
const loadableManifest = JSON.parse(
  fs.readFileSync(loadableManifestPath, 'utf8'),
);
const deferredCalendarFiles = Object.values(loadableManifest)
  .filter(({ files }) =>
    files.some((file) => {
      if (!file.endsWith('.js')) return false;
      const content = fs.readFileSync(`.next/${file}`, 'utf8');
      return content.includes('github-contributions-api.jogruber.de');
    }),
  )
  .flatMap(({ files }) => files.filter((file) => file.endsWith('.js')))
  .filter((file) => !initialSet.has(file));

console.log(
  JSON.stringify(
    {
      route: '/github',
      initial: measurements(initialFiles),
      deferredCalendar: measurements(deferredCalendarFiles),
    },
    null,
    2,
  ),
);
