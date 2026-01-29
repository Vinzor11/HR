<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeDesignation;
use App\Models\Position;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Service for routing approvals based on position authority_level and unit hierarchy
 * 
 * Implements Step 8: Approval routing uses positions.authority_level + unit roll-up (program → college)
 */
class ApprovalRoutingService
{
    /**
     * Find the next approver in the hierarchy based on authority_level and unit scope
     * 
     * @param Employee $requester The employee making the request
     * @param int|null $minAuthorityLevel Minimum authority level required (default: requester's level + 1)
     * @return User|null The next approver user, or null if not found
     */
    public function findNextApprover(Employee $requester, ?int $minAuthorityLevel = null): ?User
    {
        $cacheKey = "approval_next:{$requester->id}:" . ($minAuthorityLevel ?? 'auto');
        
        return Cache::remember($cacheKey, 300, function () use ($requester, $minAuthorityLevel) {
            $primaryAssignment = $requester->primaryAssignment;
            
            if (!$primaryAssignment) {
                return null;
            }

            $requesterPosition = $primaryAssignment->position;
            $requesterUnit = $primaryAssignment->unit;
            
            if (!$requesterPosition || !$requesterUnit) {
                return null;
            }

            $currentAuthorityLevel = $requesterPosition->authority_level ?? 1;
            $requiredAuthorityLevel = $minAuthorityLevel ?? ($currentAuthorityLevel + 1);

            // Strategy 1: Find approver in same unit with higher authority level
            $approver = $this->findApproverInUnit($requesterUnit, $requiredAuthorityLevel, $requester);
            if ($approver) {
                return $approver;
            }

            // Strategy 2: Roll up through parent unit hierarchy (multi-level)
            $approver = $this->findApproverInHierarchy($requesterUnit, $requiredAuthorityLevel, $requester);
            if ($approver) {
                return $approver;
            }

            // Strategy 3: Find system-wide position with sufficient authority level
            $approver = $this->findSystemWideApprover($requiredAuthorityLevel, $requester);
            if ($approver) {
                return $approver;
            }

            // Strategy 4: Find approver in same sector with higher authority level
            $sector = $requesterUnit->sector;
            if ($sector) {
                $approver = $this->findApproverInSector($sector, $requiredAuthorityLevel, $requester);
                if ($approver) {
                    return $approver;
                }
            }

            return null;
        });
    }

    /**
     * Find all potential approvers for a given authority level and unit scope
     * 
     * @param Employee $requester The employee making the request
     * @param int|null $minAuthorityLevel Minimum authority level required
     * @return Collection Collection of User models
     */
    public function findApprovers(Employee $requester, ?int $minAuthorityLevel = null): Collection
    {
        $primaryAssignment = $requester->primaryAssignment;
        
        if (!$primaryAssignment) {
            return collect();
        }

        $requesterPosition = $primaryAssignment->position;
        $requesterUnit = $primaryAssignment->unit;
        
        if (!$requesterPosition || !$requesterUnit) {
            return collect();
        }

        $currentAuthorityLevel = $requesterPosition->authority_level ?? 1;
        $requiredAuthorityLevel = $minAuthorityLevel ?? ($currentAuthorityLevel + 1);

        $approvers = collect();

        // Strategy 1: Approvers in same unit
        $unitApprovers = $this->findApproversInUnit($requesterUnit, $requiredAuthorityLevel, $requester);
        $approvers = $approvers->merge($unitApprovers);

        // Strategy 2: Roll up through parent unit hierarchy (multi-level)
        $parentApprovers = $this->findApproversInHierarchy($requesterUnit, $requiredAuthorityLevel, $requester);
        $approvers = $approvers->merge($parentApprovers);

        // Strategy 3: System-wide approvers
        $systemApprovers = $this->findSystemWideApprovers($requiredAuthorityLevel, $requester);
        $approvers = $approvers->merge($systemApprovers);

        // Strategy 4: Sector-wide approvers
        $sector = $requesterUnit->sector;
        if ($sector) {
            $sectorApprovers = $this->findApproversInSector($sector, $requiredAuthorityLevel, $requester);
            $approvers = $approvers->merge($sectorApprovers);
        }

        return $approvers->unique('id');
    }

    /**
     * Find approver in unit hierarchy by recursively rolling up through parent units
     */
    protected function findApproverInHierarchy(Unit $unit, int $minPowerLevel, Employee $excludeEmployee): ?User
    {
        $currentUnit = $unit->parentUnit;
        
        while ($currentUnit) {
            $approver = $this->findApproverInUnit($currentUnit, $minPowerLevel, $excludeEmployee);
            if ($approver) {
                return $approver;
            }
            $currentUnit = $currentUnit->parentUnit;
        }
        
        return null;
    }

    /**
     * Find approver in a specific unit with required authority level
     */
    protected function findApproverInUnit(Unit $unit, int $minAuthorityLevel, Employee $excludeEmployee): ?User
    {
        $designation = EmployeeDesignation::where('unit_id', $unit->id)
            ->where('is_primary', true)
            ->active()
            ->whereHas('position', function ($query) use ($minAuthorityLevel) {
                $query->where('authority_level', '>=', $minAuthorityLevel);
            })
            ->whereHas('employee', function ($query) use ($excludeEmployee) {
                $query->where('id', '!=', $excludeEmployee->id)
                    ->whereHas('user');
            })
            ->with(['employee.user', 'position'])
            ->get()
            ->sortBy(function ($d) {
                return $d->position->authority_level ?? 999;
            })
            ->first();

        return $designation?->employee?->user;
    }

