<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the employee_rank_promotions table for tracking academic rank promotions
     * This is REQUIRED for auditability of academic promotions (Faculty career progression)
     */
    public function up(): void
    {
        Schema::create('employee_rank_promotions', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->foreignId('from_academic_rank_id')->nullable()->constrained('academic_ranks')->nullOnDelete();
            $table->foreignId('to_academic_rank_id')->constrained('academic_ranks')->cascadeOnDelete();
            $table->date('effective_date');
            $table->string('promoted_by', 15)->nullable(); // Employee ID of the person who approved
            $table->text('remarks')->nullable();
            $table->string('document_ref', 255)->nullable(); // Reference to promotion document
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('employee_id');
            $table->index('effective_date');
            $table->index(['employee_id', 'effective_date']);
            
            // Foreign key for employee
            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_rank_promotions');
    }
};
