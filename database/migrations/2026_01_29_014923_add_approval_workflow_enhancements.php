<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration adds:
     * 1. Approval mode (any/all/majority) to request_types approval_steps
     * 2. Due date and SLA tracking to request_approval_actions
     * 3. Withdrawn status support for request_submissions
     * 4. Escalation tracking fields
     */
    public function up(): void
    {
        // Add due_at and escalation fields to request_approval_actions
        Schema::table('request_approval_actions', function (Blueprint $table) {
            $table->timestamp('due_at')->nullable()->after('acted_at');
            $table->timestamp('reminded_at')->nullable()->after('due_at');
            $table->integer('reminder_count')->default(0)->after('reminded_at');
            $table->boolean('is_escalated')->default(false)->after('reminder_count');
            $table->timestamp('escalated_at')->nullable()->after('is_escalated');
            $table->foreignId('escalated_from_user_id')->nullable()->after('escalated_at')
                ->constrained('users')->nullOnDelete();
            $table->foreignId('delegated_from_user_id')->nullable()->after('escalated_from_user_id')
                ->constrained('users')->nullOnDelete();
            
            // Index for finding overdue approvals
            $table->index(['status', 'due_at'], 'idx_approval_actions_status_due');
        });

        // Add withdrawn_at to request_submissions for recall feature
        Schema::table('request_submissions', function (Blueprint $table) {
            $table->timestamp('withdrawn_at')->nullable()->after('fulfilled_at');
            $table->text('withdrawal_reason')->nullable()->after('withdrawn_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('request_approval_actions', function (Blueprint $table) {
            $table->dropIndex('idx_approval_actions_status_due');
            $table->dropForeign(['escalated_from_user_id']);
            $table->dropForeign(['delegated_from_user_id']);
            $table->dropColumn([
                'due_at',
                'reminded_at',
                'reminder_count',
                'is_escalated',
                'escalated_at',
                'escalated_from_user_id',
                'delegated_from_user_id',
            ]);
        });

        Schema::table('request_submissions', function (Blueprint $table) {
            $table->dropColumn(['withdrawn_at', 'withdrawal_reason']);
        });
    }
};
