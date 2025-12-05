<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('positions', function (Blueprint $table) {
            $table->enum('position_category', [
                'executive',
                'academic_teaching',
                'academic_support',
                'administrative_non_teaching',
                'technical_skilled',
                'support_utility',
                'specialized_compliance'
            ])->nullable()->after('position_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('positions', function (Blueprint $table) {
            $table->dropColumn('position_category');
        });
    }
};
