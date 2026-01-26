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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable()->comment('Actor who performed the action');
            $table->string('action', 50)->comment('created, updated, deleted, viewed, approved, restored, etc.');
            $table->string('module', 50)->comment('employees, users, requests, payroll, settings, auth, etc.');
            $table->string('entity_type', 100)->comment('Employee, User, Request, Role, Permission, etc.');
            $table->string('entity_id', 50)->nullable()->comment('ID of the affected entity');
            $table->text('description')->comment('Human-readable summary of the action');
            $table->json('old_values')->nullable()->comment('Previous state (JSON)');
            $table->json('new_values')->nullable()->comment('New state (JSON)');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('reference_number', 50)->nullable()->comment('Optional reference number for tracking');
            $table->json('snapshot')->nullable()->comment('Full entity snapshot at time of action');
            $table->timestamp('created_at')->useCurrent()->comment('Immutable timestamp - logs are append-only');
            
            // Indexes for performance
            $table->index(['user_id', 'created_at'], 'idx_audit_user_date');
            $table->index(['module', 'created_at'], 'idx_audit_module_date');
            $table->index(['entity_type', 'entity_id'], 'idx_audit_entity');
            $table->index('action', 'idx_audit_action');
            $table->index('created_at', 'idx_audit_created_at');
            $table->index('reference_number', 'idx_audit_reference');
            
            // Foreign key to users (nullable to preserve history if user is deleted)
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
