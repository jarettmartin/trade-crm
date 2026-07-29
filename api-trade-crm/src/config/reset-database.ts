import { Client } from 'pg';

async function resetDatabase() {
  const dbName = process.env.DB_DATABASE || 'trade_crm';
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT ?? '5432', 10);
  const username = process.env.DB_USERNAME || 'postgres';
  const password = process.env.DB_PASSWORD || 'postgres';
  const sslEnabled = process.env.DB_SSL === 'true';

  const client = new Client({
    host,
    port,
    user: username,
    password,
    database: 'postgres',
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();

    // Terminate all connections to the target database
    await client.query(
      `SELECT pg_terminate_backend(pg_stat_activity.pid)
       FROM pg_stat_activity
       WHERE pg_stat_activity.datname = $1
         AND pid <> pg_backend_pid()`,
      [dbName],
    );

    // Drop and recreate the database
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Database "${dbName}" reset successfully`);
  } catch (error: any) {
    console.error(`Failed to reset database: ${error.message}`);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

resetDatabase();
