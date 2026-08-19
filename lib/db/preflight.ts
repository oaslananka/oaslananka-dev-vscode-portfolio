import type { Dirent } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client, type QueryResultRow } from 'pg';

export const REQUIRED_APPLICATION_TABLES = [
  'profile',
  'projects',
  'posts',
  'site_settings',
  'contact_messages',
  'login_attempts',
] as const;

export type DatabasePreflightFailureCode =
  | 'configuration'
  | 'connectivity'
  | 'schema'
  | 'migration'
  | 'content';

export class DatabasePreflightError extends Error {
  readonly code: DatabasePreflightFailureCode;
  readonly details: readonly string[];

  constructor(
    code: DatabasePreflightFailureCode,
    message: string,
    details: readonly string[] = [],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'DatabasePreflightError';
    this.code = code;
    this.details = details;
  }
}

export interface MigrationJournalEntry {
  tag: string;
  when: number;
}

export interface DatabasePreflightOptions {
  applicationSchema?: string;
  migrationSchema?: string;
  migrationTable?: string;
  requiredTables?: readonly string[];
  expectedMigrations: readonly MigrationJournalEntry[];
  connectionTimeoutMillis?: number;
}

export interface DatabasePreflightReport {
  transactionReadOnly: true;
  checkedTables: readonly string[];
  checkedMigrations: readonly string[];
  canonicalRows: readonly string[];
}

interface Queryable {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[] }>;
}

interface MigrationJournalFile {
  entries?: Array<{ tag?: unknown; when?: unknown }>;
}

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

function assertIdentifier(value: string, label: string): string {
  if (!IDENTIFIER.test(value)) {
    throw new Error(`Invalid ${label} identifier.`);
  }
  return value;
}

function quoteIdentifier(value: string, label: string): string {
  return `"${assertIdentifier(value, label)}"`;
}

export function resolveDatabaseUrl(
  environment: NodeJS.ProcessEnv | Record<string, string | undefined>,
): string {
  const value =
    environment.DATABASE_URL_UNPOOLED?.trim() ||
    environment.DATABASE_URL?.trim() ||
    '';

  if (!value) {
    throw new DatabasePreflightError(
      'configuration',
      'DATABASE_URL_UNPOOLED or DATABASE_URL must be set before a production build.',
    );
  }

  return value;
}

function migrationFolderTimestamp(value: string): number {
  if (!/^\d{14}$/.test(value)) {
    throw new Error(`Invalid Drizzle migration folder timestamp: ${value}.`);
  }

  const when = Date.UTC(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)) - 1,
    Number(value.slice(6, 8)),
    Number(value.slice(8, 10)),
    Number(value.slice(10, 12)),
    Number(value.slice(12, 14)),
  );
  const normalized = new Date(when)
    .toISOString()
    .replaceAll(/\D/g, '')
    .slice(0, 14);

  if (!Number.isSafeInteger(when) || normalized !== value) {
    throw new Error(`Invalid Drizzle migration folder timestamp: ${value}.`);
  }

  return when;
}

async function loadMigrationFolders(
  root: string,
  directoryEntries: Dirent[],
): Promise<MigrationJournalEntry[]> {
  const directories = directoryEntries
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));
  const entries: MigrationJournalEntry[] = [];

  for (const directory of directories) {
    const match = /^(\d{14})_.+/.exec(directory.name);
    if (!match?.[1]) continue;

    const migrationPath = join(root, directory.name, 'migration.sql');
    const migrationStats = await stat(migrationPath).catch(() => null);
    if (!migrationStats?.isFile()) {
      throw new Error(
        `Drizzle migration folder ${directory.name} has no migration.sql file.`,
      );
    }

    entries.push({
      tag: directory.name,
      when: migrationFolderTimestamp(match[1]),
    });
  }

  if (entries.length === 0) {
    throw new Error('The Drizzle migrations folder contains no migrations.');
  }

  return entries;
}

