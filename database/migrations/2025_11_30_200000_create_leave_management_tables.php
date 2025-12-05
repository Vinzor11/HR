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
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('leave_requests');
        Schema::dropIfExists('leave_accruals');
        Schema::dropIfExists('leave_balances');
        Schema::dropIfExists('leave_types');
        Schema::dropIfExists('holidays');
        Schema::enableForeignKeyConstraints();

        // Leave Types Table
        Schema::create('leave_types', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Vacation, Sick, Personal, Maternity, etc.
            $table->string('code')->unique(); // VAC, SICK, PER, MAT, etc.
            $table->text('description')->nullable();
            $table->string('color', 7)->default('#6366f1'); // For calendar display
            $table->boolean('requires_approval')->default(true);
            $table->boolean('requires_medical_certificate')->default(false);
            $table->integer('max_days_per_request')->nullable(); // Maximum days per single request
            $table->integer('max_days_per_year')->nullable(); // Maximum days per year
            $table->integer('min_notice_days')->default(0); // Minimum notice required
            $table->boolean('can_carry_over')->default(false); // Can carry over to next year
            $table->integer('max_carry_over_days')->nullable(); // Maximum carry over days
            $table->boolean('is_paid')->default(true); // Is this a paid leave
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        // Leave Balances Table
        Schema::create('leave_balances', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->foreignId('leave_type_id')->constrained()->cascadeOnDelete();
            $table->decimal('entitled', 8, 2)->default(0); // Total entitlement for the year
            $table->decimal('accrued', 8, 2)->default(0); // Accrued this period
            $table->decimal('used', 8, 2)->default(0); // Used/approved leaves
            $table->decimal('pending', 8, 2)->default(0); // Pending approval
            $table->decimal('balance', 8, 2)->default(0); // Available = entitled - used - pending
            $table->decimal('carried_over', 8, 2)->default(0); // From previous year
            $table->year('year'); // For annual tracking
            $table->timestamps();

            $table->unique(['employee_id', 'leave_type_id', 'year']);
            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->index(['employee_id', 'year']);
        });

        // Leave Requests Table (linked to request_submissions)
        Schema::create('leave_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_submission_id')->unique()->constrained('request_submissions')->cascadeOnDelete();
            $table->string('employee_id', 15);
            $table->foreignId('leave_type_id')->constrained()->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('days', 5, 2); // Calculated days (excluding weekends/holidays)
            $table->text('reason')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])->default('pending');
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->index(['employee_id', 'status']);
            $table->index(['start_date', 'end_date']);
            $table->index('leave_type_id');
        });

        // Leave Accruals Table
        Schema::create('leave_accruals', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->foreignId('leave_type_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 8, 2); // Days accrued
            $table->date('accrual_date');
            $table->string('accrual_type', 50); // monthly, quarterly, annual, manual, adjustment
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->index(['employee_id', 'accrual_date']);
            $table->index('leave_type_id');
        });

        // Holidays Table (for calculating working days)
        Schema::create('holidays', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->date('date');
            $table->enum('type', ['regular', 'special', 'local'])->default('regular');
            $table->boolean('is_recurring')->default(false); // Repeats every year
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['date', 'type']);
            $table->index('date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('holidays');
        Schema::dropIfExists('leave_accruals');
        Schema::dropIfExists('leave_requests');
        Schema::dropIfExists('leave_balances');
        Schema::dropIfExists('leave_types');
    }
};



