<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the employee_assignment_history table for tracking assignment changes over time
     * This provides a complete audit trail for assignment modifications
     */
    public function up(): void
    {
        Schema::create('employee_designation_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('designation_id')->constrained('employee_designations')->cascadeOnDelete();
            $table->string('field_changed', 50); // e.g., 'unit_id', 'position_id', 'academic_rank_id', 'staff_grade_id', 'is_primary'
            $table->text('old_value')->nullable();
            $table->text('new_value')->nullable();
            $table->string('changed_by', 15)->nullable(); // Employee ID of the person who made the change
            $table->timestamp('changed_at');

            // Indexes
            $table->index('designation_id');
            $table->index('changed_at');
            $table->index(['designation_id', 'changed_at']);
            
            // Foreign key for changed_by
            $table->foreign('changed_by')->references('id')->on('employees')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_designation_history');
    }
};
