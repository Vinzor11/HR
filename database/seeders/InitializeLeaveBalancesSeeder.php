<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\LeaveType;
use App\Services\LeaveService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Log;

/**
 * Initialize Leave Balances - CSC Compliant
 * 
 * Based on Civil Service Commission (CSC) Omnibus Rules on Leave:
 * - Vacation Leave (VL): 15 days/year (1.25 days/month)
 * - Sick Leave (SL): 15 days/year (1.25 days/month)
 * - Special Privilege Leave (SPL): 3 days/year
 * 
 * Other leave types are granted on-demand (maternity, paternity, etc.)
 */
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

        $this->command->info("Initializing CSC-compliant leave balances for {$employees->count()} employees for year {$year}...");

        // CSC Standard Entitlements per leave type
        // Based on Omnibus Rules on Leave (CSC MC No. 41, s. 1998)
        $entitlements = [
            // Credit-based leaves (earned 1.25 days/month)
            'VL' => 15.0,    // Vacation Leave - 15 days/year
            'SL' => 15.0,    // Sick Leave - 15 days/year
            
            // Special leaves with fixed annual entitlements
            'SPL' => 3.0,    // Special Privilege Leave - 3 days/year
            'SoloP' => 7.0,  // Solo Parent Leave - 7 days/year (if applicable)
            'CL' => 5.0,     // Calamity Leave - 5 days/year
            
            // These are granted on-demand, not automatically
            // 'FL' => 5.0,  // Forced Leave - 5 days (uses VL credits)
            // 'ML' => 0.0,  // Maternity Leave - granted when needed
            // 'PL' => 0.0,  // Paternity Leave - granted when needed
            // 'VAWC' => 0.0, // VAWC Leave - granted when needed
            // 'WSL' => 0.0,  // Women Special Leave - granted when needed
            // 'Study' => 0.0, // Study Leave - granted when approved
            // 'Rehab' => 0.0, // Rehabilitation - granted when needed
            // 'Adopt' => 0.0, // Adoption Leave - granted when needed
            // 'TL' => 0.0,   // Terminal Leave - upon separation
        ];

        $leaveTypes = LeaveType::active()->get()->keyBy('code');
        $processed = 0;
        $errors = 0;

        foreach ($employees as $employee) {
            try {
                foreach ($entitlements as $code => $days) {
                    $leaveType = $leaveTypes->get($code);
                    
                    if (!$leaveType) {
                        // Skip silently - not all leave types may be configured
                        continue;
                    }

                    // Check if leave type is available for this employee (gender restriction)
                    if (!$leaveType->isAvailableFor($employee)) {
                        continue;
                    }

                    // Skip Solo Parent Leave unless employee is marked as solo parent
                    if ($code === 'SoloP' && !$this->isSoloParent($employee)) {
                        continue;
                    }

                    // Only add entitlement if it's greater than 0
                    if ($days > 0) {
                        $leaveService->addAccrual(
                            $employee->id,
                            $leaveType->id,
                            $days,
                            'annual',
                            "CSC annual leave entitlement for {$year}",
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

        $this->command->info("✓ Successfully initialized CSC-compliant leave balances for {$processed} employees");
        
        if ($errors > 0) {
            $this->command->warn("⚠ {$errors} employees had errors during initialization");
        }
    }

    /**
     * Check if employee is a solo parent (placeholder - implement based on your data structure)
     */
    protected function isSoloParent(Employee $employee): bool
    {
        // TODO: Implement based on employee data
        // Could check for solo_parent flag or solo_parent_id field
        return false;
    }
}

