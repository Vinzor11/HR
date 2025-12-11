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
        if (Schema::hasTable('user_audit_log')) {
            Schema::table('user_audit_log', function (Blueprint $table) {
                $table->json('snapshot')->nullable()->after('new_value');
            });
        }

        if (Schema::hasTable('employee_audit_log')) {
            Schema::table('employee_audit_log', function (Blueprint $table) {
                $table->json('snapshot')->nullable()->after('new_value');
            });
        }

        if (Schema::hasTable('organizational_audit_log')) {
            Schema::table('organizational_audit_log', function (Blueprint $table) {
                $table->json('snapshot')->nullable()->after('new_value');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('user_audit_log')) {
            Schema::table('user_audit_log', function (Blueprint $table) {
                $table->dropColumn('snapshot');
            });
        }

        if (Schema::hasTable('employee_audit_log')) {
            Schema::table('employee_audit_log', function (Blueprint $table) {
                $table->dropColumn('snapshot');
            });
        }

        if (Schema::hasTable('organizational_audit_log')) {
            Schema::table('organizational_audit_log', function (Blueprint $table) {
                $table->dropColumn('snapshot');
            });
        }
    }
};

