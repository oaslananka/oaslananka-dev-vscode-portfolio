import { Client } from 'pg';

import {
  assertProductionDatabaseIdentity,
  assertProductionDatabaseUrls,
  ProductionTargetError,
  readProductionDatabaseTarget,
  readReleaseContentFingerprint,
} from '../lib/db/production-target';
import { resolveDatabaseUrl } from '../lib/db/preflight';

export async function verifyReleaseTarget(
  env: NodeJS.ProcessEnv,
): Promise<string> {
  const target = readProductionDatabaseTarget(env);
  if (!target) {
    throw new ProductionTargetError(
      'A production identity pin is mandatory for release and migration commands.',
    );
  }
  assertProductionDatabaseUrls(env, target);
  const connection = resolveDatabaseUrl(env);
  const client = new Client({
    connectionString: connection,
    connectionTimeoutMillis: 6_000,
    statement_timeout: 18_000,
    application_name: 'portfolio-release-target-preflight',
  });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const readOnly = await client.query<{ transaction_read_only: string }>(
      'SHOW transaction_read_only',
    );
    if (readOnly.rows[0]?.transaction_read_only !== 'on') {
      throw new ProductionTargetError('Release target verification requires a read-only transaction.');
    }
    await assertProductionDatabaseIdentity(client, target);
    const fingerprint = await readReleaseContentFingerprint(client);
    await client.query('ROLLBACK');
    return fingerprint;
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    await client.end().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  const fingerprint = await verifyReleaseTarget(process.env);
  if (process.argv.includes('--print-fingerprint')) {
    console.log(`[release:target] content-fingerprint sha256:${fingerprint}`);
  } else {
    const expected = process.env.RELEASE_EXPECTED_CONTENT_FINGERPRINT?.trim();
    if (!expected || !/^[a-f0-9]{64}$/.test(expected)) {
      throw new ProductionTargetError(
        'RELEASE_EXPECTED_CONTENT_FINGERPRINT is required for a production migration; run release:target:fingerprint first.',
      );
    }
    if (fingerprint !== expected) {
      throw new ProductionTargetError(
        'Production content changed since release approval. Recheck the live backup and fingerprint before migration.',
      );
    }
    console.log('[release:target] approved Neon identity and content fingerprint verified read-only.');
  }
}

main().catch((error: unknown) => {
  const message = error instanceof ProductionTargetError
    ? error.message
    : 'Could not verify the production release target.';
  console.error(`[release:target] blocked: ${message}`);
  process.exitCode = 2;
});
