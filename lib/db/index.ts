import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg'; // Uses Pool from pg, import PoolConfig
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config({ path: '.env.local' });

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

try {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set for Drizzle client');
  } else {
    const poolConfig: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
    };

    // Conditionally apply SSL for Supabase URLs
    if (process.env.DATABASE_URL.includes('supabase.co')) {
      poolConfig.ssl = {
        rejectUnauthorized: false,
      };
    }

    const pool = new Pool(poolConfig);
    db = drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' });
  }
} catch (error) {
  console.error('Failed to initialize database connection:', error);
}

export { db };
