import db from '../src/config/knex.js';
async function checkSchema() {
    try {
        console.log('📊 Checking battery_systems table schema...\n');
        const columns = await db('battery_systems').columnInfo();
        console.log('Columns in battery_systems table:');
        console.log(JSON.stringify(columns, null, 2));
        console.log('\n🔍 Checking for facility_id column:');
        if (columns.facility_id) {
            console.log('✅ facility_id column EXISTS');
            console.log('   Type:', columns.facility_id.type);
            console.log('   Nullable:', columns.facility_id.nullable);
        }
        else {
            console.log('❌ facility_id column DOES NOT EXIST');
            console.log('\n📋 Available columns:', Object.keys(columns).join(', '));
        }
    }
    catch (error) {
        console.error('❌ Error checking schema:', error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
    }
    finally {
        await db.destroy();
    }
}
checkSchema();
