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
            // MySQL supports MODIFY COLUMN for enums
            DB::statement("ALTER TABLE user_activities MODIFY COLUMN activity_type ENUM('login', 'logout', 'login_failed', 'oauth_logout', 'sso_login')");
        } elseif ($driver === 'sqlite') {
            // SQLite doesn't enforce enum constraints, just ensure the column exists
            // The enum values are handled at application level
            if (!Schema::hasColumn('user_activities', 'activity_type')) {
                Schema::table('user_activities', function (Blueprint $table) {
                    $table->enum('activity_type', ['login', 'logout', 'login_failed', 'oauth_logout', 'sso_login']);
                });
            }
        } else {
            // For other databases, try the MySQL approach or log a warning
            try {
                DB::statement("ALTER TABLE user_activities MODIFY COLUMN activity_type ENUM('login', 'logout', 'login_failed', 'oauth_logout', 'sso_login')");
            } catch (\Exception $e) {
                // Log but don't fail - the enum constraint is not critical
                \Illuminate\Support\Facades\Log::warning('Could not modify activity_type enum: ' . $e->getMessage());
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            // MySQL supports MODIFY COLUMN for enums
            DB::statement("ALTER TABLE user_activities MODIFY COLUMN activity_type ENUM('login', 'logout', 'login_failed', 'oauth_logout')");
        } elseif ($driver === 'sqlite') {
            // SQLite doesn't need to revert enum constraints
            // The application will handle validation
        } else {
            // For other databases, try to revert
            try {
                DB::statement("ALTER TABLE user_activities MODIFY COLUMN activity_type ENUM('login', 'logout', 'login_failed', 'oauth_logout')");
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Could not revert activity_type enum: ' . $e->getMessage());
            }
        }
    }
};
