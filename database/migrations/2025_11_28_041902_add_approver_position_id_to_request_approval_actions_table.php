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
        Schema::table('request_approval_actions', function (Blueprint $table) {
            $table->unsignedBigInteger('approver_position_id')->nullable()->after('approver_role_id');
            $table->foreign('approver_position_id')->references('id')->on('positions')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('request_approval_actions', function (Blueprint $table) {
            $table->dropForeign(['approver_position_id']);
            $table->dropColumn('approver_position_id');
        });
    }
};
