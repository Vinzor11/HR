<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\EmployeeDesignation;
use App\Models\Unit;
use App\Models\Position;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateLegacyEmployeeData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hr:migrate-legacy-employees 
                            {--dry-run : Show what would be migrated without making changes}
                            {--chunk=100 : Number of employees to process at a time}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate legacy employee data (department_id, position_id, faculty_id) to new employee_assignments structure';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $chunkSize = (int) $this->option('chunk');

        if ($dryRun) {
            $this->info('🔍 DRY RUN MODE - No changes will be made');
        }

        $this->info('Starting legacy employee data migration...');

        $totalEmployees = Employee::where(function ($query) {
            $query->whereNotNull('department_id')
                ->orWhereNotNull('position_id')
                ->orWhereNotNull('faculty_id');
        })->count();

        if ($totalEmployees === 0) {
            $this->info('No employees with legacy data found.');
            return 0;
        }

        $this->info("Found {$totalEmployees} employees with legacy data.");

        $bar = $this->output->createProgressBar($totalEmployees);
        $bar->start();

        $migrated = 0;
        $skipped = 0;
        $errors = 0;

        Employee::where(function ($query) {
            $query->whereNotNull('department_id')
                ->orWhereNotNull('position_id')
                ->orWhereNotNull('faculty_id');
        })->chunk($chunkSize, function ($employees) use (&$migrated, &$skipped, &$errors, $dryRun, $bar) {
            foreach ($employees as $employee) {
                try {
                    // Check if employee already has designations (new org structure)
                    if ($employee->designations()->exists()) {
                        $skipped++;
                        $bar->advance();
                        continue;
                    }

                    // Map legacy department_id / faculty_id to unit (new org structure: Unit/Sector only)
                    $unit = null;
                    $departmentId = $employee->getAttribute('department_id');
                    $facultyId = $employee->getAttribute('faculty_id');
                    if ($departmentId) {
                        // Assume legacy department_id may match unit id if data was migrated
                        $unit = Unit::find($departmentId);
                    }
                    if (!$unit && $facultyId) {
                        // Legacy faculty (college) may map to sector_id; take first unit in that sector
                        $unit = Unit::where('sector_id', $facultyId)->first();
                    }

                    // Get position
                    $position = null;
                    if ($employee->position_id) {
                        $position = Position::find($employee->position_id);
                    }

                    // If we can't find unit or position, skip
                    if (!$unit || !$position) {
                        $skipped++;
                        $bar->advance();
                        continue;
                    }

                    if (!$dryRun) {
                        DB::transaction(function () use ($employee, $unit, $position) {
                            $designation = EmployeeDesignation::create([
                                'employee_id' => $employee->id,
                                'unit_id' => $unit->id,
                                'position_id' => $position->id,
                                'academic_rank_id' => null, // Legacy data may not have this
                                'staff_grade_id' => null, // Legacy data may not have this
                                'is_primary' => true,
                                'start_date' => $employee->date_hired ?? now(),
                                'end_date' => null,
                                'remarks' => 'Migrated from legacy data',
                            ]);

                            $employee->update(['primary_designation_id' => $designation->id]);
                        });
                    }

                    $migrated++;
                    $bar->advance();
                } catch (\Exception $e) {
                    $errors++;
                    $this->error("\nError migrating employee {$employee->id}: " . $e->getMessage());
                    $bar->advance();
                }
            }
        });

        $bar->finish();
        $this->newLine(2);

        $this->info("Migration complete!");
        $this->table(
            ['Status', 'Count'],
            [
                ['Migrated', $migrated],
                ['Skipped', $skipped],
                ['Errors', $errors],
                ['Total', $totalEmployees],
            ]
        );

        if ($dryRun) {
            $this->warn('This was a dry run. Run without --dry-run to apply changes.');
        }

        return 0;
    }
}
