#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Determine if we're running from dist or src
const isProduction = __dirname.includes('/dist/');
const knexConfigPath = isProduction ? '../dist/config/knex.js' : '../src/config/knex.js';
async function rollbackMigration() {
    try {
        console.log('⏪ Rolling back last migration batch...');
        console.log(`📦 Using config from: ${knexConfigPath}`);
        const { default: knex } = await import(knexConfigPath);
        const [batchNo, migrations] = await knex.migrate.rollback();
        if (migrations.length === 0) {
            console.log('ℹ️  No migrations to rollback');
        }
        else {
            console.log(`✅ Batch ${batchNo} rolled back:`);
            migrations.forEach((migration) => {
                console.log(`   - ${migration}`);
            });
        }
        await knex.destroy();
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Rollback failed:', error);
        process.exit(1);
    }
}
rollbackMigration();
