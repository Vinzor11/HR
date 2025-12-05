<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Get the actual foreign key constraint name
        $constraints = DB::select("
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'employees' 
            AND COLUMN_NAME = 'department_id' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
            LIMIT 1
        ");
        
        // Drop the foreign key constraint if it exists
        if (!empty($constraints)) {
            $constraintName = $constraints[0]->CONSTRAINT_NAME;
            try {
                DB::statement("ALTER TABLE `employees` DROP FOREIGN KEY `{$constraintName}`");
            } catch (\Exception $e) {
                // Foreign key might not exist, continue anyway
            }
        }
        
        // Clean up invalid department_id values (set to NULL if department doesn't exist)
        DB::statement("
            UPDATE employees e
            LEFT JOIN departments d ON e.department_id = d.id
            SET e.department_id = NULL
            WHERE e.department_id IS NOT NULL AND d.id IS NULL
        ");
        
        // Change the column to nullable using raw SQL (more reliable for column modifications)
        DB::statement('ALTER TABLE `employees` MODIFY COLUMN `department_id` BIGINT UNSIGNED NULL');
        
        // Re-add the foreign key constraint (works with nullable values)
        Schema::table('employees', function (Blueprint $table) {
            $table->foreign('department_id')
                ->references('id')
                ->on('departments')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        // Drop the foreign key constraint
        DB::statement('ALTER TABLE `employees` DROP FOREIGN KEY `employees_department_id_foreign`');
        
        // Make the column NOT nullable again
        // Note: This will fail if there are any NULL values in the column
        DB::statement('ALTER TABLE `employees` MODIFY COLUMN `department_id` BIGINT UNSIGNED NOT NULL');
        
        // Re-add the foreign key constraint
        DB::statement('ALTER TABLE `employees` ADD CONSTRAINT `employees_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE');
    }
};
