<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Store performer name at log creation so it persists after user deletion.
     */
    public function up(): void
    {
        if (!Schema::hasTable('audit_logs')) {
            return;
        }

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('performed_by', 255)->nullable()->after('user_id')
                ->comment('Actor name at time of action; preserved when user is deleted');
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement('
                UPDATE audit_logs al
                INNER JOIN users u ON u.id = al.user_id
                SET al.performed_by = u.name
            ');
        } elseif ($driver === 'sqlite') {
            $userNames = DB::table('users')->pluck('name', 'id');
            DB::table('audit_logs')->whereNotNull('user_id')->orderBy('id')->chunk(500, function ($rows) use ($userNames) {
                foreach ($rows as $log) {
                    $name = $userNames[$log->user_id ?? 0] ?? null;
                    if ($name !== null) {
                        DB::table('audit_logs')->where('id', $log->id)->update(['performed_by' => $name]);
                    }
                }
            });
        }

        DB::table('audit_logs')->whereNull('performed_by')->update(['performed_by' => 'System']);

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->index('performed_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('audit_logs')) {
            return;
        }

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex(['performed_by']);
            $table->dropColumn('performed_by');
        });
    }
};
