<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Training;

class TrainingEligibilityService
{
    /**
     * Check if an employee is eligible for a training based on faculty, department, and position restrictions.
     *
     * @param Training $training The training to check eligibility for
     * @param Employee|null $employee The employee to check eligibility for
     * @return bool True if eligible, false otherwise
     */
    public function isEligible(Training $training, ?Employee $employee): bool
    {
        if (!$employee) {
            return false;
        }

        $training->loadMissing(['allowedFaculties:id', 'allowedDepartments:id', 'allowedPositions:id']);

        $facultyAllowed = $training->allowedFaculties->pluck('id');
        $departmentAllowed = $training->allowedDepartments->pluck('id');
        $positionAllowed = $training->allowedPositions->pluck('id');

        // Check faculty match: if restrictions exist, employee's department or position faculty_id must match
        $employeeFacultyId = $this->getEmployeeFacultyId($employee);

        $facultyMatch = $facultyAllowed->isEmpty() ||
            ($employeeFacultyId && $facultyAllowed->contains($employeeFacultyId));

        // Check department match: if restrictions exist, employee's department_id must match
        // For faculty-level positions (no department), check if employee's faculty matches
        // the faculty of any allowed department
        $departmentMatch = $this->checkDepartmentMatch($employee, $departmentAllowed, $employeeFacultyId);

        // Check position match: if restrictions exist, employee's position_id must match
        $positionMatch = $positionAllowed->isEmpty() ||
            ($employee->position_id && $positionAllowed->contains($employee->position_id));

        // All conditions must pass (AND logic)
        return $facultyMatch && $departmentMatch && $positionMatch;
    }

    /**
     * Get the employee's faculty ID from their department or position.
     *
     * @param Employee $employee
     * @return int|null
     */
    protected function getEmployeeFacultyId(Employee $employee): ?int
    {
        if ($employee->department && $employee->department->faculty_id) {
            return $employee->department->faculty_id;
        }

        if ($employee->position && $employee->position->faculty_id) {
            return $employee->position->faculty_id;
        }

        return null;
    }

    /**
     * Check if employee's department matches training's allowed departments.
     *
     * @param Employee $employee
     * @param \Illuminate\Support\Collection $departmentAllowed
     * @param int|null $employeeFacultyId
     * @return bool
     */
    protected function checkDepartmentMatch(Employee $employee, $departmentAllowed, ?int $employeeFacultyId): bool
    {
        // If no department restrictions, everyone is eligible
        if ($departmentAllowed->isEmpty()) {
            return true;
        }

        // Employee has a department, check if it's in the allowed list
        if ($employee->department_id) {
            return $departmentAllowed->contains($employee->department_id);
        }

        // Employee has no department but has a faculty (faculty-level position)
        // Check if any allowed department belongs to the same faculty
        if ($employeeFacultyId) {
            return Department::whereIn('id', $departmentAllowed->toArray())
                ->where('faculty_id', $employeeFacultyId)
                ->exists();
        }

        // No department and no faculty - not eligible
        return false;
    }

    /**
     * Check if training has available capacity.
     *
     * @param Training $training
     * @return bool True if training has capacity (or no capacity limit), false if full
     */
    public function hasCapacity(Training $training): bool
    {
        // If no capacity is set, assume unlimited
        if ($training->capacity === null) {
            return true;
        }

        // Count approved and signed up applications
        $currentApplications = $training->applications()
            ->whereIn('status', ['Signed Up', 'Approved'])
            ->count();

        return $currentApplications < $training->capacity;
    }

    /**
     * Get the number of available spots in a training.
     *
     * @param Training $training
     * @return int|null Returns null if unlimited, otherwise the number of available spots
     */
    public function getAvailableSpots(Training $training): ?int
    {
        if ($training->capacity === null) {
            return null; // Unlimited
        }

        $currentApplications = $training->applications()
            ->whereIn('status', ['Signed Up', 'Approved'])
            ->count();

        return max(0, $training->capacity - $currentApplications);
    }
}

