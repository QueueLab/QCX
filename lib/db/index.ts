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
 * Check if we're in a runtime context (not build/static analysis).
 * During Next.js static optimization, process.env.DATABASE_URL is undefined.
 * We detect this and return early to avoid crashing the build.
 */
function isRuntimeContext(): boolean {
  return !!process.env.DATABASE_URL;
}

let _sql: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getSql(): ReturnType<typeof postgres> | null {
  if (!isRuntimeContext()) {
    return null;
  }

  if (!_sql) {
    const connectionString = process.env.DATABASE_URL!;
    _sql = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
    });
  }
  return _sql;
}

/**
 * Get or create the Drizzle database instance.
 * Returns a stub during build time that throws when actually invoked.
 * This prevents Next.js static optimization from crashing.
 */
export const db = (function () {
  // If DATABASE_URL is not available (build time), return a stub
  if (!isRuntimeContext()) {
    // Create a stub object that mimics the Drizzle interface but throws
    // at runtime when any database operation is actually attempted.
    // During build, Next.js won't actually execute these — it just collects
    // page metadata. The stub prevents module-load-time crashes.
    const stub: any = new Proxy({}, {
      get(_, prop) {
        if (prop === Symbol.toPrimitive || prop === 'then') {
          return undefined;
        }
        return function (...args: any[]) {
          throw new Error(
            `DATABASE_URL is not configured. Cannot execute ${String(prop)}(). ` +
            'Ensure the Vercel project has the DATABASE_URL environment variable set.'
          );
        };
      },
    });
    return stub;
  }

  // Runtime: create the real database instance
  const sql = getSql();
  if (!sql) {
    throw new Error('DATABASE_URL not available at runtime');
  }

  return drizzle(sql, { schema, logger: process.env.NODE_ENV === 'development' });
})();
