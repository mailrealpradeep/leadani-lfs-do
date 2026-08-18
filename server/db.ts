import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@shared/schema';
import { DATABASE_URL, DB_POOL_MAX, DB_SSL } from './config';

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: DB_POOL_MAX,
  ...(DB_SSL ? { ssl: DB_SSL } : {}),
});

export const db = drizzle(pool, { schema });

// Export pool for raw SQL queries
export { pool };
