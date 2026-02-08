import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const ssl = connectionString.includes('supabase.co')
  ? { rejectUnauthorized: false }
  : undefined

const pool = new Pool({
  connectionString,
  ssl,
})

export const db = drizzle(pool, {
    schema,
    logger: process.env.NODE_ENV === 'development'
})

export default db
