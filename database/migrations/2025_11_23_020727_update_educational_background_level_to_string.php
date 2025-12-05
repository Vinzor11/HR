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
        // Change the enum column to a string column to accommodate any educational level
        Schema::table('employee_educational_backgrounds', function (Blueprint $table) {
            // First, we need to drop the enum constraint and change to string
            // MySQL requires dropping the column and recreating it
            $table->string('level', 100)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_educational_backgrounds', function (Blueprint $table) {
            // Convert back to enum (but this might lose data if values don't match)
            $table->enum('level', ['Elementary', 'Secondary', 'Vocational', 'College', 'Graduate Studies'])->change();
        });
    }
};
