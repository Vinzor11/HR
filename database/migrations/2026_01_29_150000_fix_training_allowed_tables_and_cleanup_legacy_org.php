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
     * 1. Create training_allowed_sectors and training_allowed_units if missing (fixes "Table doesn't exist" on Railway).
     * 2. Drop legacy org columns from employees and positions if still present.
     * 3. Drop legacy tables: training_allowed_faculties, training_allowed_departments,
     *    request_type_allowed_*, departments, faculties.
     */
    public function up(): void
    {
        $this->createTrainingAllowedTablesIfMissing();
        $this->dropLegacyColumnsFromEmployeesAndPositions();
        $this->dropLegacyTables();
    }

    /**
     * Create training_allowed_sectors and training_allowed_units if they don't exist.
     */
    private function createTrainingAllowedTablesIfMissing(): void
    {
        if (!Schema::hasTable('training_allowed_sectors')) {
            Schema::create('training_allowed_sectors', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('training_id');
                $table->foreignId('sector_id')->constrained('sectors')->cascadeOnDelete();
                $table->timestamps();

                $table->foreign('training_id')->references('training_id')->on('trainings')->cascadeOnDelete();
                $table->unique(['training_id', 'sector_id']);
            });
        }

        if (!Schema::hasTable('training_allowed_units')) {
            Schema::create('training_allowed_units', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('training_id');
                $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
                $table->timestamps();

                $table->foreign('training_id')->references('training_id')->on('trainings')->cascadeOnDelete();
                $table->unique(['training_id', 'unit_id']);
            });
        }
    }

    /**
     * Drop legacy org structure columns from employees and positions (idempotent).
     */
    private function dropLegacyColumnsFromEmployeesAndPositions(): void
    {
        foreach (['employees_department_id_foreign', 'employees_position_id_foreign', 'employees_faculty_id_foreign'] as $fk) {
            $this->dropForeignKeyIfExists('employees', $fk);
        }
        if (Schema::hasTable('employees')) {
            foreach (['department_id', 'position_id', 'faculty_id'] as $column) {
                if (Schema::hasColumn('employees', $column)) {
                    Schema::table('employees', fn (Blueprint $t) => $t->dropColumn($column));
                }
            }
        }

        foreach (['positions_department_id_foreign', 'positions_faculty_id_foreign'] as $fk) {
            $this->dropForeignKeyIfExists('positions', $fk);
        }
        if (Schema::hasTable('positions')) {
            foreach (['department_id', 'faculty_id'] as $column) {
                if (Schema::hasColumn('positions', $column)) {
                    Schema::table('positions', fn (Blueprint $t) => $t->dropColumn($column));
                }
            }
        }
    }

    /**
     * Drop legacy tables (pivots and faculties/departments). Order matters: drop tables that reference departments/faculties first.
     */
    private function dropLegacyTables(): void
    {
        Schema::dropIfExists('training_allowed_faculties');
        Schema::dropIfExists('training_allowed_departments');
        Schema::dropIfExists('request_type_allowed_departments');
        Schema::dropIfExists('request_type_allowed_faculties');
        Schema::dropIfExists('departments');
        Schema::dropIfExists('faculties');
    }

    private function dropForeignKeyIfExists(string $table, string $keyName): void
    {
        if (!Schema::hasTable($table)) {
            return;
        }

        $result = DB::select("
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            AND CONSTRAINT_NAME = ?
        ", [$table, $keyName]);

        if (!empty($result)) {
            Schema::table($table, function (Blueprint $t) use ($keyName) {
                $t->dropForeign($keyName);
            });
        }
    }

    public function down(): void
    {
        // We do not re-create legacy tables/columns in down(); this migration is a one-way cleanup.
    }
};
