import type { Knex } from 'knex';

const LAYOUT_TYPES = ['rack', 'cabinet', 'floor'];
const LAYOUT_TYPE_CONSTRAINT = 'zones_layout_type_check';
const BOUNDARY_JSON_CONSTRAINT = 'zones_boundary_coordinates_json_check';
const FACILITY_FLOOR_INDEX = 'idx_zones_facility_floor';
const BOUNDARY_GIN_INDEX = 'idx_zones_boundary_coordinates_gin';

export async function up(knex: Knex): Promise<void> {
  const zonesExists = await knex.schema.hasTable('zones');
  if (!zonesExists) {
    return;
  }

  const [hasFloorLevel, hasWidth, hasLength, hasHeight, hasBoundary, hasMaxCapacity, hasFloorPlanUrl, hasLayoutType] =
    await Promise.all([
      knex.schema.hasColumn('zones', 'floor_level'),
      knex.schema.hasColumn('zones', 'zone_width_m'),
      knex.schema.hasColumn('zones', 'zone_length_m'),
      knex.schema.hasColumn('zones', 'zone_height_m'),
      knex.schema.hasColumn('zones', 'boundary_coordinates'),
      knex.schema.hasColumn('zones', 'max_battery_capacity'),
      knex.schema.hasColumn('zones', 'floor_plan_image_url'),
      knex.schema.hasColumn('zones', 'layout_type'),
    ]);

  await knex.schema.alterTable('zones', (table) => {
    if (!hasFloorLevel) {
      table.integer('floor_level').notNullable().defaultTo(1);
    }
    if (!hasWidth) {
      table.decimal('zone_width_m', 8, 2);
    }
    if (!hasLength) {
      table.decimal('zone_length_m', 8, 2);
    }
    if (!hasHeight) {
      table.decimal('zone_height_m', 8, 2);
    }
    if (!hasBoundary) {
      table.jsonb('boundary_coordinates').defaultTo(knex.raw("'[]'::jsonb"));
    }
    if (!hasMaxCapacity) {
      table.integer('max_battery_capacity');
    }
    if (!hasFloorPlanUrl) {
      table.string('floor_plan_image_url', 255);
    }
    if (!hasLayoutType) {
      table.string('layout_type', 32).notNullable().defaultTo('rack');
    }
  });

  if (!hasLayoutType) {
    await knex.raw(`ALTER TABLE zones DROP CONSTRAINT IF EXISTS ${LAYOUT_TYPE_CONSTRAINT}`);
    await knex.raw(
      `ALTER TABLE zones ADD CONSTRAINT ${LAYOUT_TYPE_CONSTRAINT} CHECK (layout_type = ANY(ARRAY['rack','cabinet','floor']))`
    );
  }

  if (!hasBoundary) {
    await knex.raw(`ALTER TABLE zones DROP CONSTRAINT IF EXISTS ${BOUNDARY_JSON_CONSTRAINT}`);
    await knex.raw(
      `ALTER TABLE zones ADD CONSTRAINT ${BOUNDARY_JSON_CONSTRAINT} CHECK (boundary_coordinates IS NULL OR jsonb_typeof(boundary_coordinates) = 'array')`
    );
  }

  await knex.raw(
    `CREATE INDEX IF NOT EXISTS ${FACILITY_FLOOR_INDEX} ON zones (facility_id, floor_level)`
  );

  await knex.raw(
    `CREATE INDEX IF NOT EXISTS ${BOUNDARY_GIN_INDEX} ON zones USING GIN (boundary_coordinates jsonb_path_ops)`
  );
}

export async function down(knex: Knex): Promise<void> {
  const zonesExists = await knex.schema.hasTable('zones');
  if (!zonesExists) {
    return;
  }

  await knex.raw(`DROP INDEX IF EXISTS ${FACILITY_FLOOR_INDEX}`);
  await knex.raw(`DROP INDEX IF EXISTS ${BOUNDARY_GIN_INDEX}`);

  await knex.raw(`ALTER TABLE zones DROP CONSTRAINT IF EXISTS ${LAYOUT_TYPE_CONSTRAINT}`);
  await knex.raw(`ALTER TABLE zones DROP CONSTRAINT IF EXISTS ${BOUNDARY_JSON_CONSTRAINT}`);

  const [hasFloorLevel, hasWidth, hasLength, hasHeight, hasBoundary, hasMaxCapacity, hasFloorPlanUrl, hasLayoutType] =
    await Promise.all([
      knex.schema.hasColumn('zones', 'floor_level'),
      knex.schema.hasColumn('zones', 'zone_width_m'),
      knex.schema.hasColumn('zones', 'zone_length_m'),
      knex.schema.hasColumn('zones', 'zone_height_m'),
      knex.schema.hasColumn('zones', 'boundary_coordinates'),
      knex.schema.hasColumn('zones', 'max_battery_capacity'),
      knex.schema.hasColumn('zones', 'floor_plan_image_url'),
      knex.schema.hasColumn('zones', 'layout_type'),
    ]);

  await knex.schema.alterTable('zones', (table) => {
    if (hasLayoutType) {
      table.dropColumn('layout_type');
    }
    if (hasFloorPlanUrl) {
      table.dropColumn('floor_plan_image_url');
    }
    if (hasMaxCapacity) {
      table.dropColumn('max_battery_capacity');
    }
    if (hasBoundary) {
      table.dropColumn('boundary_coordinates');
    }
    if (hasHeight) {
      table.dropColumn('zone_height_m');
    }
    if (hasLength) {
      table.dropColumn('zone_length_m');
    }
    if (hasWidth) {
      table.dropColumn('zone_width_m');
    }
    if (hasFloorLevel) {
      table.dropColumn('floor_level');
    }
  });
}
