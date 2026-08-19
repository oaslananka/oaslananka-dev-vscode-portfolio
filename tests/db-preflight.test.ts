import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { Client } from 'pg';

import {
  DatabasePreflightError,
  loadMigrationJournal,
  resolveDatabaseUrl,
  runDatabasePreflight,
  runDatabasePreflightFromUrl,
  type MigrationJournalEntry,
} from '../lib/db/preflight';

const databaseUrl = process.env.DB_PREFLIGHT_TEST_DATABASE_URL;
const databaseSkip = databaseUrl
  ? false
  : 'Set DB_PREFLIGHT_TEST_DATABASE_URL to a disposable PostgreSQL database.';
const expectedMigrations: MigrationJournalEntry[] = [
  { tag: '0000_test_base', when: 1_000 },
  { tag: '0001_test_latest', when: 2_000 },
];
const requiredTables = [
  'profile',
  'projects',
  'posts',
  'site_settings',
  'contact_messages',
  'login_attempts',
] as const;

function schemaName(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
}

async function createApplicationTables(client: Client, schema: string) {
  await client.query(`CREATE SCHEMA "${schema}"`);
  for (const table of requiredTables) {
    await client.query(
      `CREATE TABLE "${schema}"."${table}" (id integer PRIMARY KEY)`,
    );
  }
}

async function createMigrationTable(client: Client, schema: string) {
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(
    `CREATE TABLE "${schema}"."__drizzle_migrations" (
       id serial PRIMARY KEY,
       hash text NOT NULL,
       created_at bigint
     )`,
  );
}

function assertPreflightError(
  error: unknown,
  code: DatabasePreflightError['code'],
): asserts error is DatabasePreflightError {
  assert.ok(error instanceof DatabasePreflightError);
  assert.equal(error.code, code);
}

test('migration loader reads Drizzle v3 timestamped folders', async () => {
  const migrations = await loadMigrationJournal(
    new URL('../lib/db/migrations/', import.meta.url),
  );

  assert.equal(migrations.length, 10);
  assert.deepEqual(migrations[0], {
    tag: '20260711000431_fuzzy_luke_cage',
    when: 1_783_728_271_000,
  });
  assert.deepEqual(migrations.at(-1), {
    tag: '20260727000000_portfolio_content_revision',
    when: 1_785_110_400_000,
  });
});

test('database URL resolution fails clearly without configuration', () => {
  assert.throws(
    () => resolveDatabaseUrl({}),
    (error) => {
      assertPreflightError(error, 'configuration');
      assert.match(error.message, /DATABASE_URL_UNPOOLED or DATABASE_URL/);
      return true;
    },
  );
});

test('database connectivity failures have their own classification', async () => {
  await assert.rejects(
    () =>
      runDatabasePreflightFromUrl(
        'postgresql://portfolio:portfolio@127.0.0.1:1/unreachable',
        { expectedMigrations, connectionTimeoutMillis: 250 },
      ),
    (error) => {
      assertPreflightError(error, 'connectivity');
      assert.match(error.message, /Could not connect/);
      return true;
    },
  );
});

test(
  'empty database schemas report missing application and migration tables',
  { skip: databaseSkip },
  async () => {
    const client = new Client({ connectionString: databaseUrl as string });
    const applicationSchema = schemaName('preflight_empty_app');
    const migrationSchema = schemaName('preflight_empty_migrations');
    await client.connect();
    await client.query(`CREATE SCHEMA "${applicationSchema}"`);
    await client.query(`CREATE SCHEMA "${migrationSchema}"`);

    try {
      await assert.rejects(
        () =>
          runDatabasePreflight(client, {
            applicationSchema,
            migrationSchema,
            requiredTables,
            expectedMigrations,
          }),
        (error) => {
          assertPreflightError(error, 'schema');
          assert.ok(error.details.includes('profile'));
          assert.ok(
            error.details.includes(`${migrationSchema}.__drizzle_migrations`),
          );
          return true;
        },
      );
    } finally {
      await client.query(`DROP SCHEMA "${applicationSchema}" CASCADE`);
      await client.query(`DROP SCHEMA "${migrationSchema}" CASCADE`);
      await client.end();
    }
  },
);

test(
  'partially migrated databases report the missing migration tag',
  { skip: databaseSkip },
  async () => {
    const client = new Client({ connectionString: databaseUrl as string });
    const applicationSchema = schemaName('preflight_partial_app');
    const migrationSchema = schemaName('preflight_partial_migrations');
    await client.connect();
    await createApplicationTables(client, applicationSchema);
    await createMigrationTable(client, migrationSchema);
    await client.query(
      `INSERT INTO "${migrationSchema}"."__drizzle_migrations" (hash, created_at)
       VALUES ('base', $1)`,
      [(expectedMigrations[0]?.when ?? 0) + 717],
    );

    try {
      await assert.rejects(
        () =>
          runDatabasePreflight(client, {
            applicationSchema,
            migrationSchema,
            requiredTables,
            expectedMigrations,
          }),
        (error) => {
          assertPreflightError(error, 'migration');
          assert.deepEqual(error.details, ['0001_test_latest']);
          return true;
        },
      );
    } finally {
      await client.query(`DROP SCHEMA "${applicationSchema}" CASCADE`);
      await client.query(`DROP SCHEMA "${migrationSchema}" CASCADE`);
      await client.end();
    }
  },
);

