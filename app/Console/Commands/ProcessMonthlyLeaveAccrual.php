<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Services\LeaveService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ProcessMonthlyLeaveAccrual extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leave:process-monthly-accrual 
                            {--month= : Specific month to process (YYYY-MM format, defaults to previous month)}
                            {--all : Process all active employees}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process monthly leave accrual for all active employees (VL and SL)';

    /**
     * Execute the console command.
     */
    public function handle(LeaveService $leaveService)
    {
        $monthInput = $this->option('month');
        
        if ($monthInput) {
            try {
                $month = Carbon::createFromFormat('Y-m', $monthInput)->startOfMonth();
            } catch (\Exception $e) {
                $this->error("Invalid month format. Use YYYY-MM (e.g., 2026-01)");
                return 1;
            }
        } else {
            // Default to previous month (process at the end of the month)
            $month = now()->subMonth()->startOfMonth();
        }

        $this->info("Processing monthly leave accrual for {$month->format('F Y')}...");

        $employees = Employee::where('status', 'active')->get();
        $totalEmployees = $employees->count();
        
        if ($totalEmployees === 0) {
            $this->warn('No active employees found.');
            return 0;
        }

        $bar = $this->output->createProgressBar($totalEmployees);
        $bar->start();

        $processed = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($employees as $employee) {
            try {
                $leaveService->processMonthlyAccrual($employee->id, $month);
                $processed++;
            } catch (\Exception $e) {
                $errors++;
                Log::error('Failed to process monthly accrual', [
                    'employee_id' => $employee->id,
                    'month' => $month->format('Y-m'),
                    'error' => $e->getMessage(),
                ]);
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("✓ Processed: {$processed} employees");
        if ($errors > 0) {
            $this->warn("✗ Errors: {$errors} employees");
        }

        Log::info('Monthly leave accrual processed', [
            'month' => $month->format('Y-m'),
            'processed' => $processed,
            'errors' => $errors,
        ]);

        return 0;
    }
}
