import { createHash } from 'node:crypto';

import type { QueryResultRow } from 'pg';

export interface ProductionDatabaseTarget {
  projectId: string;
  branchId: string;
  endpointId: string;
  databaseName: string;
}

export class ProductionTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductionTargetError';
  }
}

type Environment = Record<string, string | undefined>;

interface Queryable {
  query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
  ): Promise<{ rows: T[] }>;
}

const IDENTIFIER_PATTERN = /^(?:jolly-[a-z0-9-]+|[a-z][a-z0-9-]{2,59})$/;
const BRANCH_PATTERN = /^br-[a-z0-9-]{3,57}$/;
const ENDPOINT_PATTERN = /^ep-[a-z0-9-]{3,57}$/;
const DATABASE_PATTERN = /^[a-z_][a-z0-9_]{0,62}$/;
const PROD_KEYS = [
  'PRODUCTION_NEON_PROJECT_ID',
  'PRODUCTION_NEON_BRANCH_ID',
  'PRODUCTION_NEON_ENDPOINT_ID',
  'PRODUCTION_DATABASE_NAME',
] as const;

function fail(message: string): never {
  throw new ProductionTargetError(message);
}

/** Only production builds and explicitly pinned local release commands enforce the pin. */
export function productionGuardRequired(env: Environment): boolean {
  if (env.VERCEL_ENV === 'preview' || env.VERCEL_ENV === 'development') {
    return false;
  }
  return (
    env.VERCEL_ENV === 'production' ||
    (!env.VERCEL_ENV && env.NODE_ENV === 'production') ||
    PROD_KEYS.some((key) => Boolean(env[key]?.trim()))
  );
}

export function readProductionDatabaseTarget(env: Environment): ProductionDatabaseTarget | null {
  if (!productionGuardRequired(env)) return null;

  const configured = PROD_KEYS.map((key) => env[key]?.trim() || '');
  if (configured.some((value) => !value)) {
    return fail(
      'Production database identity pin is incomplete. Configure all PRODUCTION_NEON_* IDs and PRODUCTION_DATABASE_NAME before release.',
    );
  }
  const [projectId, branchId, endpointId, databaseName] = configured as [
    string, string, string, string,
  ];
  if (
    !IDENTIFIER_PATTERN.test(projectId) ||
    !BRANCH_PATTERN.test(branchId) ||
    !ENDPOINT_PATTERN.test(endpointId) ||
    !DATABASE_PATTERN.test(databaseName)
  ) {
    return fail('Production database identity pin contains an invalid identifier.');
  }
  return { projectId, branchId, endpointId, databaseName };
}

/** Never put URLs, passwords, hosts, or usernames in errors or logs. */
function endpointFromUrl(connectionString: string): {
  endpointId: string;
  databaseName: string;
} {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return fail('Production database URL is malformed.');
  }
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    return fail('Production database URL must use PostgreSQL.');
  }
  const hostname = url.hostname.toLowerCase();
  if (!hostname.endsWith('.neon.tech')) {
    return fail('Production database URL is not a Neon endpoint.');
  }
  const label = hostname.split('.')[0] ?? '';
  const endpointId = label.endsWith('-pooler') ? label.slice(0, -7) : label;
  if (!ENDPOINT_PATTERN.test(endpointId)) {
    return fail('Production database URL does not identify a valid Neon compute.');
  }
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (!DATABASE_PATTERN.test(databaseName)) {
    return fail('Production database URL has an invalid database name.');
  }
  return { endpointId, databaseName };
}

export function assertProductionDatabaseUrls(
  env: Environment,
  target: ProductionDatabaseTarget | null,
): void {
  if (!target) return;
  for (const key of ['DATABASE_URL_UNPOOLED', 'DATABASE_URL'] as const) {
    const value = env[key]?.trim();
    if (!value) continue;
    const actual = endpointFromUrl(value);
    if (actual.endpointId !== target.endpointId || actual.databaseName !== target.databaseName) {
      fail('Production database endpoint or database name differs from the approved release target.');
    }
  }
  if (!env.DATABASE_URL_UNPOOLED?.trim() && !env.DATABASE_URL?.trim()) {
    fail('Production database connection is missing.');
  }
}

const SESSION_IDENTITY_SQL = `
  SELECT current_setting('neon.project_id', true) AS project_id,
         current_setting('neon.branch_id', true) AS branch_id,
         current_setting('neon.endpoint_id', true) AS endpoint_id,
         current_database() AS database_name
`;

/** Call this *inside* an open read-only transaction against the actual connection. */
export async function assertProductionDatabaseIdentity(
  client: Queryable,
  target: ProductionDatabaseTarget,
): Promise<void> {
  let row: {
    project_id: string | null;
    branch_id: string | null;
    endpoint_id: string | null;
    database_name: string | null;
  } | undefined;
  try {
    const result = await client.query<{
      project_id: string | null;
      branch_id: string | null;
      endpoint_id: string | null;
      database_name: string | null;
    }>(SESSION_IDENTITY_SQL);
    row = result.rows[0];
  } catch {
    fail('Cannot retrieve Neon project, branch, and endpoint identity from this database connection.');
  }
  if (!row || !row.project_id || !row.branch_id || !row.endpoint_id) {
    fail('This database does not expose a complete Neon session identity.');
  }
  if (
    row.project_id !== target.projectId ||
    row.branch_id !== target.branchId ||
    row.endpoint_id !== target.endpointId ||
    row.database_name !== target.databaseName
  ) {
    fail('Live database project/branch/endpoint identity differs from the approved production target.');
  }
}

/** Optional release-time digest; the data itself never leaves PostgreSQL. */
export async function readReleaseContentFingerprint(client: Queryable): Promise<string> {
  const tables = [
    'profile', 'projects', 'posts', 'site_settings',
    'content_changes', 'contact_messages', 'login_attempts',
  ] as const;
  const hashes: string[] = [];
  for (const table of tables) {
    // Table names are hardcoded, never caller-controlled.
    const result = await client.query<{ digest: string }>(
      `SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '|' ORDER BY id), '')) AS digest FROM public."${table}" t`,
    );
    if (!result.rows[0]?.digest) fail('Could not fingerprint release content.');
    hashes.push(`${table}:${result.rows[0].digest}`);
  }
  return createHash('sha256').update(hashes.join('\n')).digest('hex');
}
