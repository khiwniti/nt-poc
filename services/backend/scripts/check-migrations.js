import db from '../src/config/knex.js';
async function checkMigrations() {
    try {
        console.log('📊 Checking migration history...\n');
        const migrations = await db('knex_migrations').select('*').orderBy('migration_time', 'asc');
        console.log(`Total migrations run: ${migrations.length}\n`);
        console.log('Migration history:');
        migrations.forEach((m, i) => {
            console.log(`${i + 1}. ${m.name} (batch: ${m.batch})`);
        });
    }
    catch (error) {
        console.error('❌ Error checking migrations:', error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
            console.error(error.stack);
        }
    }
    finally {
        await db.destroy();
    }
}
checkMigrations();
