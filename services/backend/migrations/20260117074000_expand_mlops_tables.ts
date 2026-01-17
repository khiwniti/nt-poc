import type { Knex } from 'knex';

const FEATURE_STORE_TABLE = 'feature_store';
const TRAINING_DATASETS_TABLE = 'training_datasets';
const MODEL_VERSIONS_TABLE = 'model_versions';
const PREDICTION_HISTORY_TABLE = 'prediction_history';
const MODEL_DRIFT_TABLE = 'model_drift_metrics';
const MODEL_PERF_BATTERY_TABLE = 'model_performance_per_battery';

const MODEL_VERSION_UNIQUE = 'uq_model_versions_name_version';
const DATASET_UNIQUE = 'uq_training_datasets_name_version';
const MODEL_PERF_UNIQUE = 'uq_model_perf_battery_period';
const PREDICTION_TYPE_CHECK = 'prediction_history_type_check';
const DRIFT_TYPE_CHECK = 'model_drift_metrics_type_check';

export async function up(knex: Knex): Promise<void> {
  const batterySystemsExists = await knex.schema.hasTable('battery_systems');
  if (!batterySystemsExists) {
    return;
  }

  const trainingDatasetsExists = await knex.schema.hasTable(TRAINING_DATASETS_TABLE);
  if (!trainingDatasetsExists) {
    await knex.schema.createTable(TRAINING_DATASETS_TABLE, (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('dataset_name', 120).notNullable();
      table.string('dataset_version', 32).notNullable();
      table.timestamp('start_date', { useTz: true });
      table.timestamp('end_date', { useTz: true });
      table.jsonb('battery_system_ids');
      table.integer('total_records');
      table.jsonb('feature_columns');
      table.string('target_column', 64);
      table.string('storage_path', 255);
      table.string('data_hash', 128);
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

      table.unique(['dataset_name', 'dataset_version'], { indexName: DATASET_UNIQUE });
    });
  }

  const modelVersionsExists = await knex.schema.hasTable(MODEL_VERSIONS_TABLE);
  if (!modelVersionsExists) {
    await knex.schema.createTable(MODEL_VERSIONS_TABLE, (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('model_name', 120).notNullable();
      table.string('version', 32).notNullable();
      table.string('framework', 50);
      table.string('model_file_path', 255);
      table
        .uuid('training_dataset_id')
        .references('id')
        .inTable(TRAINING_DATASETS_TABLE)
        .onDelete('SET NULL');
      table.jsonb('hyperparameters');
      table.jsonb('training_metrics');
      table.jsonb('validation_metrics');
      table.timestamp('deployed_at', { useTz: true });
      table.boolean('is_active').defaultTo(false);
      table.string('created_by', 120);
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

      table.unique(['model_name', 'version'], { indexName: MODEL_VERSION_UNIQUE });
      table.index(['model_name', knex.raw('is_active DESC')], 'idx_model_versions_name_active');
    });
  }

  const featureStoreExists = await knex.schema.hasTable(FEATURE_STORE_TABLE);
  if (!featureStoreExists) {
    await knex.schema.createTable(FEATURE_STORE_TABLE, (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table
        .uuid('battery_system_id')
        .notNullable()
        .references('id')
        .inTable('battery_systems')
        .onDelete('CASCADE');
      table.timestamp('feature_timestamp', { useTz: true }).notNullable();
      table.decimal('voltage_mean', 12, 5);
      table.decimal('voltage_std', 12, 5);
      table.decimal('voltage_min', 12, 5);
      table.decimal('voltage_max', 12, 5);
      table.decimal('current_mean', 12, 5);
      table.decimal('current_std', 12, 5);
      table.decimal('current_min', 12, 5);
      table.decimal('current_max', 12, 5);
      table.decimal('temperature_mean', 12, 5);
      table.decimal('temperature_std', 12, 5);
      table.decimal('temperature_min', 12, 5);
      table.decimal('temperature_max', 12, 5);
      table.decimal('soc_trend', 8, 4);
      table.decimal('soh_trend', 8, 4);
      table.decimal('power_consumption_total', 12, 4);
      table.decimal('anomaly_score', 6, 4);
      table.string('feature_version', 32);
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

      table.index(['battery_system_id', 'feature_timestamp'], 'idx_feature_store_battery_timestamp');
    });

    await knex.raw(
      `COMMENT ON TABLE ${FEATURE_STORE_TABLE} IS 'Feature aggregates for ML pipelines. Consider converting to Timescale hypertable externally.'`
    );
  }

  const predictionHistoryExists = await knex.schema.hasTable(PREDICTION_HISTORY_TABLE);
  if (!predictionHistoryExists) {
    await knex.schema.createTable(PREDICTION_HISTORY_TABLE, (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table
        .uuid('battery_system_id')
        .notNullable()
        .references('id')
        .inTable('battery_systems')
        .onDelete('CASCADE');
      table
        .uuid('model_version_id')
        .notNullable()
        .references('id')
        .inTable(MODEL_VERSIONS_TABLE)
        .onDelete('CASCADE');
      table.timestamp('prediction_timestamp', { useTz: true }).notNullable();
      table.string('prediction_type', 32).notNullable();
      table.decimal('predicted_value', 12, 5);
      table.decimal('confidence_score', 6, 4);
      table.jsonb('feature_values_snapshot');
      table.jsonb('prediction_metadata');
      table.decimal('actual_value', 12, 5);
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

      table.index(['battery_system_id', knex.raw('prediction_timestamp DESC')], 'idx_prediction_history_battery_timestamp');
      table.index(['model_version_id', knex.raw('prediction_timestamp DESC')], 'idx_prediction_history_model_timestamp');
    });

    await knex.raw(`ALTER TABLE ${PREDICTION_HISTORY_TABLE} DROP CONSTRAINT IF EXISTS ${PREDICTION_TYPE_CHECK}`);
    await knex.raw(
      `ALTER TABLE ${PREDICTION_HISTORY_TABLE} ADD CONSTRAINT ${PREDICTION_TYPE_CHECK} CHECK (prediction_type IN ('rul','anomaly','failure_mode'))`
    );
    await knex.raw(
      `CREATE INDEX IF NOT EXISTS idx_prediction_history_feature_snapshot_gin ON ${PREDICTION_HISTORY_TABLE} USING GIN (feature_values_snapshot)`
    );
    await knex.raw(
      `CREATE INDEX IF NOT EXISTS idx_prediction_history_metadata_gin ON ${PREDICTION_HISTORY_TABLE} USING GIN (prediction_metadata)`
    );
  }

  const modelDriftExists = await knex.schema.hasTable(MODEL_DRIFT_TABLE);
  if (!modelDriftExists) {
    await knex.schema.createTable(MODEL_DRIFT_TABLE, (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table
        .uuid('model_version_id')
        .notNullable()
        .references('id')
        .inTable(MODEL_VERSIONS_TABLE)
        .onDelete('CASCADE');
      table
        .uuid('battery_system_id')
        .references('id')
        .inTable('battery_systems')
        .onDelete('SET NULL');
      table.timestamp('metric_timestamp', { useTz: true }).notNullable();
      table.string('drift_type', 32).notNullable();
      table.decimal('drift_score', 6, 4);
      table.string('metric_name', 64);
      table.jsonb('baseline_distribution');
      table.jsonb('current_distribution');
      table.boolean('threshold_exceeded');
      table.boolean('alert_triggered');
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

      table.index(['model_version_id', knex.raw('metric_timestamp DESC')], 'idx_model_drift_version_timestamp');
    });

    await knex.raw(`ALTER TABLE ${MODEL_DRIFT_TABLE} DROP CONSTRAINT IF EXISTS ${DRIFT_TYPE_CHECK}`);
    await knex.raw(
      `ALTER TABLE ${MODEL_DRIFT_TABLE} ADD CONSTRAINT ${DRIFT_TYPE_CHECK} CHECK (drift_type IN ('data_drift','concept_drift','prediction_drift'))`
    );
  }

  const modelPerfExists = await knex.schema.hasTable(MODEL_PERF_BATTERY_TABLE);
  if (!modelPerfExists) {
    await knex.schema.createTable(MODEL_PERF_BATTERY_TABLE, (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table
        .uuid('model_version_id')
        .notNullable()
        .references('id')
        .inTable(MODEL_VERSIONS_TABLE)
        .onDelete('CASCADE');
      table
        .uuid('battery_system_id')
        .notNullable()
        .references('id')
        .inTable('battery_systems')
        .onDelete('CASCADE');
      table.timestamp('evaluation_period_start', { useTz: true }).notNullable();
      table.timestamp('evaluation_period_end', { useTz: true }).notNullable();
      table.decimal('mae', 10, 5);
      table.decimal('rmse', 10, 5);
      table.decimal('r2_score', 10, 5);
      table.decimal('precision', 6, 5);
      table.decimal('recall', 6, 5);
      table.decimal('f1_score', 6, 5);
      table.integer('prediction_count');
      table.decimal('error_rate', 6, 5);
      table.jsonb('performance_json');
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

      table.unique([
        'model_version_id',
        'battery_system_id',
        'evaluation_period_start',
      ], { indexName: MODEL_PERF_UNIQUE });
      table.index(['model_version_id'], 'idx_model_performance_version');
      table.index(['battery_system_id'], 'idx_model_performance_battery');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS idx_prediction_history_feature_snapshot_gin`);
  await knex.raw(`DROP INDEX IF EXISTS idx_prediction_history_metadata_gin`);

  await knex.schema.dropTableIfExists(MODEL_PERF_BATTERY_TABLE);
  await knex.schema.dropTableIfExists(MODEL_DRIFT_TABLE);
  await knex.schema.dropTableIfExists(PREDICTION_HISTORY_TABLE);
  await knex.schema.dropTableIfExists(FEATURE_STORE_TABLE);
  await knex.schema.dropTableIfExists(MODEL_VERSIONS_TABLE);
  await knex.schema.dropTableIfExists(TRAINING_DATASETS_TABLE);
}
