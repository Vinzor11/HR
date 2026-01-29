<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the employee_assignments table linking employees to units with positions
     * Supports multiple assignments per employee with optional academic rank or staff grade
     */
    public function up(): void
    {
        Schema::create('employee_designations', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('position_id')->constrained('positions')->cascadeOnDelete();
            $table->foreignId('academic_rank_id')->nullable()->constrained('academic_ranks')->nullOnDelete();
            $table->foreignId('staff_grade_id')->nullable()->constrained('staff_grades')->nullOnDelete();
            $table->boolean('is_primary')->default(false); // For display/UI purposes
            $table->date('start_date');
            $table->date('end_date')->nullable(); // NULL = currently active
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('employee_id');
            $table->index('unit_id');
            $table->index('position_id');
            $table->index('is_primary');
            $table->index(['employee_id', 'is_primary']);
            
            // Foreign key for employee
            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_designations');
    }
};
