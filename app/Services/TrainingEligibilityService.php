<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Training;
use App\Models\Unit;

/**
 * Training Eligibility Service - Updated for new org structure (Sector/Unit/Position)
 */
class TrainingEligibilityService
{
    /**
     * Check if an employee is eligible for a training based on sector, unit, and position restrictions.
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

        // Load training restrictions - try new structure first, fall back to legacy
        $training->loadMissing(['allowedSectors:id', 'allowedUnits:id', 'allowedPositions:id']);

        // Get employee's primary designation
        $employee->load(['primaryDesignation.unit.sector', 'primaryDesignation.position']);
        $primaryDesignation = $employee->primaryDesignation;

        // If employee has no designation, check if there are any restrictions
        if (!$primaryDesignation) {
            // No designation = not eligible if there are any restrictions
            $hasSectorRestrictions = method_exists($training, 'allowedSectors') && $training->allowedSectors->isNotEmpty();
            $hasUnitRestrictions = method_exists($training, 'allowedUnits') && $training->allowedUnits->isNotEmpty();
            $hasPositionRestrictions = $training->allowedPositions->isNotEmpty();
            
            return !$hasSectorRestrictions && !$hasUnitRestrictions && !$hasPositionRestrictions;
        }

        // Check sector match (if training has sector restrictions)
        $sectorMatch = true;
        if (method_exists($training, 'allowedSectors') && $training->allowedSectors->isNotEmpty()) {
            $employeeSectorId = $primaryDesignation->unit?->sector_id;
            $sectorMatch = $employeeSectorId && $training->allowedSectors->pluck('id')->contains($employeeSectorId);
        }

        // Check unit match (if training has unit restrictions)
        $unitMatch = true;
        if (method_exists($training, 'allowedUnits') && $training->allowedUnits->isNotEmpty()) {
            $employeeUnitId = $primaryDesignation->unit_id;
            $unitMatch = $employeeUnitId && $training->allowedUnits->pluck('id')->contains($employeeUnitId);
        }

        // Check position match (if training has position restrictions)
        $positionMatch = true;
        if ($training->allowedPositions->isNotEmpty()) {
            $employeePositionId = $primaryDesignation->position_id;
            $positionMatch = $employeePositionId && $training->allowedPositions->pluck('id')->contains($employeePositionId);
        }

        // All conditions must pass (AND logic)
        return $sectorMatch && $unitMatch && $positionMatch;
    }

    /**
     * Check if training has available capacity.
     *
     * @param Training $training
     * @return bool True if training has capacity (or no capacity limit), false if full
     */
    public function hasCapacity(Training $training): bool
    {
        if ($training->capacity === null) {
            return true;
        }

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
            return null;
        }

        $currentApplications = $training->applications()
            ->whereIn('status', ['Signed Up', 'Approved'])
            ->count();

        return max(0, $training->capacity - $currentApplications);
    }
}
