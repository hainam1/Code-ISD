import { closeDb, initializeDatabase, runDatabaseMigrations, seedDatabase } from '../config/db.js';

async function main() {
  const command = process.argv[2] || 'init';

  if (command === 'migrate') {
    await runDatabaseMigrations();
    return;
  }

  if (command === 'seed') {
    await seedDatabase();
    return;
  }

  if (command === 'init') {
    await initializeDatabase({ seed: true, force: true });
    return;
  }

  throw new Error(`Unsupported database command: ${command}`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
