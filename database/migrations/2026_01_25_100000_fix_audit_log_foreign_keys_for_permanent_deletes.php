<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration ensures all audit log tables preserve their records
     * when related entities are permanently deleted by using ON DELETE SET NULL
     * on foreign key constraints.
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'sqlite') {
            // SQLite used in tests doesn't support the MySQL-specific FK operations below
            return;
        }

        // Fix training_audit_log table if it exists (old table structure)
        if (Schema::hasTable('training_audit_log')) {
            // Drop existing FK constraint if it exists
            DB::unprepared("
                SET @fk := (
                    SELECT CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'training_audit_log'
                      AND COLUMN_NAME = 'training_id'
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                    LIMIT 1
                );
                SET @sql := IF(@fk IS NULL, 'SELECT 1', CONCAT('ALTER TABLE training_audit_log DROP FOREIGN KEY ', @fk));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            // Make training_id nullable and null out orphaned references
            DB::statement('UPDATE training_audit_log tal LEFT JOIN trainings t ON t.training_id = tal.training_id SET tal.training_id = NULL WHERE t.training_id IS NULL');
            DB::statement('ALTER TABLE training_audit_log MODIFY training_id BIGINT UNSIGNED NULL');

            // Re-add FK with SET NULL on delete to preserve audit logs
            Schema::table('training_audit_log', function (Blueprint $table) {
                $table->foreign('training_id')
                    ->references('training_id')
                    ->on('trainings')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            });
        }

        // Note: The following audit log tables are already configured correctly:
        // - audit_logs (unified table): No foreign keys to entity tables (entity_id is a string)
        // - employee_audit_log: Already has nullOnDelete() in migration 2026_01_24_092858
        // - user_audit_log: Already has nullOnDelete() in migration 2026_01_24_093359
        // - organizational_audit_log: No foreign keys (uses unit_id and unit_type columns)
        //
        // This migration specifically fixes training_audit_log if it exists.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'sqlite') {
            return;
        }

        if (Schema::hasTable('training_audit_log')) {
            // Drop nullable FK
            DB::unprepared("
                SET @fk := (
                    SELECT CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'training_audit_log'
                      AND COLUMN_NAME = 'training_id'
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                    LIMIT 1
                );
                SET @sql := IF(@fk IS NULL, 'SELECT 1', CONCAT('ALTER TABLE training_audit_log DROP FOREIGN KEY ', @fk));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            // Revert to NOT NULL (this may fail if there are NULL values, but that's expected in down())
            try {
                DB::statement('ALTER TABLE training_audit_log MODIFY training_id BIGINT UNSIGNED NOT NULL');
            } catch (\Exception $e) {
                // Ignore if there are NULL values
            }

            // Restore restrict delete behavior
            Schema::table('training_audit_log', function (Blueprint $table) {
                $table->foreign('training_id')
                    ->references('training_id')
                    ->on('trainings')
                    ->restrictOnDelete()
                    ->cascadeOnUpdate();
            });
        }
    }
};