test(
  'missing canonical rows are distinguished from schema failures',
  { skip: databaseSkip },
  async () => {
    const client = new Client({ connectionString: databaseUrl as string });
    const applicationSchema = schemaName('preflight_content_app');
    const migrationSchema = schemaName('preflight_content_migrations');
    await client.connect();
    await createApplicationTables(client, applicationSchema);
    await createMigrationTable(client, migrationSchema);
    for (const migration of expectedMigrations) {
      await client.query(
        `INSERT INTO "${migrationSchema}"."__drizzle_migrations" (hash, created_at)
         VALUES ($1, $2)`,
        [migration.tag, migration.when + 717],
      );
    }

    try {
      await assert.rejects(
        () =>
          runDatabasePreflight(client, {
            applicationSchema,
            migrationSchema,
            requiredTables,
            expectedMigrations,
          }),
        (error) => {
          assertPreflightError(error, 'content');
          assert.deepEqual(error.details, [
            'profile(id=1)',
            'site_settings(id=1)',
          ]);
          return true;
        },
      );
    } finally {
      await client.query(`DROP SCHEMA "${applicationSchema}" CASCADE`);
      await client.query(`DROP SCHEMA "${migrationSchema}" CASCADE`);
      await client.end();
    }
  },
);

test(
  'valid databases pass entirely inside a read-only transaction',
  { skip: databaseSkip },
  async () => {
    const client = new Client({ connectionString: databaseUrl as string });
    const applicationSchema = schemaName('preflight_valid_app');
    const migrationSchema = schemaName('preflight_valid_migrations');
    await client.connect();
    await createApplicationTables(client, applicationSchema);
    await createMigrationTable(client, migrationSchema);
    for (const migration of expectedMigrations) {
      await client.query(
        `INSERT INTO "${migrationSchema}"."__drizzle_migrations" (hash, created_at)
         VALUES ($1, $2)`,
        [migration.tag, migration.when + 717],
      );
    }
    await client.query(
      `INSERT INTO "${applicationSchema}"."profile" (id) VALUES (1)`,
    );
    await client.query(
      `INSERT INTO "${applicationSchema}"."site_settings" (id) VALUES (1)`,
    );

    try {
      const report = await runDatabasePreflight(client, {
        applicationSchema,
        migrationSchema,
        requiredTables,
        expectedMigrations,
      });
      assert.equal(report.transactionReadOnly, true);
      assert.deepEqual(report.checkedMigrations, [
        '0000_test_base',
        '0001_test_latest',
      ]);
      assert.deepEqual(report.canonicalRows, ['profile:1', 'site_settings:1']);
    } finally {
      await client.query(`DROP SCHEMA "${applicationSchema}" CASCADE`);
      await client.query(`DROP SCHEMA "${migrationSchema}" CASCADE`);
      await client.end();
    }
  },
);

test('invalid identifiers are classified as configuration failures', async () => {
  const client = {
    query: async () => ({ rows: [] }),
  };

  await assert.rejects(
    () =>
      runDatabasePreflight(client, {
        applicationSchema: 'public;drop schema public',
        requiredTables: [],
        expectedMigrations,
      }),
    (error) => {
      assertPreflightError(error, 'configuration');
      assert.match(error.message, /Invalid application schema identifier/);
      return true;
    },
  );
});

test(
  'custom table sets only verify canonical rows they include',
  { skip: databaseSkip },
  async () => {
    const client = new Client({ connectionString: databaseUrl as string });
    const applicationSchema = schemaName('preflight_custom_app');
    const migrationSchema = schemaName('preflight_custom_migrations');
    await client.connect();
    await client.query(`CREATE SCHEMA "${applicationSchema}"`);
    await client.query(
      `CREATE TABLE "${applicationSchema}"."projects" (id integer PRIMARY KEY)`,
    );
    await createMigrationTable(client, migrationSchema);
    for (const migration of expectedMigrations) {
      await client.query(
        `INSERT INTO "${migrationSchema}"."__drizzle_migrations" (hash, created_at)
         VALUES ($1, $2)`,
        [migration.tag, migration.when + 717],
      );
    }

    try {
      const report = await runDatabasePreflight(client, {
        applicationSchema,
        migrationSchema,
        requiredTables: ['projects'],
        expectedMigrations,
      });
      assert.deepEqual(report.canonicalRows, []);
    } finally {
      await client.query(`DROP SCHEMA "${applicationSchema}" CASCADE`);
      await client.query(`DROP SCHEMA "${migrationSchema}" CASCADE`);
      await client.end();
    }
  },
);
