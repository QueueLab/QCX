import type { Config } from 'drizzle-kit';
const dbUrl = process.env.POSTGRES_URL;
if (!dbUrl) {
  throw new Error('POSTGRES_URL is not set');
}

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
  verbose: true,
  strict: true,
} satisfies Config;
