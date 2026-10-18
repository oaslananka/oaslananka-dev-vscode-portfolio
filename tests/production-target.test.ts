import assert from 'node:assert/strict';
import test from 'node:test';

import type { QueryResultRow } from 'pg';

import {
  assertProductionDatabaseIdentity,
  assertProductionDatabaseUrls,
  ProductionTargetError,
  productionGuardRequired,
  readProductionDatabaseTarget,
} from '../lib/db/production-target';

const configured = {
  PRODUCTION_NEON_PROJECT_ID: 'jolly-mode-32445173',
  PRODUCTION_NEON_BRANCH_ID: 'br-twilight-bar-as3ibvq8',
  PRODUCTION_NEON_ENDPOINT_ID: 'ep-noisy-mode-ass01uqp',
  PRODUCTION_DATABASE_NAME: 'neondb',
};
const unpooled = 'postgresql://secret:do-not-print@ep-noisy-mode-ass01uqp.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const pooled = 'postgresql://secret:do-not-print@ep-noisy-mode-ass01uqp-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';

test('production and pinned migration environments enforce identity while preview does not', () => {
  assert.equal(productionGuardRequired({ VERCEL_ENV: 'production' }), true);
  assert.equal(productionGuardRequired({ NODE_ENV: 'production' }), true);
  assert.equal(productionGuardRequired(configured), true);
  assert.equal(productionGuardRequired({ NODE_ENV: 'production', VERCEL_ENV: 'preview' }), false);
  assert.equal(readProductionDatabaseTarget({ NODE_ENV: 'production', VERCEL_ENV: 'preview' }), null);
  assert.equal(readProductionDatabaseTarget({}), null);
});

test('missing or partial pin fails closed in production', () => {
  for (const env of [{ VERCEL_ENV: 'production' }, {
    ...configured,
    PRODUCTION_NEON_BRANCH_ID: '',
  }]) {
    assert.throws(
      () => readProductionDatabaseTarget(env),
      (error: unknown) => error instanceof ProductionTargetError && /incomplete/.test(error.message),
    );
  }
  assert.throws(
    () => readProductionDatabaseTarget({ ...configured, PRODUCTION_NEON_ENDPOINT_ID: 'not-a-neon-id' }),
    /invalid identifier/,
  );
});

test('both pooled and unpooled URLs are checked against the pinned compute', () => {
  const target = readProductionDatabaseTarget(configured);
  assert.ok(target);
  assert.doesNotThrow(() => assertProductionDatabaseUrls({
    DATABASE_URL_UNPOOLED: unpooled,
    DATABASE_URL: pooled,
  }, target));
  for (const url of [
    unpooled.replace('ep-noisy-mode-ass01uqp', 'ep-odd-sound-asxtee1z'),
    unpooled.replace('/neondb', '/otherdb'),
    'postgresql://secret:do-not-print@somewhere.example.com/neondb',
    'not even a URL',
  ]) {
    assert.throws(() => assertProductionDatabaseUrls({
      DATABASE_URL_UNPOOLED: url,
    }, target), (error: unknown) => {
      assert.ok(error instanceof ProductionTargetError);
      assert.doesNotMatch(error.message, /do-not-print|somewhere.example.com/);
      return true;
    });
  }
  assert.throws(() => assertProductionDatabaseUrls({}, target), /connection is missing/);
});

function mockSession(identity: {
  project_id: string | null;
  branch_id: string | null;
  endpoint_id: string | null;
  database_name: string | null;
}) {
  return {
    query: async <T extends QueryResultRow = QueryResultRow>() => ({
      rows: [identity as unknown as T],
    }),
  };
}
const session = {
  project_id: configured.PRODUCTION_NEON_PROJECT_ID,
  branch_id: configured.PRODUCTION_NEON_BRANCH_ID,
  endpoint_id: configured.PRODUCTION_NEON_ENDPOINT_ID,
  database_name: configured.PRODUCTION_DATABASE_NAME,
};

test('read-only Neon session identity matches explicit branch rather than Neon default', async () => {
  const target = readProductionDatabaseTarget(configured);
  assert.ok(target);
  await assert.doesNotReject(() => assertProductionDatabaseIdentity(mockSession(session), target));
  for (const value of [
    { ...session, branch_id: 'br-morning-hall-asyn6s2a' },
    { ...session, project_id: 'jolly-mode-other1234' },
    { ...session, endpoint_id: 'ep-odd-sound-asxtee1z' },
    { ...session, database_name: 'otherdb' },
    { ...session, branch_id: null },
  ]) {
    await assert.rejects(
      () => assertProductionDatabaseIdentity(mockSession(value), target),
      (error: unknown) => error instanceof ProductionTargetError && /database|Neon/.test(error.message),
    );
  }
});

test('database identity query errors cannot leak credentials', async () => {
  const target = readProductionDatabaseTarget(configured);
  assert.ok(target);
  await assert.rejects(
    () => assertProductionDatabaseIdentity({
      query: async () => { throw new Error('postgresql://secret:do-not-print@example.org/neondb'); },
    }, target),
    (error: unknown) => {
      assert.ok(error instanceof ProductionTargetError);
      assert.doesNotMatch(error.message, /secret|password|example.org/);
      return true;
    },
  );
});
