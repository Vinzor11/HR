<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds primary_assignment_id to employees table for cross-DB safe primary assignment enforcement
     * This foreign key ensures only one primary assignment per employee (MySQL-safe)
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->foreignId('primary_designation_id')->nullable()->after('position_id')
                ->constrained('employee_designations')->nullOnDelete();
            
            $table->index('primary_designation_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeign(['primary_designation_id']);
            $table->dropIndex(['primary_designation_id']);
            $table->dropColumn('primary_designation_id');
        });
    }
};
