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
        Schema::create('request_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('has_fulfillment')->default(false);
            $table->json('approval_steps')->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('request_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_type_id')->constrained()->cascadeOnDelete();
            $table->string('field_key');
            $table->string('label');
            $table->string('field_type', 50);
            $table->boolean('is_required')->default(false);
            $table->text('description')->nullable();
            $table->json('options')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['request_type_id', 'field_key']);
        });

        Schema::create('request_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_type_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('reference_code')->unique();
            $table->enum('status', ['pending', 'approved', 'fulfillment', 'completed', 'rejected'])->default('pending');
            $table->unsignedInteger('current_step_index')->nullable();
            $table->json('approval_state')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('fulfilled_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('request_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained('request_submissions')->cascadeOnDelete();
            $table->foreignId('field_id')->constrained('request_fields')->cascadeOnDelete();
            $table->longText('value')->nullable();
            $table->json('value_json')->nullable();
            $table->timestamps();
        });

        Schema::create('request_approval_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained('request_submissions')->cascadeOnDelete();
            $table->unsignedInteger('step_index');
            $table->foreignId('approver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approver_role_id')->nullable()->constrained('roles')->nullOnDelete();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamp('acted_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('request_fulfillments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->unique()->constrained('request_submissions')->cascadeOnDelete();
            $table->foreignId('fulfilled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('file_path')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('request_fulfillments');
        Schema::dropIfExists('request_approval_actions');
        Schema::dropIfExists('request_answers');
        Schema::dropIfExists('request_submissions');
        Schema::dropIfExists('request_fields');
        Schema::dropIfExists('request_types');
    }
};
