import {
  DatabasePreflightError,
  loadMigrationJournal,
  resolveDatabaseUrl,
  runDatabasePreflightFromUrl,
} from '../lib/db/preflight';

const EXIT_CODES = {
  configuration: 2,
  connectivity: 3,
  schema: 4,
  migration: 5,
  content: 6,
} as const;

async function main(): Promise<void> {
  const connectionString = resolveDatabaseUrl(process.env);
  const expectedMigrations = await loadMigrationJournal(
    new URL('../lib/db/migrations/', import.meta.url),
  );
  const report = await runDatabasePreflightFromUrl(connectionString, {
    expectedMigrations,
  });

  console.log(
    `[db:preflight] ready: ${report.checkedTables.length} tables, ` +
      `${report.checkedMigrations.length} migrations, and canonical content verified read-only.`,
  );
}

main().catch((error: unknown) => {
  if (error instanceof DatabasePreflightError) {
    console.error(`[db:preflight] ${error.code} error: ${error.message}`);
    for (const detail of error.details) console.error(`- ${detail}`);
    process.exitCode = EXIT_CODES[error.code];
    return;
  }

  console.error(
    `[db:preflight] internal error: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`,
  );
  process.exitCode = 1;
});
