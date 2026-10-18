/**
 * Read-only production baseline check ahead of separately authorized agent
 * credential onboarding. This command NEVER enables writers or approves edits.
 */
import { Client } from 'pg';

import {
  assertProductionDatabaseIdentity,
  assertProductionDatabaseUrls,
  readProductionDatabaseTarget,
} from '../lib/db/production-target';
import { resolveDatabaseUrl } from '../lib/db/preflight';
import { isAgentWriteConfigured } from '../lib/agent-api/write-policy';

const requiredMigrations = [
  '20261016193000_agent-write-identity',
  '20261016211500_agent-command-approval',
  '20261016213000_agent-proposal-workflow',
  '20261016214500_agent-draft-creation',
  '20261017002000_agent-project-publication',
] as const;

async function run(): Promise<void> {
  const target = readProductionDatabaseTarget(process.env);
  if (!target) throw new Error('Production database identity pin is required.');
  assertProductionDatabaseUrls(process.env, target);

  // Intentionally check the current state, not just the availability of the
  // feature flag. Secrets and credentials must never appear in output.
  const enabled = isAgentWriteConfigured({
    AGENT_CONTENT_WRITE_ENABLED: process.env.AGENT_CONTENT_WRITE_ENABLED,
    AGENT_API_SECRET_KEY: process.env.AGENT_API_SECRET_KEY,
    AGENT_API_WRITE_KEY: process.env.AGENT_API_WRITE_KEY,
    AGENT_WRITE_ACTOR_ID: process.env.AGENT_WRITE_ACTOR_ID,
  });
  const flagOn = process.env.AGENT_CONTENT_WRITE_ENABLED === 'true';
  const client = new Client({
    connectionString: resolveDatabaseUrl(process.env),
    connectionTimeoutMillis: 7_000,
    statement_timeout: 17_000,
    application_name: 'portfolio-agent-write-readiness-readonly',
  });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const ro = await client.query<{ transaction_read_only: string }>(
      'SHOW transaction_read_only',
    );
    if (ro.rows[0]?.transaction_read_only !== 'on') {
      throw new Error('Database verification is not read-only.');
    }
    await assertProductionDatabaseIdentity(client, target);
    const { rows } = await client.query<{
      migrations: string;
      writes: string;
      proposals: string;
      pending: string;
      missing: string[];
    }>(
      `SELECT
        (SELECT count(*)::text FROM drizzle.__drizzle_migrations) AS migrations,
        (SELECT count(*)::text FROM public.agent_write_requests) AS writes,
        (SELECT count(*)::text FROM public.agent_content_proposals) AS proposals,
        (SELECT count(*)::text FROM public.agent_content_proposals WHERE status = 'pending') AS pending,
        (SELECT coalesce(array_agg(required.name) FILTER (
           WHERE journal.name IS NULL
         ), ARRAY[]::text[]) FROM unnest($1::text[]) AS required(name)
         LEFT JOIN drizzle.__drizzle_migrations AS journal ON journal.name = required.name
        ) AS missing`,
      [requiredMigrations],
    );
    const record = rows[0];
    if (!record || record.missing.length) {
      throw new Error('Required agent write migrations are absent.');
    }
    await client.query('ROLLBACK');
    console.log(JSON.stringify({
      release_target: 'verified',
      database_migrations: Number(record.migrations),
      agent_write_feature: enabled ? 'enabled' : 'disabled',
      enable_switch: flagOn ? 'on' : 'off',
      write_requests: Number(record.writes),
      proposals: Number(record.proposals),
      pending_proposals: Number(record.pending),
      action: 'read_only',
    }));
    if (enabled || flagOn) {
      throw new Error('Production agent write switch is not disabled; verify explicit rollout authorization.');
    }
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    await client.end().catch(() => undefined);
  }
}

run().catch(() => {
  console.error('[agent:write:readiness] blocked: production baseline check failed or writes are enabled.');
  process.exitCode = 2;
});
