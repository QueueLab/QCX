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

/**
 * Get the database connection string.
 * On Vercel, the environment variable is `POSTGRES_URL`.
 * Locally, it may be `DATABASE_URL` in .env.local.
 * This function checks both for compatibility across all environments.
 */
function getConnectionUrl(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL;
}

/**
 * Check if we're in a runtime context with a valid database URL.
 * During Next.js static optimization (build phase), env vars may not
 * be available, so we detect this and return early to avoid crashing.
 */
function hasValidConnectionUrl(): boolean {
  const url = getConnectionUrl();
  if (!url) return false;
  // Reject placeholder URLs that Vercel or local setups might use
  if (url.includes('user:password@host:port')) return false;
  return true;
}

let _sql: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getSql(): ReturnType<typeof postgres> | null {
  if (!hasValidConnectionUrl()) {
    return null;
  }

  if (!_sql) {
    const connectionString = getConnectionUrl()!;
    _sql = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
    });
  }
  return _sql;
}

/**
 * Get or create the Drizzle database instance.
 *
 * During Next.js build/static optimization, when DATABASE_URL/POSTGRES_URL
 * is not available or is a placeholder, this returns a stub that throws
 * when an actual database operation is attempted. This prevents the build
 * from crashing while keeping runtime behavior correct.
 */
export const db = (function () {
  // If no valid connection URL (build time or missing env var), return a stub
  if (!hasValidConnectionUrl()) {
    const stub: any = new Proxy({}, {
      get(_, prop) {
        if (prop === Symbol.toPrimitive || prop === 'then') {
          return undefined;
        }
        const source = process.env.POSTGRES_URL
          ? 'POSTGRES_URL'
          : process.env.DATABASE_URL
          ? 'DATABASE_URL'
          : 'no database URL';
        return function (...args: any[]) {
          throw new Error(
            `Cannot execute ${String(prop)}() — ${source} is not a valid connection string. ` +
            'Ensure the database URL environment variable is set correctly.'
          );
        };
      },
    });
    return stub;
  }

  // Runtime: create the real database instance
  const sql = getSql();
  if (!sql) {
    throw new Error('No valid database connection string at runtime');
  }

  return drizzle(sql, { schema, logger: process.env.NODE_ENV === 'development' });
})();
