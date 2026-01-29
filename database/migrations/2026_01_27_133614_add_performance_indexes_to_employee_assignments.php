<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds performance indexes for common query patterns in employee_designations
     */
    public function up(): void
    {
        Schema::table('employee_designations', function (Blueprint $table) {
            // Composite index for finding primary assignment efficiently
            $table->index(['employee_id', 'is_primary', 'deleted_at'], 'idx_employee_primary');
            
            // Composite index for approval routing queries
            $table->index(['unit_id', 'position_id', 'is_primary'], 'idx_unit_position_primary');
            
            // Index for active assignments lookup
            $table->index(['employee_id', 'end_date'], 'idx_employee_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_designations', function (Blueprint $table) {
            $table->dropIndex('idx_employee_primary');
            $table->dropIndex('idx_unit_position_primary');
            $table->dropIndex('idx_employee_active');
        });
    }
};
