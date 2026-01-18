#!/usr/bin/env node
/**
 * Comprehensive database count verification script
 * Queries actual counts from database to serve as source of truth
 */
import knex from '../src/config/knex.js';
async function verifyAllCounts() {
    console.log('='.repeat(80));
    console.log('DATABASE COUNT VERIFICATION - Source of Truth');
    console.log('='.repeat(80));
    console.log('Timestamp:', new Date().toISOString());
    console.log('');
    try {
        // 1. Facilities count
        const facilitiesResult = await knex.raw('SELECT COUNT(*) FROM facilities;');
        const facilitiesCount = parseInt(facilitiesResult.rows[0].count, 10);
        console.log('1. FACILITIES');
        console.log(`   Total facilities: ${facilitiesCount}`);
        console.log('');
        // 2. Zones count
        const zonesResult = await knex.raw('SELECT COUNT(*) FROM zones;');
        const zonesCount = parseInt(zonesResult.rows[0].count, 10);
        console.log('2. ZONES');
        console.log(`   Total zones: ${zonesCount}`);
        console.log('');
        // 3. Battery Systems count
        const batterySystemsResult = await knex.raw('SELECT COUNT(*) FROM battery_systems;');
        const batterySystemsCount = parseInt(batterySystemsResult.rows[0].count, 10);
        console.log('3. BATTERY SYSTEMS');
        console.log(`   Total battery systems: ${batterySystemsCount}`);
        // 3a. Healthy battery systems (health_score >= 80)
        const healthyBatteriesResult = await knex.raw('SELECT COUNT(*) FROM battery_systems WHERE health_score >= 80;');
        const healthyBatteriesCount = parseInt(healthyBatteriesResult.rows[0].count, 10);
        console.log(`   Healthy (health_score >= 80): ${healthyBatteriesCount}`);
        // 3b. Battery systems with issues (health_score < 80)
        const issuesResult = await knex.raw('SELECT COUNT(*) FROM battery_systems WHERE health_score < 80;');
        const issuesCount = parseInt(issuesResult.rows[0].count, 10);
        console.log(`   With issues (health_score < 80): ${issuesCount}`);
        console.log('');
        // 4. Sensor Readings count
        const sensorReadingsResult = await knex.raw('SELECT COUNT(*) FROM sensor_readings;');
        const sensorReadingsCount = parseInt(sensorReadingsResult.rows[0].count, 10);
        console.log('4. SENSOR READINGS');
        console.log(`   Total sensor readings: ${sensorReadingsCount}`);
        console.log('');
        // 5. Alerts count
        const alertsResult = await knex.raw('SELECT COUNT(*) FROM alerts;');
        const alertsCount = parseInt(alertsResult.rows[0].count, 10);
        console.log('5. ALERTS');
        console.log(`   Total alerts: ${alertsCount}`);
        // 5a. Active alerts
        const activeAlertsResult = await knex.raw("SELECT COUNT(*) FROM alerts WHERE status = 'active';");
        const activeAlertsCount = parseInt(activeAlertsResult.rows[0].count, 10);
        console.log(`   Active alerts (status = 'active'): ${activeAlertsCount}`);
        console.log('');
        // Additional useful metrics
        console.log('6. ADDITIONAL METRICS');
        // Health score distribution
        const healthDistribution = await knex.raw(`
      SELECT 
        CASE 
          WHEN health_score >= 90 THEN '90-100 (Excellent)'
          WHEN health_score >= 80 THEN '80-89 (Good)'
          WHEN health_score >= 70 THEN '70-79 (Fair)'
          WHEN health_score >= 60 THEN '60-69 (Poor)'
          ELSE '0-59 (Critical)'
        END as range,
        COUNT(*) as count
      FROM battery_systems
      GROUP BY range
      ORDER BY range DESC;
    `);
        console.log('   Health Score Distribution:');
        healthDistribution.rows.forEach((row) => {
            console.log(`     ${row.range}: ${row.count}`);
        });
        console.log('');
        // Alert status distribution
        const alertStatusDistribution = await knex.raw(`
      SELECT status, COUNT(*) as count
      FROM alerts
      GROUP BY status
      ORDER BY count DESC;
    `);
        console.log('   Alert Status Distribution:');
        if (alertStatusDistribution.rows.length === 0) {
            console.log('     (No alerts)');
        }
        else {
            alertStatusDistribution.rows.forEach((row) => {
                console.log(`     ${row.status}: ${row.count}`);
            });
        }
        console.log('');
        // Alert severity distribution
        const alertSeverityDistribution = await knex.raw(`
      SELECT severity::text, COUNT(*) as count
      FROM alerts
      GROUP BY severity::text
      ORDER BY
        CASE severity::text
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END;
    `);
        console.log('   Alert Severity Distribution:');
        if (alertSeverityDistribution.rows.length === 0) {
            console.log('     (No alerts)');
        }
        else {
            alertSeverityDistribution.rows.forEach((row) => {
                console.log(`     ${row.severity}: ${row.count}`);
            });
        }
        console.log('');
        // Summary for easy comparison
        console.log('='.repeat(80));
        console.log('SUMMARY (for comparison with API/Frontend)');
        console.log('='.repeat(80));
        console.log(JSON.stringify({
            facilities: facilitiesCount,
            zones: zonesCount,
            batterySystemsTotal: batterySystemsCount,
            batterySystemsHealthy: healthyBatteriesCount,
            batterySystemsWithIssues: issuesCount,
            sensorReadings: sensorReadingsCount,
            alertsTotal: alertsCount,
            alertsActive: activeAlertsCount,
        }, null, 2));
        console.log('='.repeat(80));
        await knex.destroy();
        process.exit(0);
    }
    catch (error) {
        console.error('Error querying database:', error);
        await knex.destroy();
        process.exit(1);
    }
}
verifyAllCounts();
