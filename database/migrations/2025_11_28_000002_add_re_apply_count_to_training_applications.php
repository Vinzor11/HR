<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('apply_training', function (Blueprint $table) {
            $table->unsignedInteger('re_apply_count')->default(0)->after('status');
            $table->unsignedBigInteger('request_submission_id')->nullable()->after('re_apply_count');
            
            $table->foreign('request_submission_id')
                ->references('id')
                ->on('request_submissions')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('apply_training', function (Blueprint $table) {
            $table->dropForeign(['request_submission_id']);
            $table->dropColumn(['re_apply_count', 'request_submission_id']);
        });
    }
};






