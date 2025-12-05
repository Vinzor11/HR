<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Use raw SQL to change ENUM to VARCHAR since ->change() doesn't work well with ENUM
        DB::statement("ALTER TABLE `employee_educational_backgrounds` MODIFY COLUMN `level` VARCHAR(100) NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Convert back to enum (but this might lose data if values don't match)
        DB::statement("ALTER TABLE `employee_educational_backgrounds` MODIFY COLUMN `level` ENUM('Elementary', 'Secondary', 'Vocational', 'College', 'Graduate Studies') NOT NULL");
    }
};
