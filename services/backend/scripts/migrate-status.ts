#!/usr/bin/env node
import knex from '../src/config/knex.js';

async function checkMigrationStatus() {
  try {
    console.log('📊 Checking migration status...\n');
    
    const migrations = await knex.migrate.list();
    const [completed, pending] = migrations;
    
    console.log(`✅ Completed migrations (${completed.length}):`);
    completed.forEach((migration) => {
      console.log(`   ✓ ${migration}`);
    });
    
    if (pending.length > 0) {
      console.log(`\n⏳ Pending migrations (${pending.length}):`);
      pending.forEach((migration) => {
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
