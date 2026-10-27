import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

function getDatabaseConfig() {
  const host = process.env.DB_HOST ?? process.env.PGHOST;

  if (host && /^postgres(?:ql)?:\/\//i.test(host)) {
    const connectionUrl = new URL(host);
    if (
      connectionUrl.hostname.toLowerCase().endsWith('.render.com') &&
      !connectionUrl.searchParams.has('sslmode')
    ) {
      connectionUrl.searchParams.set('sslmode', 'require');
    }
    return { connectionString: connectionUrl.toString() };
  }

  return {
    host,
    port: Number(process.env.DB_PORT ?? process.env.PGPORT ?? 5432),
    database: process.env.DB_NAME ?? process.env.PGDATABASE,
    user: process.env.DB_USER ?? process.env.PGUSER,
    password: process.env.DB_PASSWORD ?? process.env.PGPASSWORD,
    ...(host?.toLowerCase().endsWith('.render.com')
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  };
}

export const pool = new Pool({
  ...getDatabaseConfig(),
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
