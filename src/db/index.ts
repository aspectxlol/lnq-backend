import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });

export async function checkDbConnection(timeoutMs: number = 2000): Promise<void> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error('DB connection check timed out'));
    }, timeoutMs);
  });

  await Promise.race([pool.query('select 1 as ok'), timeoutPromise]);
}

export async function closeConnection() {
  await pool.end();
}

export default db;
