#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine if we're running from dist or src
const isProduction = __dirname.includes('/dist/');
const knexConfigPath = isProduction ? '../src/config/knex.js' : '../src/config/knex.js';

async function checkMigrationStatus() {
  try {
    console.log('📊 Checking migration status...\n');
    console.log(`📦 Using config from: ${knexConfigPath}`);

    const { default: knex } = await import(knexConfigPath);

    const migrations = await knex.migrate.list();
    const [completed, pending] = migrations;

    console.log(`✅ Completed migrations (${completed.length}):`);
    completed.forEach((migration: string) => {
      console.log(`   ✓ ${migration}`);
    });

    if (pending.length > 0) {
      console.log(`\n⏳ Pending migrations (${pending.length}):`);
      pending.forEach((migration: string) => {
        console.log(`   ○ ${migration}`);
      });
    } else {
      console.log('\n✨ All migrations are up to date!');
    }

    await knex.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to check migration status:', error);
    process.exit(1);
  }
}

checkMigrationStatus();
