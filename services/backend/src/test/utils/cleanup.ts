import { pool } from '../../config/database';

export async function cleanupTestData(): Promise<void> {
  console.log('Cleaning up test data...');

  try {
    await pool.query("DELETE FROM alerts WHERE battery_system_id LIKE 'test-%'");
    await pool.query("DELETE FROM sensor_readings WHERE battery_system_id LIKE 'test-%'");
    await pool.query("DELETE FROM rul_predictions WHERE battery_system_id LIKE 'test-%'");
    await pool.query("DELETE FROM model_predictions WHERE battery_system_id LIKE 'test-%'");
    await pool.query("DELETE FROM model_performance_metrics WHERE battery_system_id LIKE 'test-%'");
    await pool.query("DELETE FROM model_drift_metrics WHERE battery_system_id LIKE 'test-%'");
    await pool.query("DELETE FROM data_quality_metrics WHERE battery_system_id LIKE 'test-%'");
    await pool.query("DELETE FROM model_health_alerts WHERE battery_system_id LIKE 'test-%'");
    await pool.query("DELETE FROM model_health_scores WHERE battery_system_id LIKE 'test-%'");
    await pool.query("DELETE FROM battery_systems WHERE id LIKE 'test-%'");
    await pool.query("DELETE FROM facilities WHERE id LIKE 'test-%'");

    console.log('✓ Test data cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    throw error;
  }
}

export async function cleanupAllTestData(): Promise<void> {
  console.log('Cleaning up all test data (including non-prefixed)...');

  try {
    await pool.query('TRUNCATE alerts CASCADE');
    await pool.query('TRUNCATE sensor_readings CASCADE');
    await pool.query('TRUNCATE rul_predictions CASCADE');
    await pool.query('TRUNCATE model_predictions CASCADE');
    await pool.query('TRUNCATE model_performance_metrics CASCADE');
    await pool.query('TRUNCATE model_drift_metrics CASCADE');
    await pool.query('TRUNCATE data_quality_metrics CASCADE');
    await pool.query('TRUNCATE model_health_alerts CASCADE');
    await pool.query('TRUNCATE model_health_scores CASCADE');
    await pool.query('TRUNCATE battery_systems CASCADE');
    await pool.query('TRUNCATE facilities CASCADE');

    console.log('✓ All test data cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up all test data:', error);
    throw error;
  }
}

export async function resetTestDatabase(): Promise<void> {
  await cleanupAllTestData();
  console.log('Test database reset complete');
}

if (require.main === module) {
  const command = process.argv[2];

  if (command === 'reset') {
    resetTestDatabase()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else {
    cleanupTestData()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
}
