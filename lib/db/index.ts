import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config({ path: '.env.local' });

// The `postgres` package is a pure-JavaScript PostgreSQL driver that works
// in serverless environments (Vercel, Cloudflare, Edge) where the native `pg`
// TCP driver fails with "Cannot read properties of undefined (reading 'searchParams')".
//
// Drizzle ORM natively supports this via `drizzle-orm/postgres-js`.
// See: https://orm.drizzle.team/docs/get-started-postgresql

/**
 * Lazily-initialized SQL client.
 * Only creates the connection on first use, preventing issues during
 * Next.js build/static optimization on Vercel where DATABASE_URL may
 * not be available at module load time.
 */
let _sql: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getSql(): ReturnType<typeof postgres> {
  if (!_sql) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not configured. Ensure the Vercel project has the DATABASE_URL environment variable set.'
      );
    }

    // postgres-js handles connection strings natively with TLS
    _sql = postgres(connectionString, {
      max: 10, // Connection pool max connections
      idle_timeout: 20, // Close idle connections after 20 seconds
    });
  }
  return _sql;
}

/**
 * Lazily-initialized Drizzle instance.
 * Safe to import in any file — the database connection is only established
 * on first use, not at module load time. This prevents the "searchParams"
 * crash that occurred with the pg driver on Vercel serverless lambdas.
 */
export const db = new Proxy(
  drizzle(null as any, { schema, logger: process.env.NODE_ENV === 'development' }),
  {
    get(target, prop) {
      // Force initialization of the sql client before any property access
      getSql();
      if (!_sql) throw new Error('DATABASE_URL not available');

      // Re-create the drizzle instance with the real client
      _db = drizzle(_sql, { schema, logger: process.env.NODE_ENV === 'development' });
      return Reflect.get(_db!, prop, _db);
    },
  }
);
