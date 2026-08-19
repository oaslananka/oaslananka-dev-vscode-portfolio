import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzleNodePostgres } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
const useNodePostgres = process.env.DATABASE_DRIVER === 'node-postgres';

declare global {
  // Reuse the local/test pool across Next.js hot reloads.
  var __portfolioPgPool: Pool | undefined;
}

function createDatabase(url: string) {
  if (useNodePostgres) {
    const pool =
      globalThis.__portfolioPgPool ??
      new Pool({
        connectionString: url,
        max: process.env.NODE_ENV === 'test' ? 4 : 10,
      });

    if (process.env.NODE_ENV !== 'production') {
      globalThis.__portfolioPgPool = pool;
    }

    return drizzleNodePostgres({ client: pool });
  }

  return drizzleNeon({ client: neon(url) });
}

/**
 * Drizzle client backed by Neon's HTTP driver in production and node-postgres
 * only when DATABASE_DRIVER=node-postgres is explicitly selected (CI/E2E).
 *
 * `null` when DATABASE_URL is not configured. Public reads decide whether an
 * explicit local/test fallback is allowed; production reads fail closed.
 */
export const db = connectionString ? createDatabase(connectionString) : null;

export const isDbConfigured = Boolean(connectionString);

export { schema };
