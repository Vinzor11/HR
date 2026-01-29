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
     * Refactors positions table to add:
     * - authority_level (0-100) for approval workflows
     * - sector_id (nullable for system-wide positions)
     * 
     * Keeps existing fields for backward compatibility during transition
     */
    public function up(): void
    {
        Schema::table('positions', function (Blueprint $table) {
            // Add new fields for the refactored system
            $table->foreignId('sector_id')->nullable()->after('faculty_id')->constrained('sectors')->nullOnDelete();
            $table->unsignedTinyInteger('authority_level')->default(1)->after('sector_id'); // 0-100 for approval hierarchy
            
            // Add index for authority_level (used in approval routing)
            $table->index('authority_level');
            $table->index('sector_id');
        });

        // Add check constraint for authority_level (0-100)
        // PostgreSQL will enforce this; MySQL will ignore it
        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE positions ADD CONSTRAINT positions_authority_level_check CHECK (authority_level >= 0 AND authority_level <= 100)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('positions', function (Blueprint $table) {
            $table->dropForeign(['sector_id']);
            $table->dropIndex(['authority_level']);
            $table->dropIndex(['sector_id']);
            $table->dropColumn(['sector_id', 'authority_level']);
        });
    }
};
