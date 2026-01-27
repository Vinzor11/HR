<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\UserActivity;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class LogExpiredSessions extends Command
{
    protected $signature = 'sessions:log-expired';

    protected $description = 'Log user activities for expired sessions, then remove those sessions';

    public function handle(): int
    {
        $driver = config('session.driver');
        if ($driver !== 'database') {
            $this->warn('Session driver is not database. Skipping.');
            return 0;
        }

        $connection = config('session.connection') ?? config('database.default');
        $table = config('session.table', 'sessions');
        $lifetime = (int) config('session.lifetime', 120);
        $cutoff = now()->timestamp - ($lifetime * 60);

        $rows = DB::connection($connection)
            ->table($table)
            ->whereNotNull('user_id')
            ->where('last_activity', '<', $cutoff)
            ->get();

        $logged = 0;
        foreach ($rows as $row) {
            $user = User::withTrashed()->find($row->user_id);
            $userName = $user?->name ?? ($row->user_id ? "User #{$row->user_id} (deleted)" : 'Unknown User');
            $userEmail = $user?->email ?? '—';

            UserActivity::create([
                'user_id' => $row->user_id,
                'user_name' => $userName,
                'user_email' => $userEmail,
                'activity_type' => 'session_expired',
                'ip_address' => $row->ip_address,
                'user_agent' => $row->user_agent,
                'device' => UserActivity::parseUserAgent($row->user_agent)['device'],
                'browser' => UserActivity::parseUserAgent($row->user_agent)['browser'],
                'status' => 'success',
                'logout_time' => now(),
            ]);

            DB::connection($connection)->table($table)->where('id', $row->id)->delete();
            $logged++;
        }

        if ($logged > 0) {
            $this->info("Logged {$logged} expired session(s).");
        }

        return 0;
    }
}
