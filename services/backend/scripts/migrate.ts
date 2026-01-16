#!/usr/bin/env node
// Import from dist in production, src in development
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine if we're in production by checking NODE_ENV or if dist exists
const isProduction = process.env.NODE_ENV === 'production' || __dirname.includes('/dist/');
const knexConfigPath = isProduction
  ? join(__dirname, '../src/config/knex.js')
  : join(__dirname, '../src/config/knex.js');

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    console.log(`📦 Using config from: ${knexConfigPath}`);

    const { default: knex } = await import(knexConfigPath);

    const [batchNo, migrations] = await knex.migrate.latest();

    if (migrations.length === 0) {
      console.log('✅ Database is already up to date');
    } else {
      console.log(`✅ Batch ${batchNo} migrations completed:`);
      migrations.forEach((migration: string) => {
        console.log(`   - ${migration}`);
      });
    }

    await knex.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Stack trace:', error);
    process.exit(1);
  }
}

runMigrations();
