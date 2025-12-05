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
        // Get current column information
        $columnInfo = DB::select("SHOW COLUMNS FROM `employee_educational_backgrounds` WHERE Field = 'level'");
        
        if (!empty($columnInfo)) {
            $columnType = $columnInfo[0]->Type ?? '';
            
            // Check if it's ENUM or VARCHAR with insufficient size
            if (strpos(strtolower($columnType), 'enum') !== false) {
                // It's still ENUM - need to convert
                // Use a more aggressive approach: drop and recreate
                DB::statement("
                    ALTER TABLE `employee_educational_backgrounds` 
                    DROP COLUMN `level`,
                    ADD COLUMN `level` VARCHAR(255) NOT NULL AFTER `employee_id`
                ");
            } else {
                // It's VARCHAR but might be too small - increase to 255
                // Use MODIFY with explicit size increase
                try {
                    DB::statement("
                        ALTER TABLE `employee_educational_backgrounds` 
                        MODIFY COLUMN `level` VARCHAR(255) NOT NULL
                    ");
                } catch (\Exception $e) {
                    // If MODIFY fails, try dropping and recreating
                    DB::statement("
                        ALTER TABLE `employee_educational_backgrounds` 
                        DROP COLUMN `level`,
                        ADD COLUMN `level` VARCHAR(255) NOT NULL AFTER `employee_id`
                    ");
                }
            }
        } else {
            // Column doesn't exist - create it
            DB::statement("
                ALTER TABLE `employee_educational_backgrounds` 
                ADD COLUMN `level` VARCHAR(255) NOT NULL AFTER `employee_id`
            ");
        }
        
        // Also ensure other columns are large enough - use 255 for safety
        try {
            DB::statement("
                ALTER TABLE `employee_educational_backgrounds` 
                MODIFY COLUMN `school_name` VARCHAR(255) NOT NULL
            ");
        } catch (\Exception $e) {
            // Ignore if it fails
        }
        
        try {
            DB::statement("
                ALTER TABLE `employee_educational_backgrounds` 
                MODIFY COLUMN `degree_course` VARCHAR(255) NULL
            ");
        } catch (\Exception $e) {
            // Ignore if it fails
        }
        
        try {
            DB::statement("
                ALTER TABLE `employee_educational_backgrounds` 
                MODIFY COLUMN `highest_level_units` VARCHAR(255) NULL
            ");
        } catch (\Exception $e) {
            // Ignore if it fails
        }
        
        try {
            DB::statement("
                ALTER TABLE `employee_educational_backgrounds` 
                MODIFY COLUMN `honors_received` VARCHAR(255) NULL
            ");
        } catch (\Exception $e) {
            // Ignore if it fails
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to smaller sizes (but not ENUM to avoid data loss)
        DB::statement("
            ALTER TABLE `employee_educational_backgrounds` 
            MODIFY COLUMN `level` VARCHAR(100) NOT NULL
        ");
    }
};
