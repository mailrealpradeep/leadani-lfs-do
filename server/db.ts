import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from '@shared/schema';

// Configure WebSocket for local development
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({ connectionString, max: 20 });
export const db = drizzle(pool, { schema });

// Export pool for raw SQL queries
export { pool };
