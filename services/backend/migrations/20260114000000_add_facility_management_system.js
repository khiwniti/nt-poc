/**
 * Migration: Add Facility Management System Tables
 *
 * Creates comprehensive facility management tables for:
 * - Enhanced facilities with metrics
 * - Lease contracts management
 * - Work orders and maintenance
 * - Asset lifecycle tracking
 * - Predictive maintenance
 * - ISO-compliant reports
 * - Spare parts inventory
 * - Suppliers management
 * - Purchase orders
 * - User settings
 */
export async function up(knex) {
    // 1. Extend existing facilities table with new columns
    await knex.schema.alterTable('facilities', (table) => {
        table.string('region').nullable();
        table.decimal('lat', 10, 8).nullable();
        table.decimal('lng', 11, 8).nullable();
        table.jsonb('metrics').nullable(); // powerUsage, temperature, humidity, serverLoad, pue, occupancy
        table.index(['region']);
    });
    // 2. Lease Contracts Table
    await knex.schema.createTable('lease_contracts', (table) => {
        table.string('id').primary();
        table.uuid('facility_id').notNullable();
        table.string('tenant_name').notNullable();
        table.string('unit_number').nullable();
        table.decimal('area_sqm', 10, 2).nullable();
        table.date('start_date').notNullable();
        table.date('end_date').notNullable();
        table.decimal('monthly_rent', 12, 2).notNullable();
        table.enum('status', ['Active', 'Expiring', 'Expired', 'Pending']).defaultTo('Active');
        table.string('contact_person').nullable();
        table.string('contact_phone').nullable();
        table.decimal('deposit_amount', 12, 2).nullable();
        table.jsonb('documents').nullable();
        table.timestamps(true, true);
        table.index(['facility_id']);
        table.index(['status']);
        table.index(['end_date']);
        table.foreign('facility_id').references('id').inTable('facilities').onDelete('CASCADE');
    });
    // 3. Work Orders Table
    await knex.schema.createTable('work_orders', (table) => {
        table.string('id').primary();
        table.string('title').notNullable();
        table.uuid('facility_id').notNullable();
        table.string('asset_id').nullable();
        table.enum('priority', ['Critical', 'High', 'Medium', 'Low']).notNullable();
        table.enum('status', ['Open', 'In_Progress', 'On_Hold', 'Completed']).defaultTo('Open');
        table.enum('type', ['Preventive', 'Corrective', 'Installation', 'Inspection']).notNullable();
        table.string('assigned_to').nullable();
        table.string('reported_by').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('due_date').nullable();
        table.text('description').nullable();
        table.decimal('estimated_cost', 12, 2).nullable();
        table.jsonb('checklist').nullable();
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.index(['facility_id']);
        table.index(['status']);
        table.index(['priority']);
        table.index(['due_date']);
        table.foreign('facility_id').references('id').inTable('facilities').onDelete('CASCADE');
    });
    // 4. Asset Lifecycle Table
    await knex.schema.createTable('asset_lifecycle', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.enum('category', ['HVAC', 'Electrical', 'Plumbing', 'Safety', 'IT Infrastructure']).notNullable();
        table.uuid('facility_id').notNullable();
        table.date('install_date').notNullable();
        table.integer('expected_life_years').notNullable();
        table.decimal('purchase_cost', 12, 2).nullable();
        table.decimal('replacement_cost', 12, 2).nullable();
        table.enum('condition', ['Excellent', 'Good', 'Fair', 'Poor', 'End-of-Life']).defaultTo('Good');
        table.enum('criticality', ['Mission Critical', 'Business Critical', 'Support']).notNullable();
        table.date('last_assessment_date').nullable();
        table.integer('risk_score').nullable(); // 1-100
        table.timestamps(true, true);
        table.index(['facility_id']);
        table.index(['category']);
        table.index(['condition']);
        table.index(['criticality']);
        table.foreign('facility_id').references('id').inTable('facilities').onDelete('CASCADE');
    });
    // 5. Predictive Maintenance Assets Table
    await knex.schema.createTable('predictive_assets', (table) => {
        table.string('id').primary();
        table.string('asset_id').nullable();
        table.string('name').notNullable();
        table.string('category').nullable();
        table.uuid('facility_id').notNullable();
        table.integer('health_score').nullable(); // 0-100
        table.date('predicted_failure_date').nullable();
        table.integer('confidence').nullable(); // 0-100
        table.jsonb('telemetry').nullable(); // vibration, temperature, sound, efficiency
        table.jsonb('logs').nullable();
        table.text('maintenance_suggestion').nullable();
        table.timestamp('last_analysis').nullable();
        table.timestamps(true, true);
        table.index(['facility_id']);
        table.index(['health_score']);
        table.index(['predicted_failure_date']);
        table.foreign('facility_id').references('id').inTable('facilities').onDelete('CASCADE');
        table.foreign('asset_id').references('id').inTable('asset_lifecycle').onDelete('SET NULL');
    });
    // 6. Reports Table (ISO-compliant)
    await knex.schema.createTable('report_documents', (table) => {
        table.string('id').primary();
        table.string('title').notNullable();
        table.enum('standard', ['ISO-27001', 'ISO-22301', 'ISO-50001', 'GENERAL']).defaultTo('GENERAL');
        table.string('iso_control_id').nullable();
        table.enum('classification', ['Public', 'Internal', 'Confidential', 'Restricted']).defaultTo('Internal');
        table.string('author').notNullable();
        table.timestamp('last_modified').defaultTo(knex.fn.now());
        table.enum('status', ['draft', 'review', 'approved', 'published']).defaultTo('draft');
        table.string('version').defaultTo('1.0');
        table.jsonb('blocks').nullable(); // Report content blocks
        table.uuid('linked_alert_id').nullable(); // Changed from string to uuid
        table.timestamps(true, true);
        table.index(['standard']);
        table.index(['status']);
        table.index(['classification']);
        table.index(['linked_alert_id']);
        table.foreign('linked_alert_id').references('id').inTable('alerts').onDelete('SET NULL');
    });
    // 7. Spare Parts Inventory Table
    await knex.schema.createTable('spare_parts', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.string('sku').unique().notNullable();
        table.string('category').nullable();
        table.integer('current_stock').defaultTo(0);
        table.integer('min_stock').notNullable();
        table.integer('max_stock').notNullable();
        table.string('unit').notNullable();
        table.decimal('cost_per_unit', 12, 2).notNullable();
        table.string('location').nullable();
        table.string('supplier_id').nullable();
        table.integer('lead_time_days').nullable();
        table.date('last_used').nullable();
        table.enum('status', ['In Stock', 'Low Stock', 'Out of Stock', 'On Order']).defaultTo('In Stock');
        table.jsonb('compatible_models').nullable();
        table.timestamps(true, true);
        table.index(['sku']);
        table.index(['status']);
        table.index(['supplier_id']);
    });
    // 8. Suppliers Table
    await knex.schema.createTable('suppliers', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.string('contact_person').nullable();
        table.string('phone').nullable();
        table.string('email').nullable();
        table.jsonb('category').nullable(); // Array of categories
        table.decimal('rating', 3, 2).nullable(); // 1-5
        table.integer('active_contracts').defaultTo(0);
        table.timestamps(true, true);
        table.index(['rating']);
    });
    // 9. Purchase Orders Table
    await knex.schema.createTable('purchase_orders', (table) => {
        table.string('id').primary();
        table.string('supplier_id').notNullable();
        table.timestamp('created_date').defaultTo(knex.fn.now());
        table.timestamp('expected_date').nullable();
        table.jsonb('items').notNullable(); // Array of {partId, quantity, unitCost}
        table.decimal('total_amount', 12, 2).notNullable();
        table.enum('status', ['Draft', 'Pending', 'Approved', 'Received', 'Cancelled']).defaultTo('Draft');
        table.string('requested_by').nullable();
        table.timestamps(true, true);
        table.index(['supplier_id']);
        table.index(['status']);
        table.index(['created_date']);
        table.foreign('supplier_id').references('id').inTable('suppliers').onDelete('RESTRICT');
    });
    // 10. User Settings Table
    await knex.schema.createTable('user_settings', (table) => {
        table.string('user_id').primary();
        table.string('username').notNullable();
        table.string('email').nullable();
        table.enum('theme', ['light', 'dark']).defaultTo('light');
        table.jsonb('notifications').nullable(); // critical, daily, maintenance, email, sms, line
        table.jsonb('preferences').nullable();
        table.timestamps(true, true);
    });
    // Add foreign key for spare_parts -> suppliers
    await knex.schema.alterTable('spare_parts', (table) => {
        table.foreign('supplier_id').references('id').inTable('suppliers').onDelete('SET NULL');
    });
    console.log('✅ Facility management system tables created successfully');
}
export async function down(knex) {
    // Drop tables in reverse order to respect foreign key constraints
    await knex.schema.dropTableIfExists('user_settings');
    await knex.schema.dropTableIfExists('purchase_orders');
    await knex.schema.dropTableIfExists('spare_parts');
    await knex.schema.dropTableIfExists('suppliers');
    await knex.schema.dropTableIfExists('report_documents');
    await knex.schema.dropTableIfExists('predictive_assets');
    await knex.schema.dropTableIfExists('asset_lifecycle');
    await knex.schema.dropTableIfExists('work_orders');
    await knex.schema.dropTableIfExists('lease_contracts');
    // Revert alterations to facilities table
    await knex.schema.alterTable('facilities', (table) => {
        table.dropColumn('region');
        table.dropColumn('lat');
        table.dropColumn('lng');
        table.dropColumn('metrics');
    });
    console.log('✅ Facility management system tables dropped successfully');
}
