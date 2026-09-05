import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { parse } from 'pg-connection-string';
import * as schema from '@shared/schema';
import { DATABASE_URL, DB_POOL_MAX, DB_SSL } from './config';

// When DATABASE_CA_CERT provides a CA, the URL must be pre-parsed into discrete
// fields: pg merges the parsed connectionString OVER the config object
// (pg/lib/connection-parameters.js), so any sslmode= in the URL would replace
// this `ssl` option and the CA would silently never be used — DB TLS then
// fails with "self-signed certificate in certificate chain".
const pool = new pg.Pool(
  DB_SSL
    ? { ...(parse(DATABASE_URL) as pg.PoolConfig), max: DB_POOL_MAX, ssl: DB_SSL }
    : { connectionString: DATABASE_URL, max: DB_POOL_MAX },
);

export const db = drizzle(pool, { schema });

// Export pool for raw SQL queries
export { pool };
