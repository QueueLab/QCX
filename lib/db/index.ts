import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import { parse } from 'pg-connection-string';
import * as schema from './schema';

// In production/build environments, we might not have DATABASE_URL immediately available
// especially during Next.js static optimization phases.
if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  console.warn('DATABASE_URL environment variable is not set. Database features will be unavailable.');
}

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/postgres';

// Manually parse the connection string to avoid problematic internal URL parsing in 'pg' driver
// which can trigger "TypeError: Cannot read properties of undefined (reading 'searchParams')"
// especially in Next.js 15 environments where global Request/URL objects are sensitive.
const parsedConfig = parse(connectionString);

// Construct pool configuration using parsed values instead of the raw connection string
// to bypass the internal parser in the 'pg' library.
const poolConfig: PoolConfig = {
  host: parsedConfig.host || undefined,
  port: parsedConfig.port ? parseInt(parsedConfig.port, 10) : undefined,
  user: parsedConfig.user || undefined,
  password: parsedConfig.password || undefined,
  database: parsedConfig.database || undefined,
  ssl: parsedConfig.ssl as any,
};

// Conditionally apply SSL for Supabase URLs if not already specified in the connection string
if (connectionString.includes('supabase.co') && !poolConfig.ssl) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

export const db = drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' });
