<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the unit_positions table to whitelist which positions can be assigned
     * under each unit type. This enforces business rules at the database level.
     */
    public function up(): void
    {
        Schema::create('unit_positions', function (Blueprint $table) {
            $table->id();
            $table->string('unit_type', 20); // 'college', 'program', 'office'
            $table->foreignId('position_id')->constrained('positions')->cascadeOnDelete();
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('unit_type');
            $table->index('position_id');
            $table->index(['unit_type', 'position_id']);
            
            // Unique constraint: one position per unit type
            $table->unique(['unit_type', 'position_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('unit_positions');
    }
};
