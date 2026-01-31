<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds unit-based access and position→role mapping for OAuth clients.
     */
    public function up(): void
    {
        // Drop if exists from a previous partial run (e.g. unique name length failure)
        Schema::dropIfExists('oauth_client_cross_unit_positions');
        Schema::dropIfExists('oauth_client_position_roles');

        Schema::table('oauth_clients', function (Blueprint $table) {
            if (!Schema::hasColumn('oauth_clients', 'allowed_unit_id')) {
                $table->foreignId('allowed_unit_id')->nullable()->after('provider')
                    ->constrained('units')->nullOnDelete();
            }
        });

        Schema::create('oauth_client_position_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('oauth_client_id')->constrained('oauth_clients')->cascadeOnDelete();
            $table->foreignId('position_id')->constrained('positions')->cascadeOnDelete();
            $table->string('role', 20); // 'admin' | 'user'
            $table->timestamps();
            $table->unique(['oauth_client_id', 'position_id'], 'oauth_client_pos_roles_unique');
        });

        Schema::create('oauth_client_cross_unit_positions', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('oauth_client_id')->constrained('oauth_clients')->cascadeOnDelete();
            $table->foreignId('position_id')->constrained('positions')->cascadeOnDelete();
            $table->string('role', 20)->default('user'); // role when accessing from another unit
            $table->string('unit_type_filter', 50)->nullable(); // e.g. 'academic' (college,program) or null = any
            $table->timestamps();
            $table->unique(['oauth_client_id', 'position_id'], 'oauth_client_cross_unit_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('oauth_client_cross_unit_positions');
        Schema::dropIfExists('oauth_client_position_roles');
        Schema::table('oauth_clients', function (Blueprint $table) {
            if (Schema::hasColumn('oauth_clients', 'allowed_unit_id')) {
                $table->dropForeign(['allowed_unit_id']);
            }
        });
    }
};
