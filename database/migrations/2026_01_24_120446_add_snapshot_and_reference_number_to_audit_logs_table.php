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
        Schema::table('audit_logs', function (Blueprint $table) {
            // Add reference_number column if it doesn't exist
            if (!Schema::hasColumn('audit_logs', 'reference_number')) {
                $table->string('reference_number', 50)->nullable()->after('user_agent')
                    ->comment('Optional reference number for tracking');
                $table->index('reference_number', 'idx_audit_reference');
            }
            
            // Add snapshot column if it doesn't exist
            if (!Schema::hasColumn('audit_logs', 'snapshot')) {
                $table->json('snapshot')->nullable()->after('new_values')
                    ->comment('Full entity snapshot at time of action');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            if (Schema::hasColumn('audit_logs', 'reference_number')) {
                $table->dropIndex('idx_audit_reference');
                $table->dropColumn('reference_number');
            }
            
            if (Schema::hasColumn('audit_logs', 'snapshot')) {
                $table->dropColumn('snapshot');
            }
        });
    }
};
