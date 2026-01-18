import db from '../src/config/knex.js';
async function checkSensorReadings() {
    try {
        console.log('📊 Checking sensor_readings table schema...\n');
        const columns = await db('sensor_readings').columnInfo();
        console.log('Columns in sensor_readings table:');
        console.log(JSON.stringify(columns, null, 2));
    }
    catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
    }
    finally {
        await db.destroy();
    }
}
checkSensorReadings();
