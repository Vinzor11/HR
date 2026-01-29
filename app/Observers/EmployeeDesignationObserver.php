<?php

namespace App\Observers;

use App\Models\EmployeeDesignation;
use App\Models\EmployeeDesignationHistory;
use Illuminate\Support\Facades\Cache;

class EmployeeDesignationObserver
{
    /**
     * Handle the EmployeeDesignation "created" event.
     */
    public function created(EmployeeDesignation $employeeDesignation): void
    {
        $this->syncPrimaryDesignation($employeeDesignation);
        $this->invalidateApprovalRoutingCache($employeeDesignation);
    }

    /**
     * Handle the EmployeeDesignation "updated" event.
     */
    public function updated(EmployeeDesignation $employeeDesignation): void
    {
        $this->syncPrimaryDesignation($employeeDesignation);
        $this->logDesignationChanges($employeeDesignation);
        $this->invalidateApprovalRoutingCache($employeeDesignation);
    }

    /**
     * Handle the EmployeeDesignation "deleted" event.
     */
    public function deleted(EmployeeDesignation $employeeDesignation): void
    {
        // If deleted designation was primary, find another or clear
        if ($employeeDesignation->is_primary) {
            $employee = $employeeDesignation->employee;
            $newPrimary = EmployeeDesignation::where('employee_id', $employee->id)
                ->where('id', '!=', $employeeDesignation->id)
                ->active()
                ->first();

            if ($newPrimary) {
                $newPrimary->update(['is_primary' => true]);
                $employee->update(['primary_designation_id' => $newPrimary->id]);
            } else {
                $employee->update(['primary_designation_id' => null]);
            }
        }
        
        $this->invalidateApprovalRoutingCache($employeeDesignation);
    }

    /**
     * Invalidate approval routing cache when designation changes.
     * This ensures approval routing uses fresh data after org structure changes.
     */
    protected function invalidateApprovalRoutingCache(EmployeeDesignation $designation): void
    {
        $employeeId = $designation->employee_id;
        
        // Clear all approval routing cache keys for this employee
        // The cache keys follow the pattern: approval_next:{employee_id}:{level}
        $cacheKeys = [
            "approval_next:{$employeeId}:auto",
        ];
        
        // Clear cache for common authority levels (1-10)
        for ($level = 1; $level <= 10; $level++) {
            $cacheKeys[] = "approval_next:{$employeeId}:{$level}";
        }
        
        foreach ($cacheKeys as $key) {
            Cache::forget($key);
        }
        
        // Also clear cache for employees in the same unit (they might have this employee as approver)
        if ($designation->unit_id) {
            $unitEmployeeIds = EmployeeDesignation::where('unit_id', $designation->unit_id)
                ->where('employee_id', '!=', $employeeId)
                ->pluck('employee_id')
                ->unique();
            
            foreach ($unitEmployeeIds as $unitEmployeeId) {
                Cache::forget("approval_next:{$unitEmployeeId}:auto");
                for ($level = 1; $level <= 10; $level++) {
                    Cache::forget("approval_next:{$unitEmployeeId}:{$level}");
                }
            }
        }
    }

    /**
     * Sync primary designation flag with employees.primary_designation_id
     */
    protected function syncPrimaryDesignation(EmployeeDesignation $designation): void
    {
        if ($designation->is_primary) {
            // Update employee's primary_designation_id
            $designation->employee->update(['primary_designation_id' => $designation->id]);
            
            // Ensure no other designation is primary
            EmployeeDesignation::where('employee_id', $designation->employee_id)
                ->where('id', '!=', $designation->id)
                ->update(['is_primary' => false]);
        } elseif ($designation->employee->primary_designation_id === $designation->id) {
            // If this was primary but no longer is, find another or set null
            $newPrimary = EmployeeDesignation::where('employee_id', $designation->employee_id)
                ->where('id', '!=', $designation->id)
                ->where('is_primary', true)
                ->first();
            
            $designation->employee->update(['primary_designation_id' => $newPrimary?->id]);
        }
    }

    /**
     * Log changes to designation history
     */
    protected function logDesignationChanges(EmployeeDesignation $designation): void
    {
        $changedFields = ['unit_id', 'position_id', 'academic_rank_id', 'staff_grade_id', 'is_primary', 'start_date', 'end_date'];
        $original = $designation->getOriginal();
        $changedBy = auth()->user()?->employee?->id;

        foreach ($changedFields as $field) {
            if (isset($original[$field]) && $original[$field] != $designation->$field) {
                EmployeeDesignationHistory::create([
                    'designation_id' => $designation->id,
                    'field_changed' => $field,
                    'old_value' => $original[$field] ? (string)$original[$field] : null,
                    'new_value' => $designation->$field ? (string)$designation->$field : null,
                    'changed_by' => $changedBy,
                    'changed_at' => now(),
                ]);
            }
        }
    }
}
