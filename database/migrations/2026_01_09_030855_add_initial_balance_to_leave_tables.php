<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration to support initial balance setup for long-time employees
 * and special leave grants (maternity, paternity, etc.)
 * 
 * This allows HR to:
 * 1. Set opening balances when migrating from old system
 * 2. Grant special leave credits (maternity, paternity, VAWC, etc.)
 * 3. Track all adjustments with proper audit trail
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add initial balance fields to leave_balances
        Schema::table('leave_balances', function (Blueprint $table) {
            // Initial/opening balance from previous system or manual setup
            $table->decimal('initial_balance', 8, 2)->default(0)->after('carried_over');
            // Date when balance was set (for audit purposes)
            $table->date('balance_as_of_date')->nullable()->after('initial_balance');
            // Notes about the initial balance setup
            $table->text('migration_notes')->nullable()->after('balance_as_of_date');
            // Flag to indicate if this balance was manually set vs calculated
            $table->boolean('is_manually_set')->default(false)->after('migration_notes');
        });

        // Enhance leave_accruals for better tracking
        Schema::table('leave_accruals', function (Blueprint $table) {
            // Supporting document reference (for special leaves)
            $table->string('supporting_document')->nullable()->after('notes');
            // Reference number for audit trail
            $table->string('reference_number')->nullable()->after('supporting_document');
            // Effective date (can be different from accrual_date for backdated entries)
            $table->date('effective_date')->nullable()->after('reference_number');
            
            // Index for better querying
            $table->index('accrual_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_balances', function (Blueprint $table) {
            $table->dropColumn([
                'initial_balance',
                'balance_as_of_date',
                'migration_notes',
                'is_manually_set',
            ]);
        });

        Schema::table('leave_accruals', function (Blueprint $table) {
            $table->dropIndex(['accrual_type']);
            $table->dropColumn([
                'supporting_document',
                'reference_number',
                'effective_date',
            ]);
        });
    }
};
