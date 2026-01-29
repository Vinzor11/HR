<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the approval_comments table for full comment thread history.
     * Allows back-and-forth communication between requester and approvers.
     */
    public function up(): void
    {
        Schema::create('approval_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained('request_submissions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('approval_action_id')->nullable()
                ->constrained('request_approval_actions')->nullOnDelete();
            $table->text('content');
            $table->string('type')->default('comment'); // comment, approval_note, rejection_note, system
            $table->boolean('is_internal')->default(false); // Internal notes not visible to requester
            $table->json('attachments')->nullable();
            $table->timestamps();
            
            // Index for fetching comments by submission
            $table->index(['submission_id', 'created_at'], 'idx_comments_submission');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_comments');
    }
};
