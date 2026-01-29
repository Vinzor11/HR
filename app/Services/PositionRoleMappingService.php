<?php

namespace App\Services;

use App\Models\Position;
use App\Models\Role;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Service for mapping positions to Spatie roles
 * 
 * Implements Step 7: Roles/permissions map to modules + authority positions
 * 
 * This service helps maintain the relationship between positions and roles,
 * ensuring that employees with certain positions automatically get assigned
 * corresponding roles for RBAC.
 */
class PositionRoleMappingService
{
    /**
     * Get the role name for a position
     * 
     * @param Position $position
     * @return string|null Role name or null if no mapping exists
     */
    public function getRoleForPosition(Position $position): ?string
    {
        // Map position codes to role names
        // This can be customized based on your role naming convention
        $mapping = [
            'UNIV_PRES' => 'university-president',
            'VP_ACAD' => 'vp-academic-affairs',
            'VP_ADMIN' => 'vp-administration',
            'DEAN' => 'dean',
            'ASSO_DEAN' => 'associate-dean',
            'PROG_HEAD' => 'program-head',
            'FACULTY' => 'faculty',
            'COORD' => 'coordinator',
            'DIRECTOR' => 'director',
            'HEAD' => 'head',
            'OFFICER' => 'officer',
            'STAFF' => 'staff',
            'AIDE' => 'administrative-aide',
        ];

        return $mapping[$position->pos_code] ?? $this->generateRoleNameFromPosition($position);
    }

    /**
     * Generate a role name from position code/name
     */
    protected function generateRoleNameFromPosition(Position $position): string
    {
        // Convert position code to role name format
        $roleName = strtolower($position->pos_code ?? $position->pos_name);
        $roleName = str_replace(['_', ' '], '-', $roleName);
        return $roleName;
    }

    /**
     * Sync roles for an employee based on their assignments
     * 
     * @param Employee $employee
     * @return void
     */
    public function syncEmployeeRoles(Employee $employee): void
    {
        if (!$employee->user) {
            return;
        }

        $user = $employee->user;
        $assignments = $employee->assignments()->active()->with('position')->get();

        $roleNames = collect();

        foreach ($assignments as $assignment) {
            $position = $assignment->position;
            if ($position) {
                $roleName = $this->getRoleForPosition($position);
                if ($roleName) {
                    $roleNames->push($roleName);
                }
            }
        }

        // Get or create roles
        $roles = $roleNames->map(function ($roleName) {
            return Role::firstOrCreate(
                ['name' => $roleName, 'guard_name' => 'web'],
                ['label' => ucwords(str_replace('-', ' ', $roleName)), 'is_active' => true]
            );
        });

        // Sync roles to user (remove old position-based roles, add new ones)
        // Keep manually assigned roles that don't come from positions
        $positionBasedRoles = $this->getPositionBasedRoleNames();
        $currentRoles = $user->roles()->whereIn('name', $positionBasedRoles)->get();
        
        // Remove old position-based roles
        $user->roles()->detach($currentRoles->pluck('id')->toArray());
        
        // Add new position-based roles
        $user->roles()->syncWithoutDetaching($roles->pluck('id')->toArray());
    }

    /**
     * Get all role names that are position-based
     */
    protected function getPositionBasedRoleNames(): array
    {
        return [
            'university-president',
            'vp-academic-affairs',
            'vp-administration',
            'dean',
            'associate-dean',
            'program-head',
            'faculty',
            'coordinator',
            'director',
            'head',
            'officer',
            'staff',
            'administrative-aide',
        ];
    }

    /**
     * Sync roles for all employees (useful for migration or bulk update)
     * 
     * @return int Number of employees processed
     */
    public function syncAllEmployeeRoles(): int
    {
        $employees = Employee::whereHas('user')->with('user')->get();
        $count = 0;

        foreach ($employees as $employee) {
            $this->syncEmployeeRoles($employee);
            $count++;
        }

        return $count;
    }

    /**
     * Get employees with a specific position
     * 
     * @param Position $position
     * @return Collection Collection of Employee models
     */
    public function getEmployeesWithPosition(Position $position): Collection
    {
        return Employee::whereHas('assignments', function ($query) use ($position) {
            $query->where('position_id', $position->id)
                ->where('is_primary', true)
                ->active();
        })->get();
    }

    /**
     * Get users with a specific position
     * 
     * @param Position $position
     * @return Collection Collection of User models
     */
    public function getUsersWithPosition(Position $position): Collection
    {
        $employees = $this->getEmployeesWithPosition($position);
        
        return $employees->map(function ($employee) {
            return $employee->user;
        })->filter();
    }
}
