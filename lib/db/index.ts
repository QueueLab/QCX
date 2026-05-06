import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg'; // Uses Pool from pg, import PoolConfig
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config({ path: '.env.local' });

const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

if (!process.env.DATABASE_URL && !isBuildTime) {
  throw new Error('DATABASE_URL environment variable is not set for Drizzle client');
}

let isValidUrl = false;
if (process.env.DATABASE_URL) {
  try {
    new URL(process.env.DATABASE_URL);
    isValidUrl = true;
  } catch (e) {
    if (!isBuildTime) {
      throw new Error(
        `DATABASE_URL is not a valid URL. Expected format: postgresql://user:pass@host:port/db. Got: ${process.env.DATABASE_URL?.slice(0, 30)}...`
      );
    }
  }
}

const poolConfig: PoolConfig = {
  connectionString: isValidUrl ? process.env.DATABASE_URL : undefined,
};

// Conditionally apply SSL for Supabase URLs
if (isValidUrl && process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase.co')) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

export const db = drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' });
