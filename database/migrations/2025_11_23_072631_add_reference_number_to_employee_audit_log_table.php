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
        Schema::table('employee_audit_log', function (Blueprint $table) {
            $table->string('reference_number', 50)->nullable()->after('record_id');
            $table->index('reference_number', 'idx_reference_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_audit_log', function (Blueprint $table) {
            $table->dropIndex('idx_reference_number');
            $table->dropColumn('reference_number');
        });
    }
};
