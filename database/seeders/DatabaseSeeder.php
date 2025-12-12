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
        // 1. Create Super Admin user, roles, and permissions
        $this->call(SuperAdminSeeder::class);
        
        // 2. Seed leave types (must be before LeaveRequestTypeSeeder)
        $this->call(LeaveTypeSeeder::class);
        
        // 3. Seed leave request form fields (depends on LeaveTypeSeeder)
        $this->call(LeaveRequestTypeSeeder::class);
        
        // 4. Initialize leave balances for existing employees (optional - only if employees exist)
        // This will skip gracefully if no employees are found
        $this->call(InitializeLeaveBalancesSeeder::class);
    }
}
