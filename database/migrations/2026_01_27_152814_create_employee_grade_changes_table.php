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
     * Creates the employee_grade_changes table for tracking all rank/grade changes
     * This is the source of truth for career progression history
     */
    public function up(): void
    {
        Schema::create('employee_grade_changes', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->foreignId('designation_id')->constrained('employee_designations')->cascadeOnDelete();
            $table->foreignId('from_grade_id')->nullable(); // Can be null for initial assignment
            $table->string('from_grade_type', 20)->nullable(); // 'academic_rank' or 'staff_grade'
            $table->foreignId('to_grade_id'); // Required - the new grade/rank
            $table->string('to_grade_type', 20); // 'academic_rank' or 'staff_grade'
            $table->enum('change_type', ['promotion', 'correction'])->default('promotion');
            $table->date('effective_date');
            $table->text('reason')->nullable(); // Required for correction, optional for promotion
            $table->string('performed_by_employee_id', 15)->nullable(); // Employee ID of the person who made the change
            $table->timestamps();

            // Indexes
            $table->index('employee_id');
            $table->index('designation_id');
            $table->index('effective_date');
            $table->index(['employee_id', 'effective_date']);
            $table->index('change_type');
            
            // Foreign keys
            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->foreign('performed_by_employee_id')->references('id')->on('employees')->nullOnDelete();
            
            // Note: from_grade_id and to_grade_id are polymorphic - they can reference either
            // academic_ranks.id or staff_grades.id based on from_grade_type/to_grade_type
            // We use application-level validation rather than DB foreign keys for this
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_grade_changes');
    }
};
