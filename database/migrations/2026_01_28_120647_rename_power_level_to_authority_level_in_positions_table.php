<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Renames power_level column to authority_level in positions table
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        
        if ($driver === 'mysql') {
            // MySQL doesn't support renameColumn, use ALTER TABLE
            DB::statement('ALTER TABLE positions CHANGE power_level authority_level TINYINT UNSIGNED DEFAULT 1');
        } else {
            // PostgreSQL and SQLite support renameColumn
            Schema::table('positions', function (Blueprint $table) {
                $table->renameColumn('power_level', 'authority_level');
            });
        }

        // Update check constraint name for PostgreSQL
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_power_level_check');
            DB::statement('ALTER TABLE positions ADD CONSTRAINT positions_authority_level_check CHECK (authority_level >= 0 AND authority_level <= 100)');
        }

        // Rename the index
        Schema::table('positions', function (Blueprint $table) {
            $table->dropIndex(['power_level']);
            $table->index('authority_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        
        // Restore the index first
        Schema::table('positions', function (Blueprint $table) {
            $table->dropIndex(['authority_level']);
            $table->index('power_level');
        });

        // Restore check constraint for PostgreSQL
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_authority_level_check');
            DB::statement('ALTER TABLE positions ADD CONSTRAINT positions_power_level_check CHECK (power_level >= 0 AND power_level <= 100)');
        }

        if ($driver === 'mysql') {
            // MySQL doesn't support renameColumn, use ALTER TABLE
            DB::statement('ALTER TABLE positions CHANGE authority_level power_level TINYINT UNSIGNED DEFAULT 1');
        } else {
            // PostgreSQL and SQLite support renameColumn
            Schema::table('positions', function (Blueprint $table) {
                $table->renameColumn('authority_level', 'power_level');
            });
        }
    }
};
