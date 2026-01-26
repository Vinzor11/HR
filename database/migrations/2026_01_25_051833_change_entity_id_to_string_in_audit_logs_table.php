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
        Schema::table('audit_logs', function (Blueprint $table) {
            // Change entity_id from bigint to varchar(50) to support string IDs (like Employee IDs)
            $table->string('entity_id', 50)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            // Revert back to bigint (note: this may cause data loss for string IDs)
            $table->unsignedBigInteger('entity_id')->nullable()->change();
        });
    }
};
