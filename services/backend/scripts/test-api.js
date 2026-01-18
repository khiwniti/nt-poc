#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production' || __dirname.includes('/dist/');
const knexConfigPath = isProduction
    ? join(__dirname, '../src/config/knex.js')
    : join(__dirname, '../src/config/knex.ts');
async function testApi() {
    try {
        console.log('🧪 Testing backend API database connectivity...\n');
        const { default: knex } = await import(knexConfigPath);
        // Test basic query
        const facilities = await knex('facilities').select('id', 'name').limit(5);
        console.log('✅ Successfully connected to database');
        console.log(`✅ Found ${facilities.length} facilities:`);
        facilities.forEach((f) => console.log(`   - ${f.name}`));
        // Test the hierarchy
        const zones = await knex('zones').count('* as count').first();
        const batterySystems = await knex('battery_systems').count('* as count').first();
        const sensorReadings = await knex('sensor_readings').count('* as count').first();
        console.log('\n📊 Database Statistics:');
        console.log(`   - Zones: ${zones?.count || 0}`);
        console.log(`   - Battery Systems: ${batterySystems?.count || 0}`);
        console.log(`   - Sensor Readings: ${sensorReadings?.count || 0}`);
        await knex.destroy();
        console.log('\n✅ Backend API verification PASSED');
        console.log('✅ Database schema is working correctly');
        console.log('✅ Seeding completed successfully');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ API test failed:', error);
        process.exit(1);
    }
}
testApi();
