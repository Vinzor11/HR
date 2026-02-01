<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Services\LeaveService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ProcessLeaveCarryOver extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leave:carry-over 
                            {--employee= : Specific employee ID to process}
                            {--year= : Year to carry over to (defaults to current year)}
                            {--all : Process all active employees}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process leave balance carry-over from previous year (VL/SL, up to 30 days)';

    /**
     * Execute the console command.
     */
    public function handle(LeaveService $leaveService)
    {
        $year = $this->option('year') ? (int) $this->option('year') : now()->year;
        $employeeId = $this->option('employee');
        $processAll = $this->option('all');

        if (!$employeeId && !$processAll) {
            $this->error('Please specify --employee=ID or --all to process all employees');
            return 1;
        }

        if ($processAll) {
            $this->info("Processing carry-over for year {$year}...");

            $employees = Employee::where('status', 'active')->get();
            $totalEmployees = $employees->count();

            if ($totalEmployees === 0) {
                $this->warn('No active employees found.');
                return 0;
            }

            $bar = $this->output->createProgressBar($totalEmployees);
            $bar->start();

            $processed = 0;
            $errors = 0;

            foreach ($employees as $employee) {
                try {
                    $results = $leaveService->processCarryOver($employee->id, $year);
                    if (!empty(array_filter($results, fn ($r) => ($r['status'] ?? '') === 'success'))) {
                        $processed++;
                    }
                } catch (\Exception $e) {
                    $errors++;
                    Log::error('Failed to process carry-over', [
                        'employee_id' => $employee->id,
                        'year' => $year,
                        'error' => $e->getMessage(),
                    ]);
                }
                $bar->advance();
            }

            $bar->finish();
            $this->newLine(2);

            $this->info("✓ Processed: {$processed} employees with carry-over");
            if ($errors > 0) {
                $this->warn("✗ Errors: {$errors} employees");
            }

            Log::info('Leave carry-over processed', [
                'year' => $year,
                'processed' => $processed,
                'errors' => $errors,
            ]);
        } else {
            $this->info("Processing carry-over for employee {$employeeId} for year {$year}...");
            $results = $leaveService->processCarryOver($employeeId, $year);

            if (empty($results)) {
                $this->warn('No carry-over processed. Check if:');
                $this->warn('  - Previous year has unused balance');
                $this->warn('  - Leave type allows carry-over');
                $this->warn('  - Balance hasn\'t already been carried over');
            } else {
                $this->table(
                    ['Leave Type', 'Status', 'Previous Balance', 'Carried Over'],
                    collect($results)->map(function ($result) {
                        return [
                            $result['leave_type'],
                            $result['status'],
                            $result['previous_balance'] ?? '-',
                            $result['carried_over'] ?? ($result['error'] ?? '-'),
                        ];
                    })
                );
            }
        }

        return 0;
    }
}