export async function loadMigrationJournal(
  path: string | URL,
): Promise<MigrationJournalEntry[]> {
  const resolvedPath = path instanceof URL ? fileURLToPath(path) : path;
  try {
    const directoryEntries = await readdir(resolvedPath, { withFileTypes: true });
    return loadMigrationFolders(resolvedPath, directoryEntries);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOTDIR') throw error;
  }

  const raw = await readFile(resolvedPath, 'utf8');
  const parsed = JSON.parse(raw) as MigrationJournalFile;
  const entries = parsed.entries ?? [];

  if (entries.length === 0) {
    throw new Error('The Drizzle migration journal contains no entries.');
  }

  return entries.map((entry, index) => {
    if (
      typeof entry.tag !== 'string' ||
      entry.tag.length === 0 ||
      typeof entry.when !== 'number' ||
      !Number.isSafeInteger(entry.when)
    ) {
      throw new Error(`Invalid Drizzle migration journal entry at index ${index}.`);
    }

    return { tag: entry.tag, when: entry.when };
  });
}

function normalizeMigrationTimestamp(value: string | number): string | null {
  const timestamp = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) return null;
  return String(Math.floor(timestamp / 1_000) * 1_000);
}

async function queryPhase<T extends QueryResultRow>(
  client: Queryable,
  code: Exclude<DatabasePreflightFailureCode, 'configuration' | 'connectivity'>,
  message: string,
  sql: string,
  values: readonly unknown[] = [],
): Promise<T[]> {
  try {
    return (await client.query<T>(sql, values)).rows;
  } catch (error) {
    throw new DatabasePreflightError(code, message, [], { cause: error });
  }
}

