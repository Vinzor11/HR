<?php

use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('security:rehash-passwords', function () {
    $updated = 0;

    User::withTrashed()->chunkById(100, function ($users) use (&$updated) {
        foreach ($users as $user) {
            $algo = Hash::info($user->password)['algoName'] ?? null;

            // Rehash anything that is not explicitly bcrypt (includes unknown/plain/other algos)
            if ($algo !== 'bcrypt') {
                $user->password = Hash::make($user->password);
                $user->save();
                $updated++;
            }
        }
    });

    $this->info("Rehashed {$updated} password(s) to bcrypt.");
})->purpose('Rehash any user passwords that are not using bcrypt');

// ============================================================================
// LEAVE MANAGEMENT SCHEDULED TASKS
// ============================================================================

// Monthly Leave Accrual Processing
// Runs on the 1st day of each month at 2:00 AM to process the previous month's accruals
// Adds 1.25 days VL + 1.25 days SL per employee (CSC Rule)
Schedule::command('leave:process-monthly-accrual')
    ->monthlyOn(1, '02:00')
    ->timezone('Asia/Manila')
    ->withoutOverlapping()
    ->onSuccess(function () {
        \Log::info('Monthly leave accrual completed successfully');
    })
    ->onFailure(function () {
        \Log::error('Monthly leave accrual failed');
    })
    ->description('Process monthly leave accrual for all active employees');

// Annual Leave Carry-Over Processing
// Runs on January 1st at 1:00 AM to carry over unused leave from previous year
// Carries over up to 30 days per leave type (CSC Rule)
Schedule::command('leave:carry-over --all')
    ->yearlyOn(1, 1, '01:00') // January 1st at 1:00 AM
    ->timezone('Asia/Manila')
    ->withoutOverlapping()
    ->onSuccess(function () {
        \Log::info('Annual leave carry-over completed successfully');
    })
    ->onFailure(function () {
        \Log::error('Annual leave carry-over failed');
    })
    ->description('Process annual leave carry-over for all active employees');
