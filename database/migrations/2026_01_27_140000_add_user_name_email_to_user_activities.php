<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Store user name and email at activity creation so they persist after user deletion.
     */
    public function up(): void
    {
        if (!Schema::hasTable('user_activities')) {
            return;
        }

        Schema::table('user_activities', function (Blueprint $table) {
            $table->string('user_name', 255)->nullable()->after('user_id')
                ->comment('User name at time of activity; preserved when user is deleted');
            $table->string('user_email', 255)->nullable()->after('user_name')
                ->comment('User email at time of activity; preserved when user is deleted');
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement('
                UPDATE user_activities ua
                INNER JOIN users u ON u.id = ua.user_id
                SET ua.user_name = u.name, ua.user_email = u.email
            ');
        } elseif ($driver === 'sqlite') {
            $names = DB::table('users')->pluck('name', 'id');
            $emails = DB::table('users')->pluck('email', 'id');
            DB::table('user_activities')->whereNotNull('user_id')->orderBy('id')->chunk(500, function ($rows) use ($names, $emails) {
                foreach ($rows as $r) {
                    $id = $r->user_id;
                    $name = $names[$id] ?? null;
                    $email = $emails[$id] ?? null;
                    if ($name !== null || $email !== null) {
                        DB::table('user_activities')->where('id', $r->id)->update([
                            'user_name' => $name,
                            'user_email' => $email,
                        ]);
                    }
                }
            });
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

        Schema::table('user_activities', function (Blueprint $table) {
            $table->dropColumn(['user_name', 'user_email']);
        });
    }
};
