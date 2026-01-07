import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

// Lazily create a connection pool and Drizzle DB instance for server-side usage.
// Keeps similarity with lib/db/migrate.ts but exports the db for application code.
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  // In serverless or test environments, this may be intentionally unset.
  // Throwing here surfaces configuration issues early when server code runs.
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
})

export const db = drizzle(pool)

export default db
