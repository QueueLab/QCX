import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

let dbInstance: any = null;

if (databaseUrl) {
  const poolConfig: PoolConfig = {
    connectionString: databaseUrl,
  };

  if (databaseUrl.includes('supabase.co')) {
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
  }

  try {
    const pool = new Pool(poolConfig);
    dbInstance = drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' });
  } catch (error) {
    console.error('Failed to initialize Drizzle with DATABASE_URL:', error);
  }
} else {
  console.warn('DATABASE_URL is not set. Database features will be disabled.');
}

export const db = dbInstance;
