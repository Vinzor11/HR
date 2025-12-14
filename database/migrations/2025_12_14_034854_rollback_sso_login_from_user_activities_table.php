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
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            // MySQL supports MODIFY COLUMN for enums - remove sso_login if it exists
            try {
                DB::statement("ALTER TABLE user_activities MODIFY COLUMN activity_type ENUM('login', 'logout', 'login_failed', 'oauth_logout')");
            } catch (\Exception $e) {
                // If it fails, the enum might already be correct
                \Illuminate\Support\Facades\Log::info('SSO login rollback: ' . $e->getMessage());
            }
        } elseif ($driver === 'sqlite') {
            // SQLite doesn't need explicit enum rollback
            // The application will handle validation
        } else {
            // For other databases, try to rollback
            try {
                DB::statement("ALTER TABLE user_activities MODIFY COLUMN activity_type ENUM('login', 'logout', 'login_failed', 'oauth_logout')");
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::info('SSO login rollback: ' . $e->getMessage());
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Re-add sso_login if needed (reverse of rollback)
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            try {
                DB::statement("ALTER TABLE user_activities MODIFY COLUMN activity_type ENUM('login', 'logout', 'login_failed', 'oauth_logout', 'sso_login')");
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::info('SSO login restore: ' . $e->getMessage());
            }
        }
    }
};
