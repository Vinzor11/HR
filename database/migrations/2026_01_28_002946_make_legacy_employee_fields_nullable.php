<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Make legacy fields nullable since we're moving to the new designation system.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            // Make position_id nullable (was required)
            $table->foreignId('position_id')->nullable()->change();
            
            // department_id is already nullable, but ensure it's explicitly set
            // No change needed as it's already nullable in the original migration
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            // Revert position_id to required (not nullable)
            // Note: This will fail if there are any NULL values in the database
            $table->foreignId('position_id')->nullable(false)->change();
        });
    }
};
