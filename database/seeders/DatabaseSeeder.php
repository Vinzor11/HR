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
        // 1. Seed organizational structure (sectors, units) - must run first
        $this->call(OrgStructureSeeder::class);
        
        // 2. Seed positions (depends on sectors)
        $this->call(PositionsSeeder::class);
        
        // 3. Seed academic ranks (faculty career progression)
        $this->call(AcademicRanksSeeder::class);
        
        // 4. Seed staff grades (administrative career progression)
        $this->call(StaffGradesSeeder::class);
        
        // 4.5. Seed unit-position whitelist (depends on positions)
        $this->call(UnitPositionSeeder::class);
        
        // 5. Create Super Admin user and all permissions
        $this->call(SuperAdminSeeder::class);
        
        // 6. Create default functional roles (depends on permissions from SuperAdminSeeder)
        $this->call(DefaultRolesSeeder::class);
        
        // 8. Seed leave types (must be before LeaveRequestTypeSeeder)
        $this->call(LeaveTypeSeeder::class);
        
        // 9. Seed leave request form fields (depends on LeaveTypeSeeder)
        $this->call(LeaveRequestTypeSeeder::class);

        // 10. Clean up legacy roles and permissions (after Super Admin and default roles exist)
        $this->call(LegacyCleanupSeeder::class);

        // 11. Initialize leave balances for existing employees (optional - only if employees exist)
        // This will skip gracefully if no employees are found
        $this->call(InitializeLeaveBalancesSeeder::class);
    }
}
