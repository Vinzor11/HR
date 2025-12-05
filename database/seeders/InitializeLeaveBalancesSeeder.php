<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\LeaveType;
use App\Services\LeaveService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Log;

class InitializeLeaveBalancesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $leaveService = app(LeaveService::class);
        $year = now()->year;

        // Get all active employees
        $employees = Employee::where('status', 'active')->get();
        
        if ($employees->isEmpty()) {
            $this->command->warn('No active employees found. Skipping leave balance initialization.');
            return;
        }

        $this->command->info("Initializing leave balances for {$employees->count()} employees for year {$year}...");

        // Default entitlements per leave type
        $entitlements = [
            'VAC' => 15.0,  // Vacation Leave - 15 days
            'SICK' => 15.0, // Sick Leave - 15 days
            'PER' => 5.0,   // Personal Leave - 5 days
            'MAT' => 0.0,   // Maternity Leave - 0 (only when needed)
            'PAT' => 0.0,   // Paternity Leave - 0 (only when needed)
            'EMER' => 5.0,  // Emergency Leave - 5 days
        ];

        $leaveTypes = LeaveType::active()->get()->keyBy('code');
        $processed = 0;
        $errors = 0;

        foreach ($employees as $employee) {
            try {
                foreach ($entitlements as $code => $days) {
                    $leaveType = $leaveTypes->get($code);
                    
                    if (!$leaveType) {
                        $this->command->warn("Leave type {$code} not found. Skipping.");
                        continue;
                    }

                    // Only add entitlement if it's greater than 0
                    if ($days > 0) {
                        $leaveService->addAccrual(
                            $employee->id,
                            $leaveType->id,
                            $days,
                            'annual',
                            "Initial leave entitlement for {$year}",
                            $year,
                            null // No user ID for seeder
                        );
                    }
                }
                
                $processed++;
                
                if ($processed % 10 === 0) {
                    $this->command->info("Processed {$processed} employees...");
                }
            } catch (\Exception $e) {
                $errors++;
                Log::error("Failed to initialize leave balance for employee {$employee->id}", [
                    'employee_id' => $employee->id,
                    'error' => $e->getMessage(),
                ]);
                $this->command->error("Error processing employee {$employee->id}: {$e->getMessage()}");
            }
        }

        $this->command->info("✓ Successfully initialized leave balances for {$processed} employees");
        
        if ($errors > 0) {
            $this->command->warn("⚠ {$errors} employees had errors during initialization");
        }
    }
}

