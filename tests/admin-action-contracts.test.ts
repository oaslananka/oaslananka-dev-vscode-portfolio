import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const actionDirectory = path.join(process.cwd(), 'lib/admin/actions');
const expectedModules = {
  'auth.ts': ['login', 'logout'],
  'profile.ts': ['updateProfile'],
  'settings.ts': ['updateSettings'],
  'projects.ts': ['saveProject', 'deleteProject'],
  'posts.ts': ['savePost', 'deletePost'],
  'messages.ts': ['markMessageRead', 'deleteMessage'],
} as const;

function functionBody(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} must be exported`);
  const next = source.indexOf('\nexport async function ', start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test('admin mutations are split into cohesive domain modules', () => {
  assert.equal(fs.existsSync(actionDirectory), true, 'domain action directory must exist');

  for (const [file, functions] of Object.entries(expectedModules)) {
    const source = fs.readFileSync(path.join(actionDirectory, file), 'utf8');
    for (const name of functions) {
      assert.match(source, new RegExp(`export async function ${name}\\b`));
    }

    for (const [otherFile, otherFunctions] of Object.entries(expectedModules)) {
      if (otherFile === file) continue;
      for (const name of otherFunctions) {
        assert.doesNotMatch(source, new RegExp(`export async function ${name}\\b`));
      }
    }
  }
});

test('every protected mutation authenticates before database access', () => {
  for (const [file, functions] of Object.entries(expectedModules)) {
    const source = fs.readFileSync(path.join(actionDirectory, file), 'utf8');
    for (const name of functions) {
      if (name === 'login') continue;
      const body = functionBody(source, name);
      const authIndex = body.indexOf('await requireAuth()');
      const databaseIndex = body.indexOf('requireDb()');
      assert.ok(authIndex >= 0, `${name} must require authentication`);
      if (databaseIndex >= 0) {
        assert.ok(authIndex < databaseIndex, `${name} must authenticate before database access`);
      }
    }
  }
});

test('admin mutations authenticate and delegate to the common content service', () => {
  for (const [file, operations] of Object.entries({
    'profile.ts': ['saveProfileContent'],
    'settings.ts': ['saveSettingsContent'],
    'projects.ts': ['saveProjectContent', 'deleteProjectContent'],
    'posts.ts': ['savePostContent', 'deletePostContent'],
  })) {
    const source = fs.readFileSync(path.join(actionDirectory, file), 'utf8');
    for (const operation of operations) {
      assert.ok(source.includes(`${operation}(`), `${operation} must be delegated`);
    }
  }
  const service = fs.readFileSync('lib/content-management/mutations.ts', 'utf8');
  assert.match(service, /revalidatePath\(/);
  assert.match(service, /scheduleIndexNow\(/);
  assert.match(service, /revalidateDiscoveryPaths\(/);
  assert.match(service, /import 'server-only'/);
});
