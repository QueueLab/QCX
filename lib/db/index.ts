import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config({ path: '.env.local' });

// Lazy-initialized pool to prevent connection attempts during Next.js build/static optimization
// on Vercel where DATABASE_URL may not be available at module load time.
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      // In production on Vercel, DATABASE_URL is set as an env var.
      // During build/static optimization it may not be available yet.
      // Throw a clear error so we know what's happening.
      throw new Error(
        'DATABASE_URL is not configured. Ensure the Vercel project has the DATABASE_URL environment variable set.'
      );
    }

    const poolConfig: PoolConfig = {
      connectionString,
    };

    // Apply SSL for Supabase connection strings
    if (connectionString.includes('supabase.co')) {
      poolConfig.ssl = {
        rejectUnauthorized: false,
      };
    }

    _pool = new Pool(poolConfig);
  }
  return _pool;
}

/**
 * Lazily-initialized Drizzle instance.
 * Safe to import and use in server-side code — the connection is only
 * established on first use, not at module load time.
 */
export const db = new Proxy(drizzle(null as any, { schema, logger: process.env.NODE_ENV === 'development' }), {
  get(target, prop) {
    // Force initialization of the pool before any property access
    getPool();
    if (!_pool) throw new Error('DATABASE_URL not available');
    // Re-create the drizzle instance with the real pool
    _db = drizzle(_pool, { schema, logger: process.env.NODE_ENV === 'development' });
    return Reflect.get(_db!, prop, _db);
  },
});
