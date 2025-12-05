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
        Schema::create('organizational_audit_log', function (Blueprint $table) {
            $table->unsignedInteger('record_id')->autoIncrement()->primary();
            $table->enum('unit_type', ['faculty', 'department', 'position']);
            $table->unsignedBigInteger('unit_id');
            $table->string('reference_number', 50)->nullable();
            $table->enum('action_type', ['CREATE', 'UPDATE', 'DELETE']);
            $table->string('field_changed', 100)->nullable();
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();
            $table->timestamp('action_date')->useCurrent();
            $table->string('performed_by', 150);

            // Indexes for performance
            $table->index(['unit_type', 'unit_id', 'action_date'], 'idx_unit_date');
            $table->index('action_type', 'idx_action_type');
            $table->index('reference_number', 'idx_reference_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organizational_audit_log');
    }
};
