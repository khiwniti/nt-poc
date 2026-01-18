#!/usr/bin/env tsx
/**
 * Verification script for 9-battery configuration
 * Tests: Database schema, seed data, simulator connectivity, backend ingestion
 */
import { pool } from '../src/config/database.js';
import axios from 'axios';
const SIMULATOR_URL = process.env.SIMULATOR_URL || 'http://localhost:8001';
const EXPECTED_BATTERY_COUNT = 9;
const EXPECTED_FACILITY_COUNT = 3;
const EXPECTED_ZONE_COUNT = 3;
const results = [];
function addResult(category, test, status, details) {
    results.push({ category, test, status, details });
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${category}: ${test}${details ? ` - ${details}` : ''}`);
}
async function verifyDatabaseSchema() {
    console.log('\n📊 Verifying Database Schema...\n');
    try {
        // Check facilities table
        const facilityResult = await pool.query('SELECT COUNT(*) as count FROM facilities');
        const facilityCount = parseInt(facilityResult.rows[0].count);
        addResult('Database', 'Facilities table', facilityCount === EXPECTED_FACILITY_COUNT ? 'PASS' : 'FAIL', `Found ${facilityCount}/${EXPECTED_FACILITY_COUNT} facilities`);
        // Check zones table
        const zoneResult = await pool.query('SELECT COUNT(*) as count FROM zones');
        const zoneCount = parseInt(zoneResult.rows[0].count);
        addResult('Database', 'Zones table', zoneCount === EXPECTED_ZONE_COUNT ? 'PASS' : 'FAIL', `Found ${zoneCount}/${EXPECTED_ZONE_COUNT} zones`);
        // Check battery_systems table
        const batteryResult = await pool.query('SELECT COUNT(*) as count FROM battery_systems');
        const batteryCount = parseInt(batteryResult.rows[0].count);
        addResult('Database', 'Battery systems table', batteryCount === EXPECTED_BATTERY_COUNT ? 'PASS' : 'FAIL', `Found ${batteryCount}/${EXPECTED_BATTERY_COUNT} batteries`);
        // Check 3D layout fields
        const layoutFieldsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE position_x IS NOT NULL) as has_position_x,
        COUNT(*) FILTER (WHERE position_y IS NOT NULL) as has_position_y,
        COUNT(*) FILTER (WHERE position_z IS NOT NULL) as has_position_z,
        COUNT(*) FILTER (WHERE display_color IS NOT NULL) as has_color,
        COUNT(*) as total
      FROM battery_systems
    `);
        const layoutFields = layoutFieldsResult.rows[0];
        const all3DFieldsPresent = layoutFields.has_position_x === layoutFields.total &&
            layoutFields.has_position_y === layoutFields.total &&
            layoutFields.has_position_z === layoutFields.total &&
            layoutFields.has_color === layoutFields.total;
        addResult('Database', '3D layout fields', all3DFieldsPresent ? 'PASS' : 'FAIL', `${layoutFields.has_position_x}/${layoutFields.total} batteries have 3D positions`);
        // Check sensor_readings is hypertable
        const hypertableResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM timescaledb_information.hypertables
        WHERE hypertable_name = 'sensor_readings'
      ) as is_hypertable
    `);
        const isHypertable = hypertableResult.rows[0].is_hypertable;
        addResult('Database', 'TimescaleDB hypertable', isHypertable ? 'PASS' : 'FAIL', 'sensor_readings is hypertable');
    }
    catch (error) {
        addResult('Database', 'Schema verification', 'FAIL', error.message);
    }
}
async function verifySimulatorConnectivity() {
    console.log('\n🔌 Verifying Simulator Connectivity...\n');
    try {
        // Health check
        const healthResponse = await axios.get(`${SIMULATOR_URL}/api/health`, { timeout: 3000 });
        addResult('Simulator', 'Health check', healthResponse.status === 200 ? 'PASS' : 'FAIL', `Status: ${healthResponse.data.status}`);
        // Test single battery reading
        const batteryResult = await pool.query('SELECT id FROM battery_systems LIMIT 1');
        if (batteryResult.rows.length > 0) {
            const batteryId = batteryResult.rows[0].id;
            const readingResponse = await axios.get(`${SIMULATOR_URL}/api/sensors/reading/${batteryId}`, {
                timeout: 3000,
            });
            const hasRequiredFields = readingResponse.data &&
                'voltage' in readingResponse.data &&
                'current' in readingResponse.data &&
                'temperature' in readingResponse.data &&
                'soc' in readingResponse.data &&
                'soh' in readingResponse.data;
            addResult('Simulator', 'Battery reading', hasRequiredFields ? 'PASS' : 'FAIL', `Battery ${batteryId}: voltage=${readingResponse.data.voltage}V`);
        }
        // Test batch readings
        const allBatteriesResult = await pool.query('SELECT id FROM battery_systems');
        const batteryIds = allBatteriesResult.rows.map((row) => row.id);
        const batchResponse = await axios.post(`${SIMULATOR_URL}/api/sensors/readings/batch`, { battery_system_ids: batteryIds }, { timeout: 5000 });
        addResult('Simulator', 'Batch readings', batchResponse.data.count === EXPECTED_BATTERY_COUNT ? 'PASS' : 'FAIL', `Received ${batchResponse.data.count}/${EXPECTED_BATTERY_COUNT} readings`);
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNREFUSED') {
                addResult('Simulator', 'Connectivity', 'FAIL', 'Simulator not running on port 8001');
            }
            else {
                addResult('Simulator', 'Connectivity', 'FAIL', error.message);
            }
        }
        else {
            addResult('Simulator', 'Connectivity', 'FAIL', error.message);
        }
    }
}
async function verifySensorData() {
    console.log('\n📡 Verifying Sensor Data...\n');
    try {
        // Check sensor_readings table has data
        const readingCountResult = await pool.query('SELECT COUNT(*) as count FROM sensor_readings');
        const readingCount = parseInt(readingCountResult.rows[0].count);
        addResult('Sensor Data', 'Readings stored', readingCount > 0 ? 'PASS' : 'FAIL', `${readingCount} total readings`);
        // Check each battery has recent data (within last 5 minutes)
        const recentReadingsResult = await pool.query(`
      SELECT
        bs.serial_number,
        COUNT(sr.time) as reading_count,
        MAX(sr.time) as latest_reading
      FROM battery_systems bs
      LEFT JOIN sensor_readings sr ON bs.id = sr.battery_system_id
        AND sr.time > NOW() - INTERVAL '5 minutes'
      GROUP BY bs.id, bs.serial_number
      ORDER BY bs.serial_number
    `);
        let batteriesWithRecentData = 0;
        for (const row of recentReadingsResult.rows) {
            const hasRecentData = row.reading_count > 0;
            if (hasRecentData)
                batteriesWithRecentData++;
            addResult('Sensor Data', `${row.serial_number}`, hasRecentData ? 'PASS' : 'FAIL', hasRecentData
                ? `${row.reading_count} readings, latest: ${new Date(row.latest_reading).toISOString()}`
                : 'No recent data (start backend ingestion service)');
        }
        // Overall sensor data summary
        addResult('Sensor Data', 'Coverage', batteriesWithRecentData === EXPECTED_BATTERY_COUNT ? 'PASS' : 'FAIL', `${batteriesWithRecentData}/${EXPECTED_BATTERY_COUNT} batteries have recent data`);
    }
    catch (error) {
        addResult('Sensor Data', 'Verification', 'FAIL', error.message);
    }
}
async function verifyBatteryConfiguration() {
    console.log('\n🔋 Verifying Battery Configuration...\n');
    try {
        // Check battery distribution across facilities
        const distributionResult = await pool.query(`
      SELECT
        f.name as facility_name,
        z.name as zone_name,
        COUNT(bs.id) as battery_count
      FROM facilities f
      JOIN zones z ON z.facility_id = f.id
      LEFT JOIN battery_systems bs ON bs.zone_id = z.id
      GROUP BY f.name, z.name
      ORDER BY f.name, z.name
    `);
        for (const row of distributionResult.rows) {
            addResult('Battery Config', `${row.facility_name} - ${row.zone_name}`, row.battery_count > 0 ? 'PASS' : 'FAIL', `${row.battery_count} batteries`);
        }
        // Check unique serial numbers
        const duplicateSerialResult = await pool.query(`
      SELECT serial_number, COUNT(*) as count
      FROM battery_systems
      GROUP BY serial_number
      HAVING COUNT(*) > 1
    `);
        addResult('Battery Config', 'Unique serial numbers', duplicateSerialResult.rows.length === 0 ? 'PASS' : 'FAIL', duplicateSerialResult.rows.length === 0
            ? 'All serial numbers unique'
            : `${duplicateSerialResult.rows.length} duplicates found`);
        // Check battery status distribution
        const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM battery_systems
      GROUP BY status
      ORDER BY status
    `);
        console.log('\n  Battery Status Summary:');
        for (const row of statusResult.rows) {
            console.log(`    ${row.status}: ${row.count}`);
        }
    }
    catch (error) {
        addResult('Battery Config', 'Verification', 'FAIL', error.message);
    }
}
async function printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(60) + '\n');
    const passed = results.filter((r) => r.status === 'PASS').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;
    const total = results.length;
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);
    if (failed > 0) {
        console.log('Failed Tests:');
        results
            .filter((r) => r.status === 'FAIL')
            .forEach((r) => {
            console.log(`  ❌ ${r.category} - ${r.test}: ${r.details || 'No details'}`);
        });
        console.log();
    }
    console.log('='.repeat(60) + '\n');
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
}
async function main() {
    console.log('🚀 Starting 9-Battery Configuration Verification\n');
    console.log(`Simulator URL: ${SIMULATOR_URL}`);
    console.log(`Expected Batteries: ${EXPECTED_BATTERY_COUNT}`);
    console.log(`Expected Facilities: ${EXPECTED_FACILITY_COUNT}`);
    console.log(`Expected Zones: ${EXPECTED_ZONE_COUNT}\n`);
    try {
        await verifyDatabaseSchema();
        await verifyBatteryConfiguration();
        await verifySimulatorConnectivity();
        await verifySensorData();
    }
    catch (error) {
        console.error('Verification failed:', error);
    }
    finally {
        await pool.end();
        await printSummary();
    }
}
// Run verification
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
