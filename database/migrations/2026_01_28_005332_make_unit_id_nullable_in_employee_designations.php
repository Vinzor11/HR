<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Make unit_id nullable to support system-wide positions.
     */
    public function up(): void
    {
        Schema::table('employee_designations', function (Blueprint $table) {
            // Drop the existing foreign key constraint
            $table->dropForeign(['unit_id']);
            
            // Make unit_id nullable
            $table->foreignId('unit_id')->nullable()->change();
            
            // Re-add the foreign key constraint with nullable support
            $table->foreign('unit_id')->references('id')->on('units')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_designations', function (Blueprint $table) {
            // Drop the nullable foreign key
            $table->dropForeign(['unit_id']);
            
            // Make unit_id required again (this will fail if there are NULL values)
            $table->foreignId('unit_id')->nullable(false)->change();
            
            // Re-add the required foreign key constraint
            $table->foreign('unit_id')->references('id')->on('units')->cascadeOnDelete();
        });
    }
};
