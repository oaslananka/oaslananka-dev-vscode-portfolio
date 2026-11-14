import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const inspectNextConfig =
  "const loaded = await import('./next.config.ts'); " +
  'console.log(JSON.stringify(loaded.default.default.outputFileTracingExcludes ?? null));';

function tracedExclusions(vercel: boolean): Record<string, string[]> | null {
  const env = { ...process.env };
  if (vercel) env.VERCEL = '1';
  else delete env.VERCEL;

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', inspectNextConfig],
    { cwd: repositoryRoot, env, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const jsonLine = result.stdout.trim().split(/\r?\n/u).at(-1);
  assert.ok(jsonLine, 'Next config must emit a JSON result');
  return JSON.parse(jsonLine) as Record<string, string[]> | null;
}

test('Vercel excludes only non-glibc Sharp fallbacks from function traces', () => {
  const exclusions = tracedExclusions(true);
  assert.deepEqual(exclusions, {
    '/*': [
      './node_modules/@img/sharp-libvips-linuxmusl-x64/**/*',
      './node_modules/@img/sharp-linuxmusl-x64/**/*',
      './node_modules/@img/sharp-wasm32/**/*',
    ],
  });
  assert.ok(
    exclusions?.['/*']?.every((path) => !path.includes('sharp-libvips-linux-x64')),
    'The glibc libvips binary must remain available for native image generation',
  );
});

test('non-Vercel builds retain Sharp fallback tracing for portable deployments', () => {
  assert.equal(tracedExclusions(false), null);
});
