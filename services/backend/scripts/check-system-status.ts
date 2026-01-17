#!/usr/bin/env tsx
/**
 * Check System Status - verify seeded data
 */

import db from '../src/config/knex.js';

async function checkSystemStatus() {
  try {
    const facilities = await db('facilities').count('* as count');
    const zones = await db('zones').count('* as count');
    const systems = await db('battery_systems').count('* as count');
    const alerts = await db('alerts').count('* as count');
    const readings = await db('sensor_readings').count('* as count');

    console.log('\n=================================');
    console.log('System Status');
    console.log('=================================');
    console.log('Facilities:', facilities[0].count);
    console.log('Zones:', zones[0].count);
    console.log('Battery Systems:', systems[0].count);
    console.log('Alerts:', alerts[0].count);
    console.log('Sensor Readings:', readings[0].count);
    console.log('=================================\n');

    // Also get facility details
    const facilityDetails = await db('facilities').select('id', 'name', 'location');
    console.log('Facility Details:');
    facilityDetails.forEach((f) => {
      console.log(`  - ${f.name} (${f.location})`);
    });
    console.log();

    process.exit(0);
  } catch (error) {
    console.error('Error checking system status:', error);
    process.exit(1);
  }
}

checkSystemStatus();
