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
        // Only create the table if it doesn't exist
        if (Schema::hasTable('user_audit_log')) {
            return;
        }

        Schema::create('user_audit_log', function (Blueprint $table) {
            $table->id('record_id');
            $table->string('reference_number', 50)->nullable();
            $table->unsignedBigInteger('user_id')->nullable(); // Nullable to preserve history when user is deleted
            $table->enum('action_type', ['CREATE', 'UPDATE', 'DELETE']);
            $table->string('field_changed', 100)->nullable();
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();
            $table->json('snapshot')->nullable(); // Added in later migration
            $table->timestamp('action_date')->useCurrent();
            $table->string('performed_by', 150);

            // Foreign key constraint - nullable to preserve history
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            // Indexes for performance
            $table->index(['user_id', 'action_date'], 'idx_user_date');
            $table->index('action_type', 'idx_user_audit_action_type');
            $table->index('reference_number', 'idx_user_audit_reference_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_audit_log');
    }
};
