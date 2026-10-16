import 'server-only';

import { createHash } from 'node:crypto';
import { Client } from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';

import type { db } from '@/lib/db';
import { AgentWriteInputError } from './write-policy';

export interface AgentMutationContext {
  database: NonNullable<typeof db>;
  onCommit: (effect: () => void) => void;
}

export interface AgentRequestIdentity {
  actorId: string;
  requestId: string;
  resource: string;
  revision: number;
  patch: Record<string, unknown>;
}

/** Atomic write + replay ledger; no serverless-instance-local deduplication. */
export async function applyAgentMutation(
  identity: AgentRequestIdentity,
  mutate: (scope: AgentMutationContext) => Promise<void>,
  connectionString: string,
): Promise<boolean> {
  const digest = createHash('sha256')
    .update(JSON.stringify([identity.resource, identity.revision, identity.patch]))
    .digest('hex');
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 6_000,
    application_name: 'portfolio-agent-writer',
  });
  const effects: Array<() => void> = [];
  let committed = false;

  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
      identity.requestId,
    ]);

    const existing = await client.query<{
      actor_id: string;
      resource: string;
      payload_sha256: string;
    }>(
      'SELECT actor_id, resource, payload_sha256 FROM agent_write_requests WHERE request_id = $1',
      [identity.requestId],
    );
    const prior = existing.rows[0];
    if (prior) {
      if (
        prior.actor_id !== identity.actorId ||
        prior.resource !== identity.resource ||
        prior.payload_sha256 !== digest
      ) {
        throw new AgentWriteInputError(409, 'Idempotency-Key was already used for a different request.');
      }
      await client.query('COMMIT');
      committed = true;
      return false;
    }

    await client.query(
      "SELECT set_config('app.agent_actor', $1, true), set_config('app.agent_request_id', $2, true)",
      [identity.actorId, identity.requestId],
    );
    // Client and Pool-backed Drizzle share query operations; only $client differs.
    const database = drizzlePg({ client }) as unknown as NonNullable<typeof db>;
    await mutate({ database, onCommit: (effect) => effects.push(effect) });
    await client.query(
      'INSERT INTO agent_write_requests (request_id, actor_id, resource, payload_sha256) VALUES ($1, $2, $3, $4)',
      [identity.requestId, identity.actorId, identity.resource, digest],
    );
    await client.query('COMMIT');
    committed = true;
    return true;
  } finally {
    if (!committed) await client.query('ROLLBACK').catch(() => undefined);
    await client.end().catch(() => undefined);
    if (committed) {
      for (const effect of effects) {
        try {
          effect();
        } catch {
          console.error('[agent-write] update committed; cache invalidation requires retry');
        }
      }
    }
  }
}
