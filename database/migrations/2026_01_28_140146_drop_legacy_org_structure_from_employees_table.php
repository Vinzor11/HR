<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Drop legacy organizational structure columns from employees table.
     * These are replaced by the new designation system (employee_designations table).
     */
    public function up(): void
    {
        // Check and drop foreign keys if they exist
        $this->dropForeignKeyIfExists('employees', 'employees_department_id_foreign');
        $this->dropForeignKeyIfExists('employees', 'employees_position_id_foreign');
        $this->dropForeignKeyIfExists('employees', 'employees_faculty_id_foreign');

        // Drop columns if they exist
        Schema::table('employees', function (Blueprint $table) {
            $columns = ['department_id', 'position_id', 'faculty_id'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('employees', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            // Re-add columns (nullable since we're in transition)
            if (!Schema::hasColumn('employees', 'department_id')) {
                $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            }
            if (!Schema::hasColumn('employees', 'position_id')) {
                $table->foreignId('position_id')->nullable()->constrained('positions')->nullOnDelete();
            }
            if (!Schema::hasColumn('employees', 'faculty_id')) {
                $table->foreignId('faculty_id')->nullable()->constrained('faculties')->nullOnDelete();
            }
        });
    }

    /**
     * Helper to safely drop foreign keys.
     */
    private function dropForeignKeyIfExists(string $table, string $keyName): void
    {
        $result = DB::select("
            SELECT CONSTRAINT_NAME 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_NAME = ? 
            AND CONSTRAINT_TYPE = 'FOREIGN KEY' 
            AND CONSTRAINT_NAME = ?
            AND TABLE_SCHEMA = DATABASE()
        ", [$table, $keyName]);

        if (!empty($result)) {
            Schema::table($table, function (Blueprint $table) use ($keyName) {
                $table->dropForeign($keyName);
            });
        }
    }
};
