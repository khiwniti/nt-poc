import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const environment = process.env.NODE_ENV || 'development';
const dbSslEnabled = (process.env.DB_SSL || '').toLowerCase() === 'true' || environment === 'production';

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'battery_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: dbSslEnabled ? { rejectUnauthorized: false } : undefined,
  },
  migrations: {
    directory: path.join(__dirname, '../../migrations'),
    extension: 'ts',
    loadExtensions: ['.ts'],
  },
});

export default db;
