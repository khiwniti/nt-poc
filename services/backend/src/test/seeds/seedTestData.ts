import { pool } from '../../config/database.js';
import { createCompleteSystemFixture } from '../fixtures/completeSystemFixture';
import { createDegradedBatteryFixture } from '../fixtures/degradedBatteryFixture';
import { createAlertScenarioFixture } from '../fixtures/alertScenarioFixture';
import { createTimeSeriesFixture } from '../fixtures/timeSeriesFixture';

export async function seedTestDatabase(): Promise<void> {
  console.log('Seeding test database...');

  try {
    console.log('Creating complete system fixtures...');
    await createCompleteSystemFixture(5, 20);

    console.log('Creating degraded battery fixtures...');
    await createDegradedBatteryFixture();

    console.log('Creating alert scenario fixtures...');
    await createAlertScenarioFixture();

    console.log('Creating time series fixtures...');
    await createTimeSeriesFixture(48, 60);

    console.log('✓ Test database seeded successfully');
  } catch (error) {
    console.error('Error seeding test database:', error);
    throw error;
  }
}

export async function seedMinimalTestData(): Promise<void> {
  console.log('Seeding minimal test data...');

  try {
    await createCompleteSystemFixture(2, 5);
    console.log('✓ Minimal test data seeded successfully');
  } catch (error) {
    console.error('Error seeding minimal test data:', error);
    throw error;
  }
}

if (require.main === module) {
  seedTestDatabase()
    .then(() => {
      console.log('Database seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database seeding failed:', error);
      process.exit(1);
    });
}
