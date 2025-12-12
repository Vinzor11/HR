<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'sqlite') {
            // SQLite used in tests doesn't support the MySQL-specific FK drops below
            return;
        }

        // Training applications act as training logs/history; keep rows when parents are deleted
        if (Schema::hasTable('apply_training')) {
            // Drop FK on training_id if present
            DB::unprepared("
                SET @fk := (
                    SELECT CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'apply_training'
                      AND COLUMN_NAME = 'training_id'
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                    LIMIT 1
                );
                SET @sql := IF(@fk IS NULL, 'SELECT 1', CONCAT('ALTER TABLE apply_training DROP FOREIGN KEY ', @fk));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            // Drop FK on employee_id if present
            DB::unprepared("
                SET @fk := (
                    SELECT CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'apply_training'
                      AND COLUMN_NAME = 'employee_id'
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                    LIMIT 1
                );
                SET @sql := IF(@fk IS NULL, 'SELECT 1', CONCAT('ALTER TABLE apply_training DROP FOREIGN KEY ', @fk));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            // Null out orphaned references
            DB::statement('UPDATE apply_training at LEFT JOIN trainings t ON t.training_id = at.training_id SET at.training_id = NULL WHERE t.training_id IS NULL');
            DB::statement('UPDATE apply_training at LEFT JOIN employees e ON e.id = at.employee_id SET at.employee_id = NULL WHERE e.id IS NULL');

            // Alter columns to allow nulls
            DB::statement('ALTER TABLE apply_training MODIFY training_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE apply_training MODIFY employee_id VARCHAR(15) NULL');

            // Re-add FKs with SET NULL on delete
            Schema::table('apply_training', function (Blueprint $table) {
                $table->foreign('training_id')
                    ->references('training_id')
                    ->on('trainings')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();

                $table->foreign('employee_id')
                    ->references('id')
                    ->on('employees')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'sqlite') {
            // No-op for SQLite; there are no FKs to restore
            return;
        }

        if (Schema::hasTable('apply_training')) {
            // Drop nullable FKs
            DB::unprepared("
                SET @fk := (
                    SELECT CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'apply_training'
                      AND COLUMN_NAME = 'training_id'
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                    LIMIT 1
                );
                SET @sql := IF(@fk IS NULL, 'SELECT 1', CONCAT('ALTER TABLE apply_training DROP FOREIGN KEY ', @fk));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            DB::unprepared("
                SET @fk := (
                    SELECT CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'apply_training'
                      AND COLUMN_NAME = 'employee_id'
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                    LIMIT 1
                );
                SET @sql := IF(@fk IS NULL, 'SELECT 1', CONCAT('ALTER TABLE apply_training DROP FOREIGN KEY ', @fk));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            // Revert columns to NOT NULL
            DB::statement('ALTER TABLE apply_training MODIFY training_id BIGINT UNSIGNED NOT NULL');
            DB::statement('ALTER TABLE apply_training MODIFY employee_id VARCHAR(15) NOT NULL');

            // Restore cascade delete behavior
            Schema::table('apply_training', function (Blueprint $table) {
                $table->foreign('training_id')
                    ->references('training_id')
                    ->on('trainings')
                    ->onDelete('cascade');

                $table->foreign('employee_id')
                    ->references('id')
                    ->on('employees')
                    ->onDelete('cascade');
            });
        }
    }
};

