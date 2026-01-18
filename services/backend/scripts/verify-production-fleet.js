#!/usr/bin/env tsx
/**
 * Production Fleet Verification Script
 * Validates 9 data centers × 216 batteries = 1,944 batteries
 */
import { pool } from '../src/config/database.js';
import axios from 'axios';
const SIMULATOR_URL = process.env.SIMULATOR_URL || 'http://localhost:8001';
const EXPECTED_FACILITIES = 9;
const EXPECTED_STRINGS_PER_FACILITY = 9;
const EXPECTED_BATTERIES_PER_STRING = 24;
const EXPECTED_BATTERIES_PER_FACILITY = 216;
const EXPECTED_TOTAL_BATTERIES = 1944;
const EXPECTED_TOTAL_STRINGS = 81;
const results = [];
function addResult(category, test, status, details) {
    results.push({ category, test, status, details });
    const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} ${category}: ${test}${details ? ` - ${details}` : ''}`);
}
async function verifyFleetTopology() {
    console.log('\n📊 Verifying Fleet Topology...\n');
    try {
        // Check facilities
        const facilitiesResult = await pool.query(`
      SELECT COUNT(*) as count,
             STRING_AGG(DISTINCT city, ', ' ORDER BY city) as cities
      FROM facilities
    `);
        const facilityCount = parseInt(facilitiesResult.rows[0].count);
        const cities = facilitiesResult.rows[0].cities;
        addResult('Topology', 'Data center facilities', facilityCount === EXPECTED_FACILITIES ? 'PASS' : 'FAIL', `Found ${facilityCount}/${EXPECTED_FACILITIES} - Cities: ${cities}`);
        // Check strings per facility
        const stringsResult = await pool.query(`
      SELECT
        f.name as facility,
        COUNT(z.id) as string_count
      FROM facilities f
      LEFT JOIN zones z ON z.facility_id = f.id
      GROUP BY f.id, f.name
      ORDER BY f.name
    `);
        for (const row of stringsResult.rows) {
            const isCorrect = row.string_count === EXPECTED_STRINGS_PER_FACILITY;
            addResult('Topology', `${row.facility} strings`, isCorrect ? 'PASS' : 'FAIL', `${row.string_count}/${EXPECTED_STRINGS_PER_FACILITY} strings`);
        }
        // Check batteries per facility
        const batteriesPerFacilityResult = await pool.query(`
      SELECT
        f.name as facility,
        COUNT(bs.id) as battery_count
      FROM facilities f
      LEFT JOIN zones z ON z.facility_id = f.id
      LEFT JOIN battery_systems bs ON bs.zone_id = z.id
      GROUP BY f.id, f.name
      ORDER BY f.name
    `);
        for (const row of batteriesPerFacilityResult.rows) {
            const isCorrect = row.battery_count === EXPECTED_BATTERIES_PER_FACILITY;
            addResult('Topology', `${row.facility} batteries`, isCorrect ? 'PASS' : 'FAIL', `${row.battery_count}/${EXPECTED_BATTERIES_PER_FACILITY} batteries`);
        }
        // Total counts
        const totalsResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM zones) as total_strings,
        (SELECT COUNT(*) FROM battery_systems) as total_batteries
    `);
        const totalStrings = parseInt(totalsResult.rows[0].total_strings);
        const totalBatteries = parseInt(totalsResult.rows[0].total_batteries);
        addResult('Topology', 'Total strings fleet-wide', totalStrings === EXPECTED_TOTAL_STRINGS ? 'PASS' : 'FAIL', `${totalStrings}/${EXPECTED_TOTAL_STRINGS}`);
        addResult('Topology', 'Total batteries fleet-wide', totalBatteries === EXPECTED_TOTAL_BATTERIES ? 'PASS' : 'FAIL', `${totalBatteries}/${EXPECTED_TOTAL_BATTERIES}`);
    }
    catch (error) {
        addResult('Topology', 'Verification', 'FAIL', error.message);
    }
}
async function verifyStringConfiguration() {
    console.log('\n🔋 Verifying String Configuration...\n');
    try {
        // Check string types (Rectifier vs UPS)
        const stringTypesResult = await pool.query(`
      SELECT
        CASE
          WHEN name LIKE '%Rectifier%' THEN 'Rectifier'
          WHEN name LIKE '%UPS%' THEN 'UPS'
          ELSE 'Unknown'
        END as string_type,
        COUNT(*) as count
      FROM zones
      GROUP BY string_type
      ORDER BY string_type
    `);
        const expectedRectifier = 27; // 9 facilities × 3 rectifier strings
        const expectedUPS = 54; // 9 facilities × 6 UPS strings
        for (const row of stringTypesResult.rows) {
            const expected = row.string_type === 'Rectifier' ? expectedRectifier : expectedUPS;
            addResult('String Config', `${row.string_type} strings`, row.count === expected ? 'PASS' : 'FAIL', `${row.count}/${expected} strings`);
        }
        // Check batteries per string distribution
        const batteriesPerStringResult = await pool.query(`
      SELECT
        z.name as string_name,
        COUNT(bs.id) as battery_count
      FROM zones z
      LEFT JOIN battery_systems bs ON bs.zone_id = z.id
      GROUP BY z.id, z.name
      HAVING COUNT(bs.id) != ${EXPECTED_BATTERIES_PER_STRING}
      ORDER BY z.name
    `);
        if (batteriesPerStringResult.rows.length === 0) {
            addResult('String Config', 'Batteries per string consistency', 'PASS', `All ${EXPECTED_TOTAL_STRINGS} strings have ${EXPECTED_BATTERIES_PER_STRING} batteries`);
        }
        else {
            for (const row of batteriesPerStringResult.rows) {
                addResult('String Config', `${row.string_name}`, 'FAIL', `Has ${row.battery_count} batteries (expected ${EXPECTED_BATTERIES_PER_STRING})`);
            }
        }
    }
    catch (error) {
        addResult('String Config', 'Verification', 'FAIL', error.message);
    }
}
async function verifyBatteryConfiguration() {
    console.log('\n🔧 Verifying Battery Configuration...\n');
    try {
        // Check HX12-120 specifications
        const specsResult = await pool.query(`
      SELECT
        model,
        manufacturer,
        COUNT(*) as count,
        AVG(voltage_v) as avg_voltage,
        AVG(capacity_kwh) as avg_capacity
      FROM battery_systems
      GROUP BY model, manufacturer
    `);
        for (const row of specsResult.rows) {
            const isCorrect = row.model === 'HX12-120' && row.count === EXPECTED_TOTAL_BATTERIES;
            addResult('Battery Config', `${row.model} specifications`, isCorrect ? 'PASS' : 'FAIL', `${row.count} batteries, ${parseFloat(row.avg_voltage).toFixed(1)}V, ${parseFloat(row.avg_capacity).toFixed(2)}kWh`);
        }
        // Check serial number uniqueness
        const duplicateSerials = await pool.query(`
      SELECT serial_number, COUNT(*) as count
      FROM battery_systems
      GROUP BY serial_number
      HAVING COUNT(*) > 1
    `);
        addResult('Battery Config', 'Unique serial numbers', duplicateSerials.rows.length === 0 ? 'PASS' : 'FAIL', duplicateSerials.rows.length === 0
            ? `All ${EXPECTED_TOTAL_BATTERIES} serial numbers unique`
            : `${duplicateSerials.rows.length} duplicates found`);
        // Check 3D layout completeness
        const layoutResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE position_x IS NOT NULL AND position_y IS NOT NULL) as with_position,
        COUNT(*) FILTER (WHERE display_color IS NOT NULL) as with_color,
        COUNT(*) as total
      FROM battery_systems
    `);
        const layout = layoutResult.rows[0];
        const layoutComplete = layout.with_position === layout.total && layout.with_color === layout.total;
        addResult('Battery Config', '3D layout data', layoutComplete ? 'PASS' : 'FAIL', `${layout.with_position}/${layout.total} batteries have 3D positions`);
        // Check status distribution
        const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM battery_systems
      GROUP BY status
      ORDER BY status
    `);
        console.log('\n  Battery Status Distribution:');
        for (const row of statusResult.rows) {
            const percentage = ((row.count / EXPECTED_TOTAL_BATTERIES) * 100).toFixed(1);
            console.log(`    ${row.status}: ${row.count} (${percentage}%)`);
        }
    }
    catch (error) {
        addResult('Battery Config', 'Verification', 'FAIL', error.message);
    }
}
async function verifySimulatorScaling() {
    console.log('\n🎮 Verifying Simulator Scaling...\n');
    try {
        // Health check
        const healthResponse = await axios.get(`${SIMULATOR_URL}/api/health`, { timeout: 5000 });
        addResult('Simulator', 'Health check', healthResponse.status === 200 ? 'PASS' : 'FAIL', `Status: ${healthResponse.data.status}`);
        // Test batch reading capability
        const sampleBatteries = await pool.query(`
      SELECT id FROM battery_systems ORDER BY RANDOM() LIMIT 10
    `);
        const batteryIds = sampleBatteries.rows.map((row) => row.id);
        const startTime = Date.now();
        const batchResponse = await axios.post(`${SIMULATOR_URL}/api/sensors/readings/batch`, { battery_system_ids: batteryIds }, { timeout: 10000 });
        const duration = Date.now() - startTime;
        addResult('Simulator', 'Batch reading performance', batchResponse.data.count === 10 && duration < 5000 ? 'PASS' : 'WARN', `${batchResponse.data.count} readings in ${duration}ms`);
        // Estimate full fleet simulation time
        const estimatedFullFleetTime = (duration / 10) * EXPECTED_TOTAL_BATTERIES;
        const estimatedSeconds = (estimatedFullFleetTime / 1000).toFixed(1);
        addResult('Simulator', 'Estimated full fleet polling time', estimatedFullFleetTime < 60000 ? 'PASS' : 'WARN', `~${estimatedSeconds}s for ${EXPECTED_TOTAL_BATTERIES} batteries`);
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
async function verifyDataIngestionReadiness() {
    console.log('\n📡 Verifying Data Ingestion Readiness...\n');
    try {
        // Check if sensor_readings hypertable exists and is configured
        const hypertableResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM timescaledb_information.hypertables
        WHERE hypertable_name = 'sensor_readings'
      ) as is_hypertable
    `);
        addResult('Data Ingestion', 'TimescaleDB hypertable', hypertableResult.rows[0].is_hypertable ? 'PASS' : 'FAIL', 'sensor_readings configured for time-series');
        // Estimate storage requirements
        const storageEstimate = await pool.query(`
      SELECT
        pg_size_pretty(pg_total_relation_size('sensor_readings')) as current_size,
        COUNT(*) as current_rows
      FROM sensor_readings
    `);
        console.log(`\n  Storage Analysis:`);
        console.log(`    Current: ${storageEstimate.rows[0].current_size} (${storageEstimate.rows[0].current_rows} rows)`);
        // Estimate for 90 days at 5-second sampling
        const samplesPerDay = 86400 / 5; // 17,280 samples/day
        const estimatedRowsPer90Days = EXPECTED_TOTAL_BATTERIES * samplesPerDay * 90;
        const estimatedSizeMB = (estimatedRowsPer90Days * 100) / (1024 * 1024); // ~100 bytes/row
        console.log(`    Estimated for 90 days: ${(estimatedSizeMB / 1024).toFixed(1)} GB`);
        console.log(`    Estimated rows: ${(estimatedRowsPer90Days / 1e6).toFixed(1)}M rows`);
        // Check existing sensor data coverage
        const coverageResult = await pool.query(`
      SELECT
        COUNT(DISTINCT battery_system_id) as batteries_with_data,
        COUNT(*) as total_readings,
        MAX(time) as latest_reading
      FROM sensor_readings
      WHERE time > NOW() - INTERVAL '5 minutes'
    `);
        const coverage = coverageResult.rows[0];
        if (parseInt(coverage.batteries_with_data) > 0) {
            addResult('Data Ingestion', 'Recent sensor data', 'PASS', `${coverage.batteries_with_data} batteries, ${coverage.total_readings} readings, latest: ${new Date(coverage.latest_reading).toISOString()}`);
        }
        else {
            addResult('Data Ingestion', 'Recent sensor data', 'WARN', 'No recent data (start backend ingestion service)');
        }
    }
    catch (error) {
        addResult('Data Ingestion', 'Verification', 'FAIL', error.message);
    }
}
async function printProductionSummary() {
    console.log('\n' + '═'.repeat(70));
    console.log('PRODUCTION FLEET VERIFICATION SUMMARY');
    console.log('═'.repeat(70) + '\n');
    const passed = results.filter((r) => r.status === 'PASS').length;
    const warned = results.filter((r) => r.status === 'WARN').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;
    const total = results.length;
    console.log('Fleet Configuration:');
    console.log(`  • Data Centers: ${EXPECTED_FACILITIES}`);
    console.log(`  • Total Strings: ${EXPECTED_TOTAL_STRINGS} (${EXPECTED_STRINGS_PER_FACILITY} per site)`);
    console.log(`  • Rectifier Strings: 27 (3 per site)`);
    console.log(`  • UPS Strings: 54 (6 per site)`);
    console.log(`  • Total Batteries: ${EXPECTED_TOTAL_BATTERIES} (${EXPECTED_BATTERIES_PER_FACILITY} per site)`);
    console.log(`  • Batteries per String: ${EXPECTED_BATTERIES_PER_STRING}\n`);
    console.log('Test Results:');
    console.log(`  Total Tests: ${total}`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ⚠️  Warnings: ${warned}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);
    if (failed > 0) {
        console.log('❌ Failed Tests:');
        results
            .filter((r) => r.status === 'FAIL')
            .forEach((r) => {
            console.log(`  • ${r.category} - ${r.test}: ${r.details || 'No details'}`);
        });
        console.log();
    }
    if (warned > 0) {
        console.log('⚠️  Warnings:');
        results
            .filter((r) => r.status === 'WARN')
            .forEach((r) => {
            console.log(`  • ${r.category} - ${r.test}: ${r.details || 'No details'}`);
        });
        console.log();
    }
    console.log('═'.repeat(70) + '\n');
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
}
async function main() {
    console.log('🚀 Production Fleet Verification\n');
    console.log(`Target Configuration:`);
    console.log(`  • Facilities: ${EXPECTED_FACILITIES} data centers across Thailand`);
    console.log(`  • Strings: ${EXPECTED_TOTAL_STRINGS} (9 per site)`);
    console.log(`  • Batteries: ${EXPECTED_TOTAL_BATTERIES} (216 per site, 24 per string)`);
    console.log(`  • Battery Model: HX12-120 VRLA (12V, 120Ah)`);
    console.log(`  • Simulator URL: ${SIMULATOR_URL}\n`);
    try {
        await verifyFleetTopology();
        await verifyStringConfiguration();
        await verifyBatteryConfiguration();
        await verifySimulatorScaling();
        await verifyDataIngestionReadiness();
    }
    catch (error) {
        console.error('Verification failed:', error);
    }
    finally {
        await pool.end();
        await printProductionSummary();
    }
}
// Run verification
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
