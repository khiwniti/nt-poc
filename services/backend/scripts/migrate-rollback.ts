#!/usr/bin/env node
import knex from '../src/config/knex.js';

async function rollbackMigration() {
  try {
    console.log('⏪ Rolling back last migration batch...');
    
    const [batchNo, migrations] = await knex.migrate.rollback();
    
    if (migrations.length === 0) {
      console.log('ℹ️  No migrations to rollback');
    } else {
      console.log(`✅ Batch ${batchNo} rolled back:`);
      migrations.forEach((migration) => {
        console.log(`   - ${migration}`);
      });
    }
    
    await knex.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

rollbackMigration();
