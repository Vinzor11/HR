<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the staff_grades table for administrative career progression
     * REQUIRED for administrative promotions and history tracking
     * Examples: Admin Aide, Administrative Officer, Senior Officer, etc.
     */
    public function up(): void
    {
        Schema::create('staff_grades', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100); // e.g., 'Administrative Officer I', 'Senior Staff'
            $table->string('code', 20)->unique()->nullable(); // Optional short code
            $table->unsignedTinyInteger('level')->default(1); // Numeric progression (1 = lowest, higher = more senior)
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0); // For ordering in UI
            $table->timestamps();
            $table->softDeletes();

            $table->index('level');
            $table->index('is_active');
            $table->index('sort_order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_grades');
    }
};
