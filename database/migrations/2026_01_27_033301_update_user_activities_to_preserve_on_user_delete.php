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
        Schema::table('user_activities', function (Blueprint $table) {
            // Drop the existing foreign key constraint
            // Laravel names foreign keys as: {table}_{column}_foreign
            $table->dropForeign(['user_id']);
        });

        Schema::table('user_activities', function (Blueprint $table) {
            // Make user_id nullable so records persist when user is deleted
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });

        Schema::table('user_activities', function (Blueprint $table) {
            // Re-add foreign key with set null on delete to preserve records
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_activities', function (Blueprint $table) {
            // Drop the set null foreign key
            $table->dropForeign(['user_id']);
        });

        Schema::table('user_activities', function (Blueprint $table) {
            // Make user_id not nullable again
            // Note: This will fail if there are any null user_id values
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
        });

        Schema::table('user_activities', function (Blueprint $table) {
            // Re-add cascade foreign key (original behavior)
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });
    }
};
