<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Unit;
use App\Models\EmployeeDesignation;

/**
 * Policy for unit-scoped access control
 * 
 * Implements Step 7: Use policies for unit-scoped access
 */
class UnitPolicy
{
    /**
     * Determine if the user can view the unit
     */
    public function view(User $user, Unit $unit): bool
    {
        // Users can view units in their sector or if they have system-wide access
        return $this->hasAccessToUnit($user, $unit);
    }

    /**
     * Determine if the user can create units
     */
    public function create(User $user): bool
    {
        return $user->can('create-unit');
    }

    /**
     * Determine if the user can update the unit
     */
    public function update(User $user, Unit $unit): bool
    {
        if (!$user->can('edit-unit')) {
            return false;
        }

        // Users can only edit units they have access to
        return $this->hasAccessToUnit($user, $unit);
    }

    /**
     * Determine if the user can delete the unit
     */
    public function delete(User $user, Unit $unit): bool
    {
        if (!$user->can('delete-unit')) {
            return false;
        }

        // Users can only delete units they have access to
        return $this->hasAccessToUnit($user, $unit);
    }

    /**
     * Determine if the user can manage employees in the unit
     */
    public function manageEmployees(User $user, Unit $unit): bool
    {
        if (!$user->can('manage-unit-employees')) {
            return false;
        }

        return $this->hasAccessToUnit($user, $unit);
    }

    /**
     * Check if user has access to a unit based on their assignments
     * 
     * Access rules:
     * 1. System-wide positions (sector_id = null) have access to all units
     * 2. Sector-specific positions have access to units in their sector
     * 3. Unit-specific access: users assigned to the unit or its parent units
     */
    protected function hasAccessToUnit(User $user, Unit $unit): bool
    {
        if (!$user->employee_id) {
            return false;
        }

        $employee = $user->employee;
        if (!$employee) {
            return false;
        }

        // Get all active assignments for the employee
        $designations = EmployeeDesignation::where('employee_id', $employee->id)
            ->active()
            ->with(['position', 'unit.sector'])
            ->get();

        foreach ($designations as $designation) {
            $position = $designation->position;
            $designationUnit = $designation->unit;

            if (!$position || !$designationUnit) {
                continue;
            }

            // System-wide positions have access to all units
            if ($position->sector_id === null) {
                return true;
            }

            // Check if designation is in the same sector
            if ($designationUnit->sector_id === $unit->sector_id) {
                // Check if designation is in the same unit or parent unit
                if ($this->isUnitOrParent($designationUnit, $unit)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if $unit1 is the same as $unit2 or is a parent of $unit2
     */
    protected function isUnitOrParent(Unit $unit1, Unit $unit2): bool
    {
        // Same unit
        if ($unit1->id === $unit2->id) {
            return true;
        }

        // Check parent chain
        $current = $unit2;
        while ($current->parent_unit_id) {
            if ($current->parent_unit_id === $unit1->id) {
                return true;
            }
            $current = $current->parentUnit;
            if (!$current) {
                break;
            }
        }

        return false;
    }
}
