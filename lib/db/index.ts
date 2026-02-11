import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// SSL Configuration
// For cloud providers like Supabase, SSL is usually required.
// We allow disabling it for local development via DATABASE_SSL_DISABLED=true
const sslConfig = process.env.DATABASE_SSL_DISABLED === 'true'
  ? false
  : { rejectUnauthorized: connectionString.includes('supabase.co') ? true : false };

// Note: Using rejectUnauthorized: true for Supabase as suggested.
// If it fails in certain environments, we might need to fallback to false or provide CA.

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  connectionTimeoutMillis: 50000,
  idleTimeoutMillis: 30000,
})

export const db = drizzle(pool, {
    schema,
    logger: process.env.NODE_ENV === 'development'
})

export default db
