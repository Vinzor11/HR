<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('user_activities')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement("ALTER TABLE user_activities MODIFY COLUMN activity_type ENUM('login', 'logout', 'login_failed', 'oauth_logout', 'session_expired')");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('user_activities')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement("DELETE FROM user_activities WHERE activity_type = 'session_expired'");
            DB::statement("ALTER TABLE user_activities MODIFY COLUMN activity_type ENUM('login', 'logout', 'login_failed', 'oauth_logout')");
        }
    }
};
