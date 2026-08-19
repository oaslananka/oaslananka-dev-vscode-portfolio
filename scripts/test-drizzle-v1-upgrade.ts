import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { Client } from 'pg';

interface MigrationFixture {
  readonly folder: string;
  readonly hash: string;
  readonly sql: string;
  readonly timestamp: number;
}

const migrationsRoot = resolve('lib/db/migrations');
const migrationFolders = readdirSync(migrationsRoot).sort();

const legacyMigrationTimestamps = [
  1_783_728_271_717,
  1_783_759_324_397,
  1_783_761_189_541,
  1_783_977_845_904,
  1_783_978_453_578,
  1_783_985_911_690,
  1_784_562_269_899,
  1_784_576_429_100,
  1_784_582_228_271,
  1_785_110_400_000,
] as const;

assert.equal(migrationFolders.length, legacyMigrationTimestamps.length);

const migrations: MigrationFixture[] = migrationFolders.map((folder, index) => {
  const sql = readFileSync(resolve(migrationsRoot, folder, 'migration.sql'), 'utf8');
  return {
    folder,
    hash: createHash('sha256').update(sql).digest('hex'),
    sql,
    timestamp: legacyMigrationTimestamps[index] as number,
  };
});

function localDatabaseUrl(): URL {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is required for the Drizzle upgrade test.');
  const url = new URL(raw);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('The Drizzle upgrade test may only use a local disposable PostgreSQL server.');
  }
  return url;
}

async function dropDatabase(admin: Client, databaseName: string): Promise<void> {
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [databaseName],
  );
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
}

async function main(): Promise<void> {
  const sourceUrl = localDatabaseUrl();
  const databaseName = `portfolio_drizzle_upgrade_${process.pid}`;
  const adminUrl = new URL(sourceUrl);
  const fixtureUrl = new URL(sourceUrl);
  fixtureUrl.pathname = `/${databaseName}`;

  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();

  try {
    await dropDatabase(admin, databaseName);
    await admin.query(`CREATE DATABASE "${databaseName}"`);

    const fixture = new Client({ connectionString: fixtureUrl.toString() });
    await fixture.connect();

    try {
      for (const migration of migrations) {
        await fixture.query(migration.sql);
      }

      await fixture.query('CREATE SCHEMA drizzle');
      await fixture.query(`
        CREATE TABLE drizzle.__drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint
        )
      `);
      for (const migration of migrations) {
        await fixture.query(
          'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
          [migration.hash, migration.timestamp],
        );
      }

      const before = await fixture.query<{
        posts: string;
        profile: string;
        projects: string;
        settings: string;
      }>(`
        SELECT
          (SELECT count(*)::text FROM posts) AS posts,
          (SELECT count(*)::text FROM profile) AS profile,
          (SELECT count(*)::text FROM projects) AS projects,
          (SELECT count(*)::text FROM site_settings) AS settings
      `);

      execFileSync('npx', ['drizzle-kit', 'migrate'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: fixtureUrl.toString(),
          DATABASE_URL_UNPOOLED: fixtureUrl.toString(),
        },
        stdio: 'inherit',
      });

      const columns = await fixture.query<{ column_name: string }>(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'drizzle'
          AND table_name = '__drizzle_migrations'
        ORDER BY ordinal_position
      `);
      assert.deepEqual(
        columns.rows.map((row) => row.column_name),
        ['id', 'hash', 'created_at', 'name', 'applied_at'],
      );

      const history = await fixture.query<{
        applied_at: Date | null;
        created_at: string;
        hash: string;
        name: string | null;
      }>(`
        SELECT hash, created_at::text AS created_at, name, applied_at
        FROM drizzle.__drizzle_migrations
        ORDER BY id
      `);
      assert.equal(history.rowCount, migrations.length);
      assert.deepEqual(
        history.rows.map((row) => row.name),
        migrations.map((migration) => migration.folder),
      );
      assert.deepEqual(
        history.rows.map((row) => row.hash),
        migrations.map((migration) => migration.hash),
      );
      assert.deepEqual(
        history.rows.map((row) => row.created_at),
        migrations.map((migration) => String(migration.timestamp)),
      );
      assert.equal(history.rows.every((row) => row.applied_at === null), true);

      const after = await fixture.query<{
        posts: string;
        profile: string;
        projects: string;
        settings: string;
      }>(`
        SELECT
          (SELECT count(*)::text FROM posts) AS posts,
          (SELECT count(*)::text FROM profile) AS profile,
          (SELECT count(*)::text FROM projects) AS projects,
          (SELECT count(*)::text FROM site_settings) AS settings
      `);
      assert.deepEqual(after.rows, before.rows);
      console.log(`Drizzle v1 upgraded ${history.rowCount} legacy migration records without replaying SQL.`);
    } finally {
      await fixture.end();
    }
  } finally {
    await dropDatabase(admin, databaseName);
    await admin.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
