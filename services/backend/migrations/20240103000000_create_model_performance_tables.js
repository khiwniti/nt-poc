export async function up(knex) {
    // Model predictions table
    await knex.schema.createTable('model_predictions', (table) => {
        table.increments('id').primary();
        table.string('battery_system_id', 255).notNullable();
        table.timestamp('prediction_time', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        // Predicted values
        table.decimal('predicted_soc', 5, 2);
        table.decimal('predicted_soh', 5, 2);
        table.decimal('predicted_temperature', 6, 2);
        table.decimal('predicted_power', 10, 2);
        // Actual values
        table.decimal('actual_soc', 5, 2);
        table.decimal('actual_soh', 5, 2);
        table.decimal('actual_temperature', 6, 2);
        table.decimal('actual_power', 10, 2);
        // Model metadata
        table.string('model_version', 50).notNullable();
        // Prediction metadata
        table.integer('prediction_horizon_minutes').notNullable();
        table.timestamp('actual_recorded_at', { useTz: true });
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.index(['battery_system_id', 'prediction_time']);
        table.index('model_version');
    });
    // Model performance metrics table
    await knex.schema.createTable('model_performance_metrics', (table) => {
        table.increments('id').primary();
        table.string('battery_system_id', 255);
        table.timestamp('metric_time', { useTz: true }).notNullable();
        table.string('model_version', 50).notNullable();
        // Accuracy metrics - MAE
        table.decimal('mae_soc', 10, 4);
        table.decimal('mae_soh', 10, 4);
        table.decimal('mae_temperature', 10, 4);
        table.decimal('mae_power', 10, 4);
        // Accuracy metrics - RMSE
        table.decimal('rmse_soc', 10, 4);
        table.decimal('rmse_soh', 10, 4);
        table.decimal('rmse_temperature', 10, 4);
        table.decimal('rmse_power', 10, 4);
        // Accuracy metrics - R2
        table.decimal('r2_soc', 10, 6);
        table.decimal('r2_soh', 10, 6);
        table.decimal('r2_temperature', 10, 6);
        table.decimal('r2_power', 10, 6);
        // Data quality metrics
        table.integer('prediction_count').notNullable().defaultTo(0);
        table.integer('missing_actual_count').notNullable().defaultTo(0);
        table.integer('outlier_count').notNullable().defaultTo(0);
        // Aggregation period
        table.string('aggregation_period', 20).notNullable();
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.index(['battery_system_id', 'metric_time']);
    });
    // Model drift metrics table
    await knex.schema.createTable('model_drift_metrics', (table) => {
        table.increments('id').primary();
        table.string('battery_system_id', 255);
        table.timestamp('metric_time', { useTz: true }).notNullable();
        table.string('model_version', 50).notNullable();
        // Feature distribution metrics
        table.decimal('voltage_drift_score', 10, 6);
        table.decimal('current_drift_score', 10, 6);
        table.decimal('temperature_drift_score', 10, 6);
        table.decimal('soc_drift_score', 10, 6);
        // Overall drift indicators
        table.decimal('overall_drift_score', 10, 6);
        table.boolean('drift_detected').notNullable().defaultTo(false);
        // Baseline comparison window
        table.timestamp('baseline_start', { useTz: true }).notNullable();
        table.timestamp('baseline_end', { useTz: true }).notNullable();
        table.timestamp('comparison_start', { useTz: true }).notNullable();
        table.timestamp('comparison_end', { useTz: true }).notNullable();
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.index(['battery_system_id', 'metric_time']);
    });
    // Data quality metrics table
    await knex.schema.createTable('data_quality_metrics', (table) => {
        table.increments('id').primary();
        table.string('battery_system_id', 255);
        table.timestamp('metric_time', { useTz: true }).notNullable();
        // Missing value counts
        table.integer('missing_voltage_count').notNullable().defaultTo(0);
        table.integer('missing_current_count').notNullable().defaultTo(0);
        table.integer('missing_temperature_count').notNullable().defaultTo(0);
        table.integer('missing_soc_count').notNullable().defaultTo(0);
        table.integer('missing_soh_count').notNullable().defaultTo(0);
        // Total records in period
        table.integer('total_records').notNullable();
        // Outlier counts
        table.integer('voltage_outlier_count').notNullable().defaultTo(0);
        table.integer('current_outlier_count').notNullable().defaultTo(0);
        table.integer('temperature_outlier_count').notNullable().defaultTo(0);
        table.integer('soc_outlier_count').notNullable().defaultTo(0);
        // Range violations
        table.integer('voltage_range_violations').notNullable().defaultTo(0);
        table.integer('current_range_violations').notNullable().defaultTo(0);
        table.integer('temperature_range_violations').notNullable().defaultTo(0);
        table.integer('soc_range_violations').notNullable().defaultTo(0);
        // Data freshness
        table.integer('max_time_gap_seconds');
        table.string('aggregation_period', 20).notNullable();
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.index(['battery_system_id', 'metric_time']);
    });
    // Model health alerts table
    await knex.schema.createTable('model_health_alerts', (table) => {
        table.increments('id').primary();
        table.string('battery_system_id', 255);
        table.timestamp('alert_time', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.string('model_version', 50).notNullable();
        // Alert details
        table.string('alert_type', 50).notNullable();
        table.string('severity', 20).notNullable();
        table.text('message').notNullable();
        // Metrics that triggered alert
        table.string('metric_name', 100);
        table.decimal('metric_value', 10, 6);
        table.decimal('threshold_value', 10, 6);
        // Alert lifecycle
        table.boolean('acknowledged').notNullable().defaultTo(false);
        table.timestamp('acknowledged_at', { useTz: true });
        table.string('acknowledged_by', 255);
        table.boolean('resolved').notNullable().defaultTo(false);
        table.timestamp('resolved_at', { useTz: true });
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.index(['battery_system_id', 'alert_time']);
        table.index(['resolved', 'severity']);
    });
    await knex.raw(`
    CREATE INDEX model_health_alerts_unresolved_idx
    ON model_health_alerts (severity, alert_time DESC)
    WHERE resolved = FALSE
  `);
    // Model health scores table
    await knex.schema.createTable('model_health_scores', (table) => {
        table.increments('id').primary();
        table.string('battery_system_id', 255);
        table.timestamp('score_time', { useTz: true }).notNullable();
        table.string('model_version', 50).notNullable();
        // Component scores (0-100)
        table.decimal('accuracy_score', 5, 2).notNullable();
        table.decimal('drift_score', 5, 2).notNullable();
        table.decimal('data_quality_score', 5, 2).notNullable();
        // Overall health score
        table.decimal('overall_health_score', 5, 2).notNullable();
        table.string('health_status', 20).notNullable();
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.index(['battery_system_id', 'score_time']);
    });
    // Create trigger function for updated_at
    await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
    // Create trigger
    await knex.raw(`
    CREATE TRIGGER update_model_predictions_updated_at 
    BEFORE UPDATE ON model_predictions 
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
}
export async function down(knex) {
    await knex.raw('DROP TRIGGER IF EXISTS update_model_predictions_updated_at ON model_predictions');
    await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column()');
    await knex.schema.dropTableIfExists('model_health_scores');
    await knex.schema.dropTableIfExists('model_health_alerts');
    await knex.schema.dropTableIfExists('data_quality_metrics');
    await knex.schema.dropTableIfExists('model_drift_metrics');
    await knex.schema.dropTableIfExists('model_performance_metrics');
    await knex.schema.dropTableIfExists('model_predictions');
}
