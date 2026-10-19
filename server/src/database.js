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
