<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Update existing NULL values to false
        DB::table('trainings')
            ->whereNull('requires_approval')
            ->update(['requires_approval' => false]);

        // Modify the column to be NOT NULL with default false
        Schema::table('trainings', function (Blueprint $table) {
            $table->boolean('requires_approval')->default(false)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        // Revert to nullable
        Schema::table('trainings', function (Blueprint $table) {
            $table->boolean('requires_approval')->nullable()->change();
        });
    }
};






