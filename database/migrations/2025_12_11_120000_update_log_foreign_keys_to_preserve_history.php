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

        // Employee audit log: keep records even if employee is deleted
        if (Schema::hasTable('employee_audit_log')) {
            // Drop FK if it exists
            DB::unprepared("
                SET @fk := (
                    SELECT CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'employee_audit_log'
                      AND COLUMN_NAME = 'employee_id'
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                    LIMIT 1
                );
                SET @sql := IF(@fk IS NULL, 'SELECT 1', CONCAT('ALTER TABLE employee_audit_log DROP FOREIGN KEY ', @fk));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            // Null any orphaned rows before re-adding FK
            DB::statement('UPDATE employee_audit_log e LEFT JOIN employees emp ON emp.id = e.employee_id SET e.employee_id = NULL WHERE emp.id IS NULL');

            DB::statement('ALTER TABLE employee_audit_log MODIFY employee_id VARCHAR(15) NULL');

            Schema::table('employee_audit_log', function (Blueprint $table) {
                $table->foreign('employee_id')
                    ->references('id')
                    ->on('employees')
                    ->nullOnDelete()
                    ->cascadeOnUpdate();
            });
        }

        // User activities: keep activity rows even if user is deleted
        if (Schema::hasTable('user_activities')) {
            // Drop FK if it exists
            DB::unprepared("
                SET @fk := (
                    SELECT CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'user_activities'
                      AND COLUMN_NAME = 'user_id'
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                    LIMIT 1
                );
                SET @sql := IF(@fk IS NULL, 'SELECT 1', CONCAT('ALTER TABLE user_activities DROP FOREIGN KEY ', @fk));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            // Null any orphaned rows before re-adding FK
            DB::statement('UPDATE user_activities ua LEFT JOIN users u ON u.id = ua.user_id SET ua.user_id = NULL WHERE u.id IS NULL');

            DB::statement('ALTER TABLE user_activities MODIFY user_id BIGINT UNSIGNED NULL');

            Schema::table('user_activities', function (Blueprint $table) {
                $table->foreign('user_id')
                    ->references('id')
                    ->on('users')
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

        // Employee audit log: restore NOT NULL + restrict delete
        if (Schema::hasTable('employee_audit_log')) {
            DB::unprepared("
                SET @fk := (
                    SELECT CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'employee_audit_log'
                      AND COLUMN_NAME = 'employee_id'
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                    LIMIT 1
                );
                SET @sql := IF(@fk IS NULL, 'SELECT 1', CONCAT('ALTER TABLE employee_audit_log DROP FOREIGN KEY ', @fk));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            DB::statement('ALTER TABLE employee_audit_log MODIFY employee_id VARCHAR(15) NOT NULL');

            Schema::table('employee_audit_log', function (Blueprint $table) {
                $table->foreign('employee_id')
                    ->references('id')
                    ->on('employees')
                    ->restrictOnDelete()
                    ->cascadeOnUpdate();
            });
        }

        // User activities: restore NOT NULL + cascade delete
        if (Schema::hasTable('user_activities')) {
            DB::unprepared("
                SET @fk := (
                    SELECT CONSTRAINT_NAME
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'user_activities'
                      AND COLUMN_NAME = 'user_id'
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                    LIMIT 1
                );
                SET @sql := IF(@fk IS NULL, 'SELECT 1', CONCAT('ALTER TABLE user_activities DROP FOREIGN KEY ', @fk));
                PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            DB::statement('ALTER TABLE user_activities MODIFY user_id BIGINT UNSIGNED NOT NULL');

            Schema::table('user_activities', function (Blueprint $table) {
                $table->foreign('user_id')
                    ->references('id')
                    ->on('users')
                    ->onDelete('cascade');
            });
        }
    }
};