    /**
     * Find all approvers in unit hierarchy by recursively rolling up through parent units
     */
    protected function findApproversInHierarchy(Unit $unit, int $minAuthorityLevel, Employee $excludeEmployee): Collection
    {
        $approvers = collect();
        $currentUnit = $unit->parentUnit;
        
        while ($currentUnit) {
            $unitApprovers = $this->findApproversInUnit($currentUnit, $minAuthorityLevel, $excludeEmployee);
            $approvers = $approvers->merge($unitApprovers);
            $currentUnit = $currentUnit->parentUnit;
        }
        
        return $approvers;
    }

    /**
     * Find all approvers in a specific unit with required authority level
     */
    protected function findApproversInUnit(Unit $unit, int $minAuthorityLevel, Employee $excludeEmployee): Collection
    {
        $designations = EmployeeDesignation::where('unit_id', $unit->id)
            ->where('is_primary', true)
            ->active()
            ->whereHas('position', function ($query) use ($minAuthorityLevel) {
                $query->where('authority_level', '>=', $minAuthorityLevel);
            })
            ->whereHas('employee', function ($query) use ($excludeEmployee) {
                $query->where('id', '!=', $excludeEmployee->id)
                    ->whereHas('user');
            })
            ->with(['employee.user', 'position'])
            ->get();

        return $designations->map(function ($designation) {
            return $designation->employee->user;
        })->filter();
    }

    /**
     * Find system-wide approver (position with sector_id = null)
     */
    protected function findSystemWideApprover(int $minAuthorityLevel, Employee $excludeEmployee): ?User
    {
        $designation = EmployeeDesignation::whereHas('position', function ($query) use ($minAuthorityLevel) {
                $query->whereNull('sector_id')
                    ->where('authority_level', '>=', $minAuthorityLevel);
            })
            ->where('is_primary', true)
            ->active()
            ->whereHas('employee', function ($query) use ($excludeEmployee) {
                $query->where('id', '!=', $excludeEmployee->id)
                    ->whereHas('user');
            })
            ->with(['employee.user', 'position'])
            ->get()
            ->sortBy(function ($d) {
                return $d->position->authority_level ?? 999;
            })
            ->first();

        return $designation?->employee?->user;
    }

    /**
     * Find all system-wide approvers
     */
    protected function findSystemWideApprovers(int $minAuthorityLevel, Employee $excludeEmployee): Collection
    {
        $designations = EmployeeDesignation::whereHas('position', function ($query) use ($minAuthorityLevel) {
                $query->whereNull('sector_id')
                    ->where('authority_level', '>=', $minAuthorityLevel);
            })
            ->where('is_primary', true)
            ->active()
            ->whereHas('employee', function ($query) use ($excludeEmployee) {
                $query->where('id', '!=', $excludeEmployee->id)
                    ->whereHas('user');
            })
            ->with(['employee.user', 'position'])
            ->get();

        return $designations->map(function ($designation) {
            return $designation->employee->user;
        })->filter();
    }

    /**
     * Find approver in same sector with required authority level
     */
    protected function findApproverInSector($sector, int $minAuthorityLevel, Employee $excludeEmployee): ?User
    {
        $designation = EmployeeDesignation::whereHas('unit', function ($query) use ($sector) {
                $query->where('sector_id', $sector->id);
            })
            ->whereHas('position', function ($query) use ($minAuthorityLevel) {
                $query->where('authority_level', '>=', $minAuthorityLevel);
            })
            ->where('is_primary', true)
            ->active()
            ->whereHas('employee', function ($query) use ($excludeEmployee) {
                $query->where('id', '!=', $excludeEmployee->id)
                    ->whereHas('user');
            })
            ->with(['employee.user', 'position'])
            ->get()
            ->sortBy(function ($d) {
                return $d->position->authority_level ?? 999;
            })
            ->first();

        return $designation?->employee?->user;
    }

    /**
     * Find all approvers in same sector
     */
    protected function findApproversInSector($sector, int $minAuthorityLevel, Employee $excludeEmployee): Collection
    {
        $designations = EmployeeDesignation::whereHas('unit', function ($query) use ($sector) {
                $query->where('sector_id', $sector->id);
            })
            ->whereHas('position', function ($query) use ($minAuthorityLevel) {
                $query->where('authority_level', '>=', $minAuthorityLevel);
            })
            ->where('is_primary', true)
            ->active()
            ->whereHas('employee', function ($query) use ($excludeEmployee) {
                $query->where('id', '!=', $excludeEmployee->id)
                    ->whereHas('user');
            })
            ->with(['employee.user', 'position'])
            ->get();

        return $designations->map(function ($designation) {
            return $designation->employee->user;
        })->filter();
    }

    /**
     * Get the approval chain for a requester (all potential approvers in order)
     * 
     * @param Employee $requester
     * @return Collection Collection of User models ordered by authority level
     */
    public function getApprovalChain(Employee $requester): Collection
    {
        $primaryAssignment = $requester->primaryAssignment;
        
        if (!$primaryAssignment) {
            return collect();
        }

        $requesterPosition = $primaryAssignment->position;
        $currentAuthorityLevel = $requesterPosition->authority_level ?? 1;

        // Get all approvers with authority level higher than requester
        $approvers = $this->findApprovers($requester, $currentAuthorityLevel + 1);

        // Sort by authority level (ascending = lower to higher authority)
        return $approvers->sortBy(function ($user) {
            $assignment = $user->employee->primaryAssignment ?? null;
            $position = $assignment?->position;
            return $position?->authority_level ?? 0;
        })->values();
    }
}
