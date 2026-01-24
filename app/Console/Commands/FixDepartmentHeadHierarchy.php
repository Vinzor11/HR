<?php

namespace App\Console\Commands;

use App\Models\Position;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixDepartmentHeadHierarchy extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'positions:fix-department-head-hierarchy';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix hierarchy level for auto-created Department Head positions (should be 8, not 1)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Fixing Department Head hierarchy levels...');

        // Find all auto-created Department Head positions with incorrect hierarchy level
        $positions = Position::where('creation_type', 'auto')
            ->where(function ($query) {
                $query->where('pos_name', 'like', '%Department Head%')
                      ->orWhere('pos_name', 'like', '%DHEAD%');
            })
            ->where(function ($query) {
                $query->where('hierarchy_level', 1)
                      ->orWhere('hierarchy_level', '<', 8)
                      ->orWhereNull('hierarchy_level');
            })
            ->get();

        if ($positions->isEmpty()) {
            $this->info('No Department Head positions found with incorrect hierarchy levels.');
            return 0;
        }

        $this->info("Found {$positions->count()} Department Head position(s) to fix.");

        $fixed = 0;
        $skipped = 0;

        DB::transaction(function () use ($positions, &$fixed, &$skipped) {
            foreach ($positions as $position) {
                $oldLevel = $position->hierarchy_level ?? 'null';
                
                // Only fix if it's actually a Department Head position
                // Check if position name contains "Department Head" or position_type is department_leadership
                $isDepartmentHead = (
                    str_contains($position->pos_name, 'Department Head') ||
                    $position->position_type === 'department_leadership'
                ) && (
                    str_contains($position->pos_name, 'Department Head') ||
                    str_contains($position->pos_code, 'DHEAD')
                );

                if (!$isDepartmentHead) {
                    $skipped++;
                    continue;
                }

                $position->hierarchy_level = 8;
                $position->save();

                $this->line("  ✓ Fixed: {$position->pos_name} (ID: {$position->id}) - Changed from {$oldLevel} to 8");
                $fixed++;
            }
        });

        $this->info("\n✅ Fixed {$fixed} position(s).");
        if ($skipped > 0) {
            $this->warn("⚠ Skipped {$skipped} position(s) that don't match Department Head criteria.");
        }

        return 0;
    }
}
