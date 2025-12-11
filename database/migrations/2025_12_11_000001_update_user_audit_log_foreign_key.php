<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Make user_id nullable and switch FK to ON DELETE SET NULL
        Schema::table('user_audit_log', function (Blueprint $table) {
            // Drop existing constraint to change behaviour
            $table->dropForeign(['user_id']);
        });

        // Alter column to allow nulls (avoid doctrine/dbal dependency)
        DB::statement('ALTER TABLE user_audit_log MODIFY user_id BIGINT UNSIGNED NULL');

        Schema::table('user_audit_log', function (Blueprint $table) {
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_audit_log', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        DB::statement('ALTER TABLE user_audit_log MODIFY user_id BIGINT UNSIGNED NOT NULL');

        Schema::table('user_audit_log', function (Blueprint $table) {
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });
    }
};

