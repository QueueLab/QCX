import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as dotenv from 'dotenv';

async function runMigrations() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL is not set for migrations');
  }

  const sql = postgres(connectionString, {
    max: 1, // Single connection for migration
  });

  const db = drizzle(sql);

  console.log('Running database migrations...');
  try {
    await migrate(db, { migrationsFolder: './drizzle/migrations' });
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

if (process.env.EXECUTE_MIGRATIONS === 'true') {
  runMigrations();
} else {
  console.log('Skipping migrations. Set EXECUTE_MIGRATIONS=true to run them.');
  console.log('To run migrations, use the "bun run db:migrate" script, which sets this variable.');
}
