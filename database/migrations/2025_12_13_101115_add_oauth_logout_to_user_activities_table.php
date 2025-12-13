<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify the enum to include 'oauth_logout'
        DB::statement("ALTER TABLE user_activities MODIFY COLUMN activity_type ENUM('login', 'logout', 'login_failed', 'oauth_logout')");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'oauth_logout' from the enum (revert to original)
        DB::statement("ALTER TABLE user_activities MODIFY COLUMN activity_type ENUM('login', 'logout', 'login_failed')");
    }
};
