import knex from '../src/config/knex.js';

async function resetDatabase() {
  try {
    console.log('🗑️  Dropping all tables with CASCADE...');

    // Use raw SQL with CASCADE to handle dependencies
    const tablesToDrop = [
      'alert_escalation_events',
      'alert_escalation_rules',
      'alert_escalation_logs',
      'alert_escalations',
      'alerts',
      'sensor_readings',
      'rul_predictions',
      'model_performance_metrics',
      'model_performance_baselines',
      'report_annotations',
      'report_versions',
      'report_analytics',
      'facility_managers',
      'battery_systems',
      'zones',
      'facilities',
      'knex_migrations',
      'knex_migrations_lock',
    ];

    for (const table of tablesToDrop) {
      try {
        await knex.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`  ✅ Dropped ${table}`);
      } catch (error) {
        const err = error as Error;
        console.log(`  ⚠️  Could not drop ${table}: ${err.message}`);
      }
    }

    console.log('✅ All tables dropped successfully');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run: npm run migrate');
    console.log('  2. Run: npm run seed:run');
  } catch (error) {
    console.error('❌ Reset failed:', error);
    throw error;
  } finally {
    await knex.destroy();
  }
}

resetDatabase();