export async function runDatabasePreflight(
  client: Queryable,
  options: DatabasePreflightOptions,
): Promise<DatabasePreflightReport> {
  let applicationSchema: string;
  let migrationSchema: string;
  let migrationTable: string;
  let requiredTables: string[];

  try {
    applicationSchema = assertIdentifier(
      options.applicationSchema ?? 'public',
      'application schema',
    );
    migrationSchema = assertIdentifier(
      options.migrationSchema ?? 'drizzle',
      'migration schema',
    );
    migrationTable = assertIdentifier(
      options.migrationTable ?? '__drizzle_migrations',
      'migration table',
    );
    requiredTables = [
      ...(options.requiredTables ?? REQUIRED_APPLICATION_TABLES),
    ];
    for (const table of requiredTables) assertIdentifier(table, 'table');
  } catch (error) {
    throw new DatabasePreflightError(
      'configuration',
      error instanceof Error
        ? error.message
        : 'Invalid database preflight identifier configuration.',
      [],
      { cause: error },
    );
  }

  let transactionOpen = false;
  try {
    await client.query('BEGIN READ ONLY');
    transactionOpen = true;

    const readOnlyRows = await queryPhase<{ transaction_read_only: string }>(
      client,
      'schema',
      'Could not verify the read-only database transaction.',
      'SHOW transaction_read_only',
    );
    if (readOnlyRows[0]?.transaction_read_only !== 'on') {
      throw new DatabasePreflightError(
        'schema',
        'Database preflight refused to continue because the transaction is not read-only.',
      );
    }

    const tableRows = await queryPhase<{ table_name: string }>(
      client,
      'schema',
      'Could not inspect the application database schema.',
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1
         AND table_name = ANY($2::text[])`,
      [applicationSchema, requiredTables],
    );
    const existingTables = new Set(tableRows.map((row) => row.table_name));
    const missingTables = requiredTables.filter(
      (table) => !existingTables.has(table),
    );

    const migrationTableRows = await queryPhase<{ present: boolean }>(
      client,
      'schema',
      'Could not inspect the Drizzle migration table.',
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = $2
       ) AS present`,
      [migrationSchema, migrationTable],
    );
    if (!migrationTableRows[0]?.present) {
      missingTables.push(`${migrationSchema}.${migrationTable}`);
    }

    if (missingTables.length > 0) {
      throw new DatabasePreflightError(
        'schema',
        'The database schema is incomplete. Apply the repository migrations before building.',
        missingTables,
      );
    }

    const migrationRows = await queryPhase<{ created_at: string }>(
      client,
      'migration',
      'Could not read the applied Drizzle migration state.',
      `SELECT created_at::text AS created_at
       FROM ${quoteIdentifier(migrationSchema, 'migration schema')}.${quoteIdentifier(
         migrationTable,
         'migration table',
       )}`,
    );
    const appliedMigrationTimes = new Set(
      migrationRows
        .map((row) => normalizeMigrationTimestamp(row.created_at))
        .filter((value): value is string => value !== null),
    );
    const missingMigrations = options.expectedMigrations
      .filter((entry) => {
        const normalized = normalizeMigrationTimestamp(entry.when);
        return normalized === null || !appliedMigrationTimes.has(normalized);
      })
      .map((entry) => entry.tag);

    if (missingMigrations.length > 0) {
      throw new DatabasePreflightError(
        'migration',
        'The database is behind the repository migration journal. Run db:migrate before building.',
        missingMigrations,
      );
    }

    const checksProfile = requiredTables.includes('profile');
    const checksSiteSettings = requiredTables.includes('site_settings');
    const checkedCanonicalRows: string[] = [];
    const missingCanonicalRows: string[] = [];

    if (checksProfile || checksSiteSettings) {
      const selectParts: string[] = [];
      if (checksProfile) {
        selectParts.push(`EXISTS (
          SELECT 1 FROM ${quoteIdentifier(
            applicationSchema,
            'application schema',
          )}."profile" WHERE id = 1
        ) AS profile_present`);
        checkedCanonicalRows.push('profile:1');
      }
      if (checksSiteSettings) {
        selectParts.push(`EXISTS (
          SELECT 1 FROM ${quoteIdentifier(
            applicationSchema,
            'application schema',
          )}."site_settings" WHERE id = 1
        ) AS settings_present`);
        checkedCanonicalRows.push('site_settings:1');
      }

      const canonicalRows = await queryPhase<Record<string, boolean>>(
        client,
        'content',
        'Could not verify canonical content rows.',
        `SELECT ${selectParts.join(', ')}`,
      );
      const canonicalState = canonicalRows[0];
      if (!canonicalState) {
        throw new DatabasePreflightError(
          'content',
          'The canonical content query returned no result.',
        );
      }
      if (checksProfile && !canonicalState.profile_present) {
        missingCanonicalRows.push('profile(id=1)');
      }
      if (checksSiteSettings && !canonicalState.settings_present) {
        missingCanonicalRows.push('site_settings(id=1)');
      }
    }

    if (missingCanonicalRows.length > 0) {
      throw new DatabasePreflightError(
        'content',
        'Canonical content required by the production build is missing.',
        missingCanonicalRows,
      );
    }

    await client.query('COMMIT');
    transactionOpen = false;

    return {
      transactionReadOnly: true,
      checkedTables: requiredTables,
      checkedMigrations: options.expectedMigrations.map((entry) => entry.tag),
      canonicalRows: checkedCanonicalRows,
    };
  } catch (error) {
    if (error instanceof DatabasePreflightError) throw error;
    throw new DatabasePreflightError(
      'schema',
      'Database preflight failed while inspecting the configured database.',
      [],
      { cause: error },
    );
  } finally {
    if (transactionOpen) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
  }
}

export async function runDatabasePreflightFromUrl(
  connectionString: string,
  options: DatabasePreflightOptions,
): Promise<DatabasePreflightReport> {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 5_000,
  });

  try {
    await client.connect();
  } catch (error) {
    throw new DatabasePreflightError(
      'connectivity',
      'Could not connect to the configured database. Check availability, credentials, network access, and TLS settings.',
      [],
      { cause: error },
    );
  }

  try {
    return await runDatabasePreflight(client, options);
  } finally {
    await client.end().catch(() => undefined);
  }
}
