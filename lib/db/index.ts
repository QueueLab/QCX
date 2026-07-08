import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

/**
 * Get the database connection string.
 * On Vercel, the environment variable is `POSTGRES_URL`.
 * Only `POSTGRES_URL` is used — `DATABASE_URL` is never checked
 * to avoid the `.env` placeholder interfering with Vercel deploys.
 */
function getConnectionUrl(): string | undefined {
  return process.env.POSTGRES_URL;
}

/**
 * Check if we're in a runtime context with a valid database URL.
 * During Next.js static optimization (build phase), env vars may not
 * be available, so we detect this and return early to avoid crashing.
 */
function hasValidConnectionUrl(): boolean {
  const url = getConnectionUrl();
  if (!url) return false;
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
 * During Next.js build/static optimization, when POSTGRES_URL
 * is not available, this returns a stub that throws
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
        return function (...args: any[]) {
          throw new Error(
            `Cannot execute ${String(prop)}() — POSTGRES_URL is not set. ` +
            'Ensure POSTGRES_URL is configured in Vercel environment variables.'
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
