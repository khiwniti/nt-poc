#!/usr/bin/env node
import knex from '../src/config/knex.js';

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    const [batchNo, migrations] = await knex.migrate.latest();
    
    if (migrations.length === 0) {
      console.log('✅ Database is already up to date');
    } else {
      console.log(`✅ Batch ${batchNo} migrations completed:`);
      migrations.forEach((migration) => {
        console.log(`   - ${migration}`);
      });
    }
    
    await knex.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
