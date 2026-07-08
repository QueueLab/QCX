import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl === "postgresql://user:password@host:port/db") {
    console.warn('Skipping migrations: DATABASE_URL is not set or is placeholder.');
    return;
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
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
