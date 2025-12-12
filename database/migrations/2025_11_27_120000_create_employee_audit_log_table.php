<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('employee_audit_log')) {
            return;
        }

        Schema::create('employee_audit_log', function (Blueprint $table) {
            $table->id('record_id');
            $table->string('reference_number', 50)->nullable();
            $table->string('employee_id', 15);
            $table->enum('action_type', ['CREATE', 'UPDATE', 'DELETE']);
            $table->string('field_changed', 100)->nullable();
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();
            $table->timestamp('action_date')->useCurrent();
            $table->string('performed_by', 150);

            // Foreign key constraint
            $table
                ->foreign('employee_id')
                ->references('id')
                ->on('employees')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // Indexes for performance
            $table->index(['employee_id', 'action_date'], 'idx_employee_date');
            $table->index('action_type', 'idx_employee_audit_action_type_v1');
            $table->index('reference_number', 'idx_employee_audit_reference_number_v1');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_audit_log');
    }
};

