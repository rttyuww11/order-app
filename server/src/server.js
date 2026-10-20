import 'dotenv/config';
import app from './app.js';
import { checkDatabaseConnection, initializeDatabase, pool } from './database.js';

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

try {
  await checkDatabaseConnection();
  await initializeDatabase();
  console.log('Connected to PostgreSQL.');
} catch (error) {
  console.error('Failed to connect to PostgreSQL:', error.code ?? error.message);
  await pool.end();
  process.exit(1);
}

const server = app.listen(port, () => {
  console.log(`COZY API server listening at http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error('Failed to start the COZY API server:', error);
  pool.end();
  process.exitCode = 1;
});
