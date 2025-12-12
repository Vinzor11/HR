<?php

use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;

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
