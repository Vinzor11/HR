<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trainings', function (Blueprint $table) {
            $table->boolean('requires_approval')->default(false)->after('remarks');
            $table->foreignId('request_type_id')->nullable()->after('requires_approval')
                ->constrained('request_types')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('trainings', function (Blueprint $table) {
            $table->dropForeign(['request_type_id']);
            $table->dropColumn(['requires_approval', 'request_type_id']);
        });
    }
};






