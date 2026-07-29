import { Client } from 'pg';

export async function createDatabaseIfNotExists(): Promise<void> {
  const dbName = process.env.DB_DATABASE || 'trade_crm';
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT ?? '5432', 10);
  const username = process.env.DB_USERNAME || 'postgres';
  const password = process.env.DB_PASSWORD || 'postgres';
  const sslEnabled = process.env.DB_SSL === 'true';

  // Connect to the default 'postgres' database to check/create our target DB
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
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );

    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully`);
    } else {
      console.log(`Database "${dbName}" already exists`);
    }
  } catch (error: any) {
    console.error(`Failed to create database "${dbName}": ${error.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}
