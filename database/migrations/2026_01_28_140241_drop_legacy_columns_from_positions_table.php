<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Drop legacy organizational structure columns from positions table.
     * Positions now use sector_id instead of department_id/faculty_id.
     */
    public function up(): void
    {
        // Check and drop foreign keys if they exist
        $this->dropForeignKeyIfExists('positions', 'positions_department_id_foreign');
        $this->dropForeignKeyIfExists('positions', 'positions_faculty_id_foreign');

        // Drop columns if they exist
        Schema::table('positions', function (Blueprint $table) {
            $columns = ['department_id', 'faculty_id'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('positions', $column)) {
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
        Schema::table('positions', function (Blueprint $table) {
            // Re-add columns (nullable)
            if (!Schema::hasColumn('positions', 'department_id')) {
                $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            }
            if (!Schema::hasColumn('positions', 'faculty_id')) {
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
