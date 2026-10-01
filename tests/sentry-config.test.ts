import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { SENTRY_DATA_COLLECTION } from '../lib/sentry-data-collection';

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Sentry v11 preserves the restrictive v10 data-collection baseline', () => {
  assert.equal(SENTRY_DATA_COLLECTION.userInfo, false);
  assert.equal(SENTRY_DATA_COLLECTION.cookies, false);
  assert.deepEqual(SENTRY_DATA_COLLECTION.httpBodies, []);
  assert.equal(SENTRY_DATA_COLLECTION.genAI.inputs, false);
  assert.equal(SENTRY_DATA_COLLECTION.genAI.outputs, false);
  assert.equal(SENTRY_DATA_COLLECTION.databaseQueryData, false);
  assert.equal(SENTRY_DATA_COLLECTION.queues, false);
  assert.equal(SENTRY_DATA_COLLECTION.graphQL.document, false);
  assert.equal(SENTRY_DATA_COLLECTION.graphQL.variables, false);
});

test('Sentry v11 configuration uses the new config entry point and shared privacy policy', () => {
  assert.match(
    read('next.config.ts'),
    /withSentryConfig.*from '@sentry\/nextjs\/config'/,
  );

  for (const path of [
    'instrumentation-client.ts',
    'sentry.server.config.ts',
    'sentry.edge.config.ts',
  ]) {
    assert.match(read(path), /dataCollection: SENTRY_DATA_COLLECTION/);
    assert.doesNotMatch(read(path), /sendDefaultPii/);
  }
});
