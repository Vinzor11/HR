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
        // Drop and recreate the level column as VARCHAR to accommodate any educational level
        // Also increase sizes for other columns that might be too small
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            DROP COLUMN `level`,
            ADD COLUMN `level` VARCHAR(100) NOT NULL AFTER `employee_id`
        ");
        
        // Increase school_name size to accommodate longer school names
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            MODIFY COLUMN `school_name` VARCHAR(200) NOT NULL
        ");
        
        // Increase degree_course size
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            MODIFY COLUMN `degree_course` VARCHAR(200) NULL
        ");
        
        // Increase highest_level_units size
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            MODIFY COLUMN `highest_level_units` VARCHAR(100) NULL
        ");
        
        // Increase honors_received size
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            MODIFY COLUMN `honors_received` VARCHAR(200) NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to original structure
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            DROP COLUMN `level`,
            ADD COLUMN `level` ENUM('Elementary', 'Secondary', 'Vocational', 'College', 'Graduate Studies') NOT NULL AFTER `employee_id`
        ");
        
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            MODIFY COLUMN `school_name` VARCHAR(100) NOT NULL
        ");
        
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            MODIFY COLUMN `degree_course` VARCHAR(100) NULL
        ");
        
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            MODIFY COLUMN `highest_level_units` VARCHAR(30) NULL
        ");
        
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            MODIFY COLUMN `honors_received` VARCHAR(100) NULL
        ");
    }
};
