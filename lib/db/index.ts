import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config({ path: '.env.local' });

// In production/build environments, we might not have DATABASE_URL immediately available
// especially during Next.js static optimization phases.
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl && process.env.NODE_ENV === 'production') {
  console.warn('DATABASE_URL environment variable is not set. Database features will be unavailable.');
}

const poolConfig: PoolConfig = {
  connectionString: dbUrl && dbUrl !== "postgresql://user:password@host:port/db"
    ? dbUrl
    : 'postgres://localhost:5432/postgres',
};

// Conditionally apply SSL for Supabase URLs
if (dbUrl && dbUrl.includes('supabase.co')) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

export const db = drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' });
