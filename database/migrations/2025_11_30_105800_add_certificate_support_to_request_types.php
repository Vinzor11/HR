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
        Schema::table('request_types', function (Blueprint $table) {
            $table->foreignId('certificate_template_id')->nullable()->after('has_fulfillment')->constrained('certificate_templates')->nullOnDelete();
            $table->json('certificate_config')->nullable()->after('certificate_template_id'); // Field mappings and generation settings
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('request_types', function (Blueprint $table) {
            $table->dropForeign(['certificate_template_id']);
            $table->dropColumn(['certificate_template_id', 'certificate_config']);
        });
    }
};
