<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\User;
use App\Models\Department;
use App\Models\Position;
use Illuminate\Database\Eloquent\Builder;

class EmployeeScopeService
{
    /**
     * Get the scope query for employees that the current user can view.
     * 
     * Logic:
     * - Super Admin/Admin: Can view all employees
     * - Dean (hierarchy_level 9-10): Can view all employees in their faculty
     * - Department Head (hierarchy_level 8): Can view all employees in their department
     * - Others: Can only view themselves
     * 
     * @param User $user The authenticated user
     * @return Builder|null Returns a query builder with scoped conditions, or null for all access
     */
    public function getEmployeeScope(User $user): ?Builder
    {
        // Super Admin and Admin can see all
        if ($user->hasRole(['super-admin', 'admin'])) {
            return null; // null means no restrictions
        }

        // Get user's employee record
        if (!$user->employee_id) {
            // User has no employee record, can only see themselves (which they don't have)
            return Employee::whereRaw('1 = 0'); // Empty result
        }

        $employee = Employee::with(['position', 'department.faculty'])->find($user->employee_id);
        
        if (!$employee || !$employee->position) {
            // Employee or position not found, no access
            return Employee::whereRaw('1 = 0');
        }

        $position = $employee->position;
        $hierarchyLevel = $position->hierarchy_level ?? 1;

        // Dean (hierarchy_level 9-10): Can view all employees in their faculty
        if ($hierarchyLevel >= 9 && $hierarchyLevel <= 10) {
            return $this->getFacultyScope($employee);
        }

        // Department Head (hierarchy_level 8): Can view all employees in their department
        if ($hierarchyLevel === 8) {
            return $this->getDepartmentScope($employee);
        }

        // Check if user is actually a department head via department.head_position_id
        if ($employee->department_id) {
            $department = Department::find($employee->department_id);
            if ($department && $department->head_position_id === $employee->position_id) {
                return $this->getDepartmentScope($employee);
            }
        }

        // Regular employees: can only view themselves
        return Employee::where('id', $employee->id);
    }

    /**
     * Get scope for faculty-level access (Dean, Associate Dean).
     * Returns all employees in the same faculty (ACADEMIC departments only).
     * 
     * Note: Deans can only view employees in ACADEMIC departments.
     * Administrative departments are not under faculty management.
     * 
     * @param Employee $employee
     * @return Builder
     */
    protected function getFacultyScope(Employee $employee): Builder
    {
        $facultyId = null;

        // Get faculty ID from employee's department or position
        if ($employee->department && $employee->department->faculty_id) {
            $facultyId = $employee->department->faculty_id;
        } elseif ($employee->position && $employee->position->faculty_id) {
            $facultyId = $employee->position->faculty_id;
        }

        if (!$facultyId) {
            // No faculty found (could be administrative), return empty
            return Employee::whereRaw('1 = 0');
        }

        // Return employees in ACADEMIC departments that belong to this faculty
        // OR employees with faculty-level positions in this faculty
        // Note: Administrative departments (type='administrative') are excluded
        return Employee::where(function ($query) use ($facultyId) {
            $query->whereHas('department', function ($q) use ($facultyId) {
                $q->where('faculty_id', $facultyId)
                  ->where('type', 'academic'); // Only academic departments
            })->orWhereHas('position', function ($q) use ($facultyId) {
                $q->where('faculty_id', $facultyId)
                  ->whereNull('department_id'); // Faculty-level positions
            });
        });
    }

    /**
     * Get scope for department-level access (Department Head).
     * Returns all employees in the same department.
     * 
     * Works for BOTH academic and administrative departments.
     * 
     * @param Employee $employee
     * @return Builder
     */
    protected function getDepartmentScope(Employee $employee): Builder
    {
        if (!$employee->department_id) {
            // Employee has no department, return empty
            return Employee::whereRaw('1 = 0');
        }

        // Return all employees in the same department
        // This works for both academic and administrative departments
        return Employee::where('department_id', $employee->department_id);
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
            // No restrictions (super admin/admin)
            return true;
        }

        // Check if target employee is in the scope
        return $scope->where('id', $targetEmployee->id)->exists();
    }

    /**
     * Get a list of department IDs that the user can manage.
     * 
     * @param User $user
     * @return array Array of department IDs
     */
    public function getManageableDepartmentIds(User $user): ?array
    {
        if ($user->hasRole(['super-admin', 'admin'])) {
            // Return null to indicate no restrictions (all departments)
            return null;
        }

        if (!$user->employee_id) {
            return [];
        }

        $employee = Employee::with(['position', 'department.faculty'])->find($user->employee_id);
        
        if (!$employee || !$employee->position) {
            return [];
        }

        $position = $employee->position;
        $hierarchyLevel = $position->hierarchy_level ?? 1;

        // Dean: All ACADEMIC departments in their faculty (administrative departments excluded)
        if ($hierarchyLevel >= 9 && $hierarchyLevel <= 10) {
            $facultyId = $employee->department?->faculty_id ?? $employee->position->faculty_id;
            if ($facultyId) {
                return Department::where('faculty_id', $facultyId)
                    ->where('type', 'academic') // Only academic departments
                    ->pluck('id')
                    ->toArray();
            }
        }

        // Department Head: Only their department
        if ($hierarchyLevel === 8 || 
            ($employee->department_id && 
             $employee->department?->head_position_id === $employee->position_id)) {
            return $employee->department_id ? [$employee->department_id] : [];
        }

        return [];
    }

    /**
     * Get a list of faculty IDs that the user can manage.
     * 
     * @param User $user
     * @return array Array of faculty IDs
     */
    public function getManageableFacultyIds(User $user): ?array
    {
        if ($user->hasRole(['super-admin', 'admin'])) {
            // Return null to indicate no restrictions (all faculties)
            return null;
        }

        if (!$user->employee_id) {
            return [];
        }

        $employee = Employee::with(['position', 'department.faculty'])->find($user->employee_id);
        
        if (!$employee || !$employee->position) {
            return [];
        }

        $position = $employee->position;
        $hierarchyLevel = $position->hierarchy_level ?? 1;

        // Dean: Their faculty only
        if ($hierarchyLevel >= 9 && $hierarchyLevel <= 10) {
            $facultyId = $employee->department?->faculty_id ?? $employee->position->faculty_id;
            return $facultyId ? [$facultyId] : [];
        }

        return [];
    }
}

