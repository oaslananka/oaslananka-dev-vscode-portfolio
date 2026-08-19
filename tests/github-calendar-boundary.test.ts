import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('GitHub calendar v5 is isolated behind a deferred client boundary', async () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
  ) as { dependencies: Record<string, string> };
  assert.match(packageJson.dependencies['react-github-calendar'], /^\^5\./);

  const calendarModule = await import('react-github-calendar');
  assert.ok(calendarModule.GitHubCalendar, 'v5 named export must exist');
  assert.equal(
    'default' in calendarModule,
    false,
    'v5 does not provide the legacy default export',
  );

  const page = fs.readFileSync(
    path.join(root, 'app/(site)/github/page.tsx'),
    'utf8',
  );
  assert.doesNotMatch(page, /from 'react-github-calendar'/);
  assert.match(page, /GitHubContributionCalendar/);

  const boundaryPath = path.join(
    root,
    'components/GitHubContributionCalendar.tsx',
  );
  assert.equal(fs.existsSync(boundaryPath), true);
  const boundary = fs.readFileSync(boundaryPath, 'utf8');
  assert.match(boundary, /^'use client';/);
  assert.match(boundary, /dynamic\([\s\S]*react-github-calendar/);
  assert.match(boundary, /IntersectionObserver/);
  assert.match(boundary, /aria-label=.*contribution calendar/i);
  assert.match(boundary, /labels=/);
});
