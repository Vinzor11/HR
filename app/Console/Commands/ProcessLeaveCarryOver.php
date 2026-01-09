<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\LeaveService;
use Illuminate\Console\Command;

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
                            {--all : Process all employees}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process leave balance carry-over from previous year';

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
            $this->info("Processing carry-over for all employees for year {$year}...");
            $employees = \App\Models\Employee::where('status', 'active')->get();
            
            $bar = $this->output->createProgressBar($employees->count());
            $bar->start();
            
            $totalProcessed = 0;
            foreach ($employees as $employee) {
                $results = $leaveService->processCarryOver($employee->id, $year);
                if (!empty($results)) {
                    $totalProcessed++;
                }
                $bar->advance();
            }
            
            $bar->finish();
            $this->newLine();
            $this->info("Processed carry-over for {$totalProcessed} employees.");
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
