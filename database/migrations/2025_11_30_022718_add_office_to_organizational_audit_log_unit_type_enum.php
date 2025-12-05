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
        // Modify the enum column to include 'office'
        DB::statement("ALTER TABLE organizational_audit_log MODIFY COLUMN unit_type ENUM('faculty', 'department', 'position', 'office') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'office' from the enum (only if no records with 'office' exist)
        // Note: This will fail if there are records with 'office' as unit_type
        DB::statement("ALTER TABLE organizational_audit_log MODIFY COLUMN unit_type ENUM('faculty', 'department', 'position') NOT NULL");
    }
};
