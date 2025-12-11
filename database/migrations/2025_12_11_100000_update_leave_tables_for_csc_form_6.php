<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration to update leave tables for CS Form No. 6 compliance
 * Based on Civil Service Commission (CSC) Omnibus Rules on Leave
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update leave_types table with CSC-specific fields
        Schema::table('leave_types', function (Blueprint $table) {
            // Gender restriction for certain leave types (maternity, paternity)
            $table->enum('gender_restriction', ['male', 'female', 'all'])->default('all')->after('is_active');
            
            // Whether this leave uses VL/SL credits (like Forced Leave uses VL credits)
            $table->string('uses_credits_from')->nullable()->after('gender_restriction');
            
            // Whether leave can be monetized
            $table->boolean('is_monetizable')->default(false)->after('uses_credits_from');
            
            // Whether this is a special leave (not counted against VL/SL)
            $table->boolean('is_special_leave')->default(false)->after('is_monetizable');
            
            // Required documentation type
            $table->string('required_document')->nullable()->after('is_special_leave');
            
            // Legal basis (RA number or CSC MC)
            $table->string('legal_basis')->nullable()->after('required_document');
            
            // Whether commutation is applicable
            $table->boolean('commutation_applicable')->default(false)->after('legal_basis');
        });

        // Update leave_requests table with CS Form No. 6 fields
        Schema::table('leave_requests', function (Blueprint $table) {
            // Details of Leave - Location
            $table->enum('location', ['within_philippines', 'abroad'])->nullable()->after('reason');
            $table->string('location_details')->nullable()->after('location');
            
            // Details of Leave - Sick Leave specifics
            $table->enum('sick_leave_type', ['in_hospital', 'out_patient'])->nullable()->after('location_details');
            $table->string('illness_description')->nullable()->after('sick_leave_type');
            
            // Details of Leave - Special Leave for Women
            $table->string('women_special_illness')->nullable()->after('illness_description');
            
            // Details of Leave - Study Leave
            $table->enum('study_leave_type', ['completion_masters', 'bar_board_exam', 'other'])->nullable()->after('women_special_illness');
            $table->string('study_leave_details')->nullable()->after('study_leave_type');
            
            // Details of Leave - Other purposes
            $table->enum('other_leave_type', ['monetization', 'terminal_leave', 'other'])->nullable()->after('study_leave_details');
            $table->string('other_leave_details')->nullable()->after('other_leave_type');
            
            // Commutation
            $table->boolean('commutation_requested')->default(false)->after('other_leave_details');
            
            // Leave Credits as of Filing
            $table->decimal('vacation_leave_balance', 8, 3)->nullable()->after('commutation_requested');
            $table->decimal('sick_leave_balance', 8, 3)->nullable()->after('vacation_leave_balance');
            
            // Recommendation
            $table->enum('recommendation', ['approval', 'disapproval'])->nullable()->after('sick_leave_balance');
            $table->text('recommendation_reason')->nullable()->after('recommendation');
            $table->foreignId('recommended_by')->nullable()->after('recommendation_reason')->constrained('users')->nullOnDelete();
            $table->timestamp('recommended_at')->nullable()->after('recommended_by');
            
            // For disapproval - days with pay and without pay
            $table->decimal('days_with_pay', 5, 2)->nullable()->after('recommended_at');
            $table->decimal('days_without_pay', 5, 2)->nullable()->after('days_with_pay');
        });

        // Create leave_credits_history table for tracking credits over time
        Schema::create('leave_credits_history', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->foreignId('leave_type_id')->constrained()->cascadeOnDelete();
            $table->decimal('earned', 8, 3)->default(0);
            $table->decimal('used', 8, 3)->default(0);
            $table->decimal('balance', 8, 3)->default(0);
            $table->decimal('abs_undertime_deduction', 8, 3)->default(0); // Absences/undertime deduction
            $table->string('period')->nullable(); // e.g., "January 2025" or "2025"
            $table->date('as_of_date');
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->index(['employee_id', 'leave_type_id', 'as_of_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_credits_history');

        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropForeign(['recommended_by']);
            $table->dropColumn([
                'location',
                'location_details',
                'sick_leave_type',
                'illness_description',
                'women_special_illness',
                'study_leave_type',
                'study_leave_details',
                'other_leave_type',
                'other_leave_details',
                'commutation_requested',
                'vacation_leave_balance',
                'sick_leave_balance',
                'recommendation',
                'recommendation_reason',
                'recommended_by',
                'recommended_at',
                'days_with_pay',
                'days_without_pay',
            ]);
        });

        Schema::table('leave_types', function (Blueprint $table) {
            $table->dropColumn([
                'gender_restriction',
                'uses_credits_from',
                'is_monetizable',
                'is_special_leave',
                'required_document',
                'legal_basis',
                'commutation_applicable',
            ]);
        });
    }
};

