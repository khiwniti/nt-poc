#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In production dist/ structure: scripts/ and src/ are siblings under dist/
// In development: scripts/ and src/ are siblings at repo root
const isProduction = process.env.NODE_ENV === 'production' || __dirname.includes('/dist/');
const knexConfigPath = isProduction
  ? join(__dirname, '../src/config/knex.js')
  : join(__dirname, '../src/config/knex.ts');

async function runSeeds() {
  try {
    console.log('🌱 Running database seeds...');
    console.log(`📦 Environment: ${isProduction ? 'production' : 'development'}`);
    console.log(`📦 Current directory: ${__dirname}`);
    console.log(`📦 Using config from: ${knexConfigPath}`);

    const { default: knex } = await import(knexConfigPath);

    console.log('📦 Knex config:', {
      seeds: knex.client.config.seeds,
    });

    const result = await knex.seed.run();
    console.log('📦 Seed result:', result);
    const seeds = Array.isArray(result) && result.length > 0 ? result[0] : [];

    if (!seeds || seeds.length === 0) {
      console.log('✅ No seed files found or already completed');
    } else {
      console.log(`✅ Successfully ran ${seeds.length} seed file(s):`);
      seeds.forEach((seed: string) => {
        console.log(`   - ${seed}`);
      });
    }

    await knex.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    console.error('Stack trace:', error);
    process.exit(1);
  }
}

runSeeds();
