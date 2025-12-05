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
        // Force change ENUM to VARCHAR using a more direct approach
        // First, check if column exists and what type it is
        $columnInfo = DB::select("SHOW COLUMNS FROM `employee_educational_backgrounds` WHERE Field = 'level'");
        
        if (!empty($columnInfo)) {
            $columnType = $columnInfo[0]->Type ?? '';
            
            // If it's still an ENUM, we need to drop and recreate it
            if (strpos(strtolower($columnType), 'enum') !== false) {
                // Step 1: Create temporary column with VARCHAR type
                DB::statement("
                    ALTER TABLE `employee_educational_backgrounds` 
                    ADD COLUMN `level_new` VARCHAR(100) NOT NULL DEFAULT '' AFTER `employee_id`
                ");
                
                // Step 2: Copy data (convert ENUM values to strings)
                DB::statement("
                    UPDATE `employee_educational_backgrounds` 
                    SET `level_new` = CAST(`level` AS CHAR(100))
                ");
                
                // Step 3: Drop the old ENUM column
                DB::statement("
                    ALTER TABLE `employee_educational_backgrounds` 
                    DROP COLUMN `level`
                ");
                
                // Step 4: Rename the new column
                DB::statement("
                    ALTER TABLE `employee_educational_backgrounds` 
                    CHANGE COLUMN `level_new` `level` VARCHAR(100) NOT NULL
                ");
            } else {
                // If it's already VARCHAR, just ensure it's large enough
                DB::statement("
                    ALTER TABLE `employee_educational_backgrounds` 
                    MODIFY COLUMN `level` VARCHAR(100) NOT NULL
                ");
            }
        }
        
        // Ensure other columns are large enough
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            MODIFY COLUMN `school_name` VARCHAR(200) NOT NULL
        ");
        
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            MODIFY COLUMN `degree_course` VARCHAR(200) NULL
        ");
        
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            MODIFY COLUMN `highest_level_units` VARCHAR(100) NULL
        ");
        
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
        // Revert back to ENUM (this might lose data if values don't match)
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            MODIFY COLUMN `level` ENUM('Elementary', 'Secondary', 'Vocational', 'College', 'Graduate Studies') NOT NULL
        ");
    }
};
