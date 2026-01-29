<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the units table to store Colleges, Programs, and Offices
     * Hierarchy: Programs → College (via parent_unit_id)
     * Offices are usually standalone but can have parent for future flexibility
     */
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sector_id')->constrained('sectors')->cascadeOnDelete();
            $table->string('unit_type', 20); // 'college', 'program', 'office'
            $table->string('name', 150);
            $table->string('code', 50)->nullable()->unique(); // Optional code (e.g., 'COE', 'BSCE')
            $table->foreignId('parent_unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            // Add check constraint for unit_type (PostgreSQL-friendly)
            // Note: MySQL will ignore this, but it's safe to include
            $table->index(['unit_type', 'sector_id']);
            $table->index('parent_unit_id');
            $table->index('is_active');
        });

        // Add check constraint for unit_type values
        // This works in PostgreSQL; MySQL will ignore it but won't error
        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE units ADD CONSTRAINT units_unit_type_check CHECK (unit_type IN (\'college\', \'program\', \'office\'))');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
