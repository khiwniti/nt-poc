import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const environment = process.env.NODE_ENV || 'development';
// Only enable SSL if explicitly set to 'true' via environment variable
// Don't auto-enable in production as Railway internal services don't use SSL
const dbSslEnabled = (process.env.DB_SSL || '').toLowerCase() === 'true';
const isProduction = environment === 'production' || __dirname.includes('/dist/');

// In production (dist/src/config/): migrations are at ../../migrations (repo root)
// In development (src/config/): migrations are at ../../migrations (repo root)
const migrationsDir = isProduction
  ? path.join(__dirname, '../../../migrations')
  : path.join(__dirname, '../../migrations');

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
    directory: migrationsDir,
    extension: isProduction ? 'js' : 'ts',
    loadExtensions: isProduction ? ['.js'] : ['.ts'],
  },
});

export default db;
