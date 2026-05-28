import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg'; // Uses Pool from pg, import PoolConfig
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('Warning: DATABASE_URL environment variable is not set for Drizzle client.');
}

const poolConfig: PoolConfig = {
  connectionString: databaseUrl,
};

// Conditionally apply SSL for Supabase URLs
if (databaseUrl && databaseUrl.includes('supabase.co')) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

export const db = drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' });
