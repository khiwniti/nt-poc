const POSITION_INDEX = 'idx_battery_systems_zone_status_position';
const RACK_BAY_UNIQUE = 'uq_battery_systems_zone_rack_bay';
const POS_X_INDEX = 'idx_battery_systems_position_x';
const POS_Y_INDEX = 'idx_battery_systems_position_y';
const POS_Z_INDEX = 'idx_battery_systems_position_z';
const DIMENSION_CHECK = 'battery_systems_dimensions_positive_check';
export async function up(knex) {
    const tableExists = await knex.schema.hasTable('battery_systems');
    if (!tableExists) {
        return;
    }
    const [hasPosX, hasPosY, hasPosZ, hasPitch, hasYaw, hasRoll, hasWidth, hasHeight, hasDepth, hasRackId, hasBayPosition, hasDisplayColor, hasIconType, hasModel3dRef, hasInstallationDate, hasLastMaintenance] = await Promise.all([
        knex.schema.hasColumn('battery_systems', 'position_x'),
        knex.schema.hasColumn('battery_systems', 'position_y'),
        knex.schema.hasColumn('battery_systems', 'position_z'),
        knex.schema.hasColumn('battery_systems', 'rotation_pitch'),
        knex.schema.hasColumn('battery_systems', 'rotation_yaw'),
        knex.schema.hasColumn('battery_systems', 'rotation_roll'),
        knex.schema.hasColumn('battery_systems', 'width_m'),
        knex.schema.hasColumn('battery_systems', 'height_m'),
        knex.schema.hasColumn('battery_systems', 'depth_m'),
        knex.schema.hasColumn('battery_systems', 'rack_id'),
        knex.schema.hasColumn('battery_systems', 'bay_position'),
        knex.schema.hasColumn('battery_systems', 'display_color'),
        knex.schema.hasColumn('battery_systems', 'icon_type'),
        knex.schema.hasColumn('battery_systems', 'model_3d_reference'),
        knex.schema.hasColumn('battery_systems', 'installation_date'),
        knex.schema.hasColumn('battery_systems', 'last_maintenance_date'),
    ]);
    await knex.schema.alterTable('battery_systems', (table) => {
        if (!hasPosX) {
            table.decimal('position_x', 10, 4);
        }
        if (!hasPosY) {
            table.decimal('position_y', 10, 4);
        }
        if (!hasPosZ) {
            table.decimal('position_z', 10, 4).defaultTo(0);
        }
        if (!hasPitch) {
            table.decimal('rotation_pitch', 6, 2).defaultTo(0);
        }
        if (!hasYaw) {
            table.decimal('rotation_yaw', 6, 2).defaultTo(0);
        }
        if (!hasRoll) {
            table.decimal('rotation_roll', 6, 2).defaultTo(0);
        }
        if (!hasWidth) {
            table.decimal('width_m', 6, 3);
        }
        if (!hasHeight) {
            table.decimal('height_m', 6, 3);
        }
        if (!hasDepth) {
            table.decimal('depth_m', 6, 3);
        }
        if (!hasRackId) {
            table.string('rack_id', 64);
        }
        if (!hasBayPosition) {
            table.string('bay_position', 32);
        }
        if (!hasDisplayColor) {
            table.string('display_color', 7);
        }
        if (!hasIconType) {
            table.string('icon_type', 64);
        }
        if (!hasModel3dRef) {
            table.string('model_3d_reference', 255);
        }
        if (!hasInstallationDate) {
            table.timestamp('installation_date', { useTz: true });
        }
        if (!hasLastMaintenance) {
            table.timestamp('last_maintenance_date', { useTz: true });
        }
    });
    if (!hasWidth || !hasHeight || !hasDepth) {
        await knex.raw(`ALTER TABLE battery_systems DROP CONSTRAINT IF EXISTS ${DIMENSION_CHECK}`);
        await knex.raw(`ALTER TABLE battery_systems ADD CONSTRAINT ${DIMENSION_CHECK} CHECK ((width_m IS NULL OR width_m > 0) AND (height_m IS NULL OR height_m > 0) AND (depth_m IS NULL OR depth_m > 0))`);
    }
    await knex.raw(`CREATE INDEX IF NOT EXISTS ${POSITION_INDEX} ON battery_systems (zone_id, status, position_x, position_y, position_z)`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS ${POS_X_INDEX} ON battery_systems (position_x)`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS ${POS_Y_INDEX} ON battery_systems (position_y)`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS ${POS_Z_INDEX} ON battery_systems (position_z)`);
    await knex.raw(`DROP INDEX IF EXISTS ${RACK_BAY_UNIQUE}`);
    await knex.raw(`CREATE UNIQUE INDEX ${RACK_BAY_UNIQUE} ON battery_systems (zone_id, rack_id, bay_position) WHERE rack_id IS NOT NULL AND bay_position IS NOT NULL`);
}
export async function down(knex) {
    const tableExists = await knex.schema.hasTable('battery_systems');
    if (!tableExists) {
        return;
    }
    await knex.raw(`DROP INDEX IF EXISTS ${POSITION_INDEX}`);
    await knex.raw(`DROP INDEX IF EXISTS ${POS_X_INDEX}`);
    await knex.raw(`DROP INDEX IF EXISTS ${POS_Y_INDEX}`);
    await knex.raw(`DROP INDEX IF EXISTS ${POS_Z_INDEX}`);
    await knex.raw(`DROP INDEX IF EXISTS ${RACK_BAY_UNIQUE}`);
    await knex.raw(`ALTER TABLE battery_systems DROP CONSTRAINT IF EXISTS ${DIMENSION_CHECK}`);
    const [hasPosX, hasPosY, hasPosZ, hasPitch, hasYaw, hasRoll, hasWidth, hasHeight, hasDepth, hasRackId, hasBayPosition, hasDisplayColor, hasIconType, hasModel3dRef, hasInstallationDate, hasLastMaintenance] = await Promise.all([
        knex.schema.hasColumn('battery_systems', 'position_x'),
        knex.schema.hasColumn('battery_systems', 'position_y'),
        knex.schema.hasColumn('battery_systems', 'position_z'),
        knex.schema.hasColumn('battery_systems', 'rotation_pitch'),
        knex.schema.hasColumn('battery_systems', 'rotation_yaw'),
        knex.schema.hasColumn('battery_systems', 'rotation_roll'),
        knex.schema.hasColumn('battery_systems', 'width_m'),
        knex.schema.hasColumn('battery_systems', 'height_m'),
        knex.schema.hasColumn('battery_systems', 'depth_m'),
        knex.schema.hasColumn('battery_systems', 'rack_id'),
        knex.schema.hasColumn('battery_systems', 'bay_position'),
        knex.schema.hasColumn('battery_systems', 'display_color'),
        knex.schema.hasColumn('battery_systems', 'icon_type'),
        knex.schema.hasColumn('battery_systems', 'model_3d_reference'),
        knex.schema.hasColumn('battery_systems', 'installation_date'),
        knex.schema.hasColumn('battery_systems', 'last_maintenance_date'),
    ]);
    await knex.schema.alterTable('battery_systems', (table) => {
        if (hasLastMaintenance) {
            table.dropColumn('last_maintenance_date');
        }
        if (hasInstallationDate) {
            table.dropColumn('installation_date');
        }
        if (hasModel3dRef) {
            table.dropColumn('model_3d_reference');
        }
        if (hasIconType) {
            table.dropColumn('icon_type');
        }
        if (hasDisplayColor) {
            table.dropColumn('display_color');
        }
        if (hasBayPosition) {
            table.dropColumn('bay_position');
        }
        if (hasRackId) {
            table.dropColumn('rack_id');
        }
        if (hasDepth) {
            table.dropColumn('depth_m');
        }
        if (hasHeight) {
            table.dropColumn('height_m');
        }
        if (hasWidth) {
            table.dropColumn('width_m');
        }
        if (hasRoll) {
            table.dropColumn('rotation_roll');
        }
        if (hasYaw) {
            table.dropColumn('rotation_yaw');
        }
        if (hasPitch) {
            table.dropColumn('rotation_pitch');
        }
        if (hasPosZ) {
            table.dropColumn('position_z');
        }
        if (hasPosY) {
            table.dropColumn('position_y');
        }
        if (hasPosX) {
            table.dropColumn('position_x');
        }
    });
}
