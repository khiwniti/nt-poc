import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('rul_predictions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('battery_system_id').notNullable().references('id').inTable('battery_systems').onDelete('CASCADE');
    table.integer('predicted_rul').notNullable().checkPositive();
    table.decimal('confidence', 3, 2).notNullable().checkBetween([0, 1]);
    table.timestamp('prediction_date', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.string('model_version', 50).notNullable();
    table.jsonb('features').notNullable().defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index('battery_system_id');
    table.index(['prediction_date'], undefined, { indexType: 'DESC' });
    table.index(['battery_system_id', 'prediction_date']);
    table.index('created_at', undefined, { where: knex.raw("created_at < NOW() - INTERVAL '90 days'") });
  });

  await knex.raw(`
    COMMENT ON TABLE rul_predictions IS 
      'Stores RUL (Remaining Useful Life) predictions for battery systems with 90-day retention'
  `);

  await knex.raw(`
    COMMENT ON COLUMN rul_predictions.predicted_rul IS 
      'Predicted remaining useful life in days'
  `);

  await knex.raw(`
    COMMENT ON COLUMN rul_predictions.confidence IS 
      'Prediction confidence score (0-1 range)'
  `);

  await knex.raw(`
    COMMENT ON COLUMN rul_predictions.features IS 
      'JSON object containing model features used for prediction'
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION cleanup_old_rul_predictions()
    RETURNS void AS $$
    BEGIN
        DELETE FROM rul_predictions
        WHERE created_at < NOW() - INTERVAL '90 days';
    END;
    $$ LANGUAGE plpgsql;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP FUNCTION IF EXISTS cleanup_old_rul_predictions()');
  await knex.schema.dropTableIfExists('rul_predictions');
}
