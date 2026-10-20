import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionTimeoutMillis: 5000,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.code ?? error.message);
});

export async function checkDatabaseConnection() {
  await pool.query('SELECT 1');
}

export async function initializeDatabase() {
  const schema = await readFile(
    fileURLToPath(new URL('./schema.sql', import.meta.url)),
    'utf8',
  );
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(schema);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
