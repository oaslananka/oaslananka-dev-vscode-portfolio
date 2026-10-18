import {
  DatabasePreflightError,
  loadMigrationJournal,
  resolveDatabaseUrl,
  runDatabasePreflightFromUrl,
} from '../lib/db/preflight';
import {
  readProductionDatabaseTarget,
  assertProductionDatabaseUrls,
  ProductionTargetError,
} from '../lib/db/production-target';

const EXIT_CODES = {
  configuration: 2,
  connectivity: 3,
  schema: 4,
  migration: 5,
  content: 6,
} as const;

async function main(): Promise<void> {
  const productionTarget = readProductionDatabaseTarget(process.env);
  assertProductionDatabaseUrls(process.env, productionTarget);
  const connectionString = resolveDatabaseUrl(process.env);
  const expectedMigrations = await loadMigrationJournal(
    new URL('../lib/db/migrations/', import.meta.url),
  );
  const report = await runDatabasePreflightFromUrl(connectionString, {
    expectedMigrations,
    ...(productionTarget ? { productionTarget } : {}),
  });

  console.log(
    `[db:preflight] ready: ${report.checkedTables.length} tables, ` +
      `${report.checkedMigrations.length} migrations, and canonical content verified read-only.`,
  );
}

main().catch((error: unknown) => {
  if (error instanceof ProductionTargetError) {
    console.error(`[db:preflight] configuration error: ${error.message}`);
    process.exitCode = EXIT_CODES.configuration;
    return;
  }
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
