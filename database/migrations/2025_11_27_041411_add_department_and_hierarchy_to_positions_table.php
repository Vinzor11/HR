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
            if (!Schema::hasColumn('positions', 'department_id')) {
                $table->unsignedBigInteger('department_id')->nullable()->after('id');
                $table->foreign('department_id')->references('id')->on('departments')->onDelete('set null');
            }
            
            if (!Schema::hasColumn('positions', 'hierarchy_level')) {
                $table->integer('hierarchy_level')->default(1)->after('department_id');
            }
            
            if (!Schema::hasColumn('positions', 'position_type')) {
                $table->string('position_type', 50)->nullable()->after('hierarchy_level');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('positions', function (Blueprint $table) {
            if (Schema::hasColumn('positions', 'department_id')) {
                $table->dropForeign(['department_id']);
                $table->dropColumn('department_id');
            }
            
            if (Schema::hasColumn('positions', 'hierarchy_level')) {
                $table->dropColumn('hierarchy_level');
            }
            
            if (Schema::hasColumn('positions', 'position_type')) {
                $table->dropColumn('position_type');
            }
        });
    }
};
