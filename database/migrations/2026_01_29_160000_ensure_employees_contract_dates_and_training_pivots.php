<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotent migration to fix "Column not found: end_date" and "Table training_allowed_sectors doesn't exist"
 * on production (e.g. Railway) when earlier migrations were skipped or failed.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->ensureEmployeesContractDates();
        $this->ensureTrainingAllowedSectorsTable();
        $this->ensureTrainingAllowedUnitsTable();
    }

    private function ensureEmployeesContractDates(): void
    {
        if (! Schema::hasTable('employees')) {
            return;
        }
        Schema::table('employees', function (Blueprint $table) {
            if (! Schema::hasColumn('employees', 'start_date')) {
                $table->date('start_date')->nullable();
            }
            if (! Schema::hasColumn('employees', 'end_date')) {
                $table->date('end_date')->nullable();
            }
        });
    }

    private function ensureTrainingAllowedSectorsTable(): void
    {
        if (Schema::hasTable('training_allowed_sectors')) {
            return;
        }
        if (! Schema::hasTable('trainings') || ! Schema::hasTable('sectors')) {
            return;
        }
        Schema::create('training_allowed_sectors', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('training_id');
            $table->foreignId('sector_id')->constrained('sectors')->cascadeOnDelete();
            $table->timestamps();

            $table->foreign('training_id')->references('training_id')->on('trainings')->cascadeOnDelete();
            $table->unique(['training_id', 'sector_id']);
        });
    }

    private function ensureTrainingAllowedUnitsTable(): void
    {
        if (Schema::hasTable('training_allowed_units')) {
            return;
        }
        if (! Schema::hasTable('trainings') || ! Schema::hasTable('units')) {
            return;
        }
        Schema::create('training_allowed_units', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('training_id');
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
            $table->timestamps();

            $table->foreign('training_id')->references('training_id')->on('trainings')->cascadeOnDelete();
            $table->unique(['training_id', 'unit_id']);
        });
    }

    public function down(): void
    {
        // Leave tables/columns in place; this migration is a one-way fix.
    }
};
