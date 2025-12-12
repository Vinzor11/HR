<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Do not auto-seed in production (e.g., Railway builds)
        if (app()->environment('production')) {
            return;
        }

        $this->call(SuperAdminSeeder::class);
        $this->call(LeaveRequestTypeSeeder::class);

    }
}
