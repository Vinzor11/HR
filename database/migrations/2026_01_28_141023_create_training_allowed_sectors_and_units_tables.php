<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Create pivot tables for training restrictions using new org structure.
     */
    public function up(): void
    {
        // Training allowed sectors
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

        // Training allowed units
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
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_allowed_units');
        Schema::dropIfExists('training_allowed_sectors');
    }
};
