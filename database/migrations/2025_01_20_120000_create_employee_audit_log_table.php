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
        Schema::create('employee_audit_log', function (Blueprint $table) {
            $table->id('record_id');
            $table->string('employee_id', 15);
            $table->enum('action_type', ['CREATE', 'UPDATE', 'DELETE']);
            $table->string('field_changed', 100)->nullable();
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();
            $table->timestamp('action_date')->useCurrent();
            $table->string('performed_by', 150);

            // Foreign key constraint
            $table->foreign('employee_id')
                  ->references('id')
                  ->on('employees')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');

            // Indexes for performance
            $table->index(['employee_id', 'action_date'], 'idx_employee_date');
            $table->index('action_type', 'idx_action_type');
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

