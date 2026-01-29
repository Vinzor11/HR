<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\User;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Builder;

/**
 * Employee Scope Service - Updated for new org structure (Sector/Unit/Position)
 * 
 * Uses authority_level on Position and unit hierarchy for scoping.
 */
class EmployeeScopeService
{
    /**
     * Get the scope query for employees that the current user can view.
     * 
     * Logic:
     * - Super Admin/Admin: Can view all employees
     * - High authority level (8+): Can view all employees in their sector
     * - Mid authority level (5-7): Can view all employees in their unit and sub-units
     * - Others: Can only view themselves
     * 
     * @param User $user The authenticated user
     * @return Builder|null Returns a query builder with scoped conditions, or null for all access
     */
    public function getEmployeeScope(User $user): ?Builder
    {
        // Permission-based full access
        if ($user->can('view-all-employees')) {
            return null; // no restrictions
        }

        // Get user's employee record
        if (!$user->employee_id) {
            return Employee::whereRaw('1 = 0'); // Empty result
        }

        $employee = Employee::with(['primaryDesignation.position', 'primaryDesignation.unit.sector'])->find($user->employee_id);
        
        if (!$employee) {
            return Employee::whereRaw('1 = 0');
        }

        // Permission-based sector/unit access
        if ($user->can('view-sector-employees')) {
            return $this->getSectorScope($employee);
        }

        if ($user->can('view-unit-employees')) {
            return $this->getUnitScope($employee);
        }

        // Check based on authority level
        $primaryDesignation = $employee->primaryDesignation;
        if ($primaryDesignation && $primaryDesignation->position) {
            $authorityLevel = $primaryDesignation->position->authority_level 
                ?? $primaryDesignation->position->hierarchy_level 
                ?? 1;
            
            // High authority (8+) - sector scope
            if ($authorityLevel >= 8) {
                return $this->getSectorScope($employee);
            }
            
            // Mid authority (5-7) - unit scope
            if ($authorityLevel >= 5) {
                return $this->getUnitScope($employee);
            }
        }

        // Regular employees: can only view themselves
        return Employee::where('id', $employee->id);
    }

    /**
     * Get scope for sector-level access.
     * Returns all employees with designations in the same sector.
     * 
     * @param Employee $employee
     * @return Builder
     */
    protected function getSectorScope(Employee $employee): Builder
    {
        $sectorId = $employee->primaryDesignation?->unit?->sector_id;

        if (!$sectorId) {
            return Employee::whereRaw('1 = 0');
        }

        // Return employees with designations in units belonging to this sector
        return Employee::whereHas('designations.unit', function ($query) use ($sectorId) {
            $query->where('sector_id', $sectorId);
        });
    }

    /**
     * Get scope for unit-level access.
     * Returns all employees with designations in the same unit or child units.
     * 
     * @param Employee $employee
     * @return Builder
     */
    protected function getUnitScope(Employee $employee): Builder
    {
        $unitId = $employee->primaryDesignation?->unit_id;
        
        if (!$unitId) {
            return Employee::whereRaw('1 = 0');
        }

        // Get the unit and all its child units
        $unitIds = $this->getUnitAndChildIds($unitId);

        // Return all employees with designations in these units
        return Employee::whereHas('designations', function ($query) use ($unitIds) {
            $query->whereIn('unit_id', $unitIds);
        });
    }

    /**
     * Get a unit and all its child unit IDs recursively.
     */
    protected function getUnitAndChildIds(int $unitId): array
    {
        $ids = [$unitId];
        
        // Get direct children
        $children = Unit::where('parent_unit_id', $unitId)->pluck('id')->toArray();
        
        foreach ($children as $childId) {
            $ids = array_merge($ids, $this->getUnitAndChildIds($childId));
        }
        
        return $ids;
    }

    /**
     * Check if a user can view a specific employee.
     * 
     * @param User $user
     * @param Employee $targetEmployee
     * @return bool
     */
    public function canViewEmployee(User $user, Employee $targetEmployee): bool
    {
        $scope = $this->getEmployeeScope($user);
        
        if ($scope === null) {
            return true;
        }

        return $scope->where('id', $targetEmployee->id)->exists();
    }

    /**
     * Get a list of unit IDs that the user can manage.
     * 
     * @param User $user
     * @return array|null Array of unit IDs, or null for all access
     */
    public function getManageableUnitIds(User $user): ?array
    {
        if ($user->can('view-all-employees')) {
            return null; // No restrictions
        }

        if (!$user->employee_id) {
            return [];
        }

        $employee = Employee::with(['primaryDesignation.position', 'primaryDesignation.unit.sector'])->find($user->employee_id);
        
        if (!$employee || !$employee->primaryDesignation) {
            return [];
        }

        $primaryDesignation = $employee->primaryDesignation;
        $position = $primaryDesignation->position;
        $authorityLevel = $position?->authority_level ?? $position?->hierarchy_level ?? 1;

        // High authority (8+) - all units in their sector
        if ($authorityLevel >= 8) {
            $sectorId = $primaryDesignation->unit?->sector_id;
            if ($sectorId) {
                return Unit::where('sector_id', $sectorId)->pluck('id')->toArray();
            }
        }

        // Mid authority (5-7) - their unit and child units
        if ($authorityLevel >= 5) {
            $unitId = $primaryDesignation->unit_id;
            if ($unitId) {
                return $this->getUnitAndChildIds($unitId);
            }
        }

        return [];
    }

    /**
     * Get a list of sector IDs that the user can manage.
     * 
     * @param User $user
     * @return array|null Array of sector IDs, or null for all access
     */
    public function getManageableSectorIds(User $user): ?array
    {
        if ($user->can('view-all-employees')) {
            return null; // No restrictions
        }

        if (!$user->employee_id) {
            return [];
        }

        $employee = Employee::with(['primaryDesignation.position', 'primaryDesignation.unit.sector'])->find($user->employee_id);
        
        if (!$employee || !$employee->primaryDesignation) {
            return [];
        }

        $authorityLevel = $employee->primaryDesignation->position?->authority_level 
            ?? $employee->primaryDesignation->position?->hierarchy_level 
            ?? 1;

        // High authority (8+) - their sector only
        if ($authorityLevel >= 8) {
            $sectorId = $employee->primaryDesignation->unit?->sector_id;
            return $sectorId ? [$sectorId] : [];
        }

        return [];
    }
}
