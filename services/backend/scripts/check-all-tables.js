import db from '../src/config/knex.js';
async function checkTables() {
    try {
        console.log('📊 Checking all tables in database...\n');
        const tables = await db.raw("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
        console.log('All tables in database:');
        tables.rows.forEach((t) => console.log('  -', t.tablename));
        // Check if zones table exists
        const zonesExists = await db.schema.hasTable('zones');
        console.log('\n🔍 zones table exists:', zonesExists);
        if (zonesExists) {
            const zoneColumns = await db('zones').columnInfo();
            console.log('\nzones table columns:');
            console.log(JSON.stringify(zoneColumns, null, 2));
        }
        // Check facilities table
        console.log('\n📋 Checking facilities table columns:');
        const facilityColumns = await db('facilities').columnInfo();
        console.log('facilities columns:', Object.keys(facilityColumns).join(', '));
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
checkTables();
