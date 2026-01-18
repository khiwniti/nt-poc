#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production' || __dirname.includes('/dist/');
const knexConfigPath = isProduction
    ? join(__dirname, '../src/config/knex.js')
    : join(__dirname, '../src/config/knex.ts');
async function validateHierarchy() {
    try {
        console.log('🔍 Validating database hierarchy...\n');
        const { default: knex } = await import(knexConfigPath);
        // Check facilities
        const facilities = await knex('facilities').select('id', 'name');
        console.log('📍 Facilities:', facilities.length);
        facilities.forEach((f) => console.log(`   - ${f.name} (${f.id})`));
        // Check zones
        const zones = await knex('zones').select('id', 'name', 'facility_id');
        console.log('\n🏢 Zones:', zones.length);
        zones.forEach((z) => console.log(`   - ${z.name} (facility: ${z.facility_id})`));
        // Check battery_systems
        const batterySystems = await knex('battery_systems').select('id', 'serial_number', 'zone_id');
        console.log('\n🔋 Battery Systems:', batterySystems.length);
        batterySystems.forEach((b) => console.log(`   - ${b.serial_number} (zone: ${b.zone_id})`));
        // Check sensor_readings
        const sensorReadings = await knex('sensor_readings').count('* as count').first();
        console.log('\n📊 Sensor Readings:', sensorReadings?.count || 0);
        // Check alerts
        const alerts = await knex('alerts').select('id', 'severity', 'status');
        console.log('\n⚠️  Alerts:', alerts.length);
        alerts.slice(0, 3).forEach((a) => console.log(`   - ${a.severity} (${a.status})`));
        // Validate hierarchy relationships
        console.log('\n✅ Validation Results:');
        console.log('   - Facilities exist:', facilities.length > 0 ? '✓' : '✗');
        console.log('   - Zones exist:', zones.length > 0 ? '✓' : '✗');
        console.log('   - Battery systems exist:', batterySystems.length > 0 ? '✓' : '✗');
        console.log('   - Sensor readings exist:', Number(sensorReadings?.count || 0) > 0 ? '✓' : '✗');
        // Verify all zones have valid facility_id
        const zonesWithValidFacility = zones.filter((z) => facilities.some((f) => f.id === z.facility_id));
        console.log('   - All zones reference valid facilities:', zonesWithValidFacility.length === zones.length ? '✓' : '✗');
        // Verify all battery_systems have valid zone_id
        const systemsWithValidZone = batterySystems.filter((b) => zones.some((z) => z.id === b.zone_id));
        console.log('   - All battery systems reference valid zones:', systemsWithValidZone.length === batterySystems.length ? '✓' : '✗');
        await knex.destroy();
        if (facilities.length > 0 &&
            zones.length > 0 &&
            batterySystems.length > 0 &&
            zonesWithValidFacility.length === zones.length &&
            systemsWithValidZone.length === batterySystems.length) {
            console.log('\n✅ Database hierarchy validation PASSED');
            process.exit(0);
        }
        else {
            console.log('\n❌ Database hierarchy validation FAILED');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    }
}
validateHierarchy();
