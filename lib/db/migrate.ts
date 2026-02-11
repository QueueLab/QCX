import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set for migrations');
  }

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: connectionString.includes("supabase.co") ? true : false,
    },
  });

  const db = drizzle(pool);

  console.log('Running database migrations...');
  try {
    await migrate(db, { migrationsFolder: './drizzle/migrations' });
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (process.env.EXECUTE_MIGRATIONS === 'true') {
  runMigrations();
} else {
  console.log('Skipping migrations. Set EXECUTE_MIGRATIONS=true to run them.');
}
