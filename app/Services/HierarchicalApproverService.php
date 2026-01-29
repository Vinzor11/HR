<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeDesignation;
use App\Models\Position;
use App\Models\User;
use App\Models\Role;
use App\Services\ApprovalRoutingService;
use Illuminate\Support\Collection;

/**
 * Hierarchical Approver Service - Updated for new org structure (Sector/Unit/Position)
 * 
 * Uses authority_level on Position and unit hierarchy for approval routing.
 */
class HierarchicalApproverService
{
    protected ApprovalRoutingService $approvalRoutingService;

    public function __construct(ApprovalRoutingService $approvalRoutingService)
    {
        $this->approvalRoutingService = $approvalRoutingService;
    }

    /**
     * Resolve approver based on hierarchical structure.
     * If approver equals requester, automatically escalate to higher level.
     * 
     * Uses the new org structure: Sector → Unit → Position (authority_level)
     * 
     * @param int|null $approverId The configured approver user ID
     * @param Employee $requester The employee making the request
     * @return int|null Resolved approver user ID, or null if cannot resolve
     */
    public function resolveApprover(?int $approverId, Employee $requester): ?int
    {
        if (!$approverId) {
            return null;
        }

        $approverUser = User::find($approverId);
        if (!$approverUser || !$approverUser->employee_id) {
            return $approverId; // Return original if approver has no employee record
        }

        $approverEmployee = Employee::with(['primaryDesignation.position', 'primaryDesignation.unit.sector'])->find($approverUser->employee_id);
        if (!$approverEmployee) {
            return $approverId; // Return original if approver employee not found
        }

        // Check if approver is the requester
        if ($approverEmployee->id === $requester->id) {
            return $this->escalateToHigherLevel($requester);
        }

        // Load requester's designation
        $requester->load(['primaryDesignation.position', 'primaryDesignation.unit']);
        
        // Check if same authority level (same hierarchy level)
        $requesterPosition = $requester->primaryDesignation?->position;
        $approverPosition = $approverEmployee->primaryDesignation?->position;

        if ($requesterPosition && $approverPosition) {
            $requesterLevel = $requesterPosition->authority_level ?? $requesterPosition->hierarchy_level ?? 1;
            $approverLevel = $approverPosition->authority_level ?? $approverPosition->hierarchy_level ?? 1;
            
            // If same authority level but different positions
            if ($requesterLevel === $approverLevel && $requesterPosition->id !== $approverPosition->id) {
                return $this->escalateToHigherLevel($requester);
            }
        }

        // No escalation needed, return original approver
        return $approverId;
    }

    /**
     * Escalate to higher hierarchy level using new org structure.
     * 
     * Priority:
     * 1. Higher authority_level position in same unit
     * 2. Higher authority_level position in parent unit
     * 3. Sector-wide position with higher authority
     * 4. System-wide position (no sector)
     * 
     * @param Employee $requester
     * @return int|null
     */
    protected function escalateToHigherLevel(Employee $requester): ?int
    {
        $requester->load(['primaryDesignation.position', 'primaryDesignation.unit.sector']);

        $primaryDesignation = $requester->primaryDesignation;
        if (!$primaryDesignation || !$primaryDesignation->position) {
            return null;
        }

        $currentLevel = $primaryDesignation->position->authority_level 
            ?? $primaryDesignation->position->hierarchy_level 
            ?? 1;

        // Use ApprovalRoutingService to find next approver
        $nextApprover = $this->approvalRoutingService->findNextApprover($requester, $currentLevel + 1);
        
        if ($nextApprover) {
            return $nextApprover->id;
        }

        // Cannot resolve, return null
        return null;
    }

    /**
     * Resolve all approvers in an approval step.
     * 
     * @param array $approvers Array of approver configurations
     * @param Employee $requester
     * @param array|null $allowedSectorIds Optional: Training's allowed sector IDs
     * @param array|null $allowedUnitIds Optional: Training's allowed unit IDs
     * @return array Resolved approvers
     */
    public function resolveApprovers(array $approvers, Employee $requester, ?array $allowedSectorIds = null, ?array $allowedUnitIds = null): array
    {
        $requester->load(['primaryDesignation.position', 'primaryDesignation.unit.sector']);
        
        $resolved = collect($approvers)->flatMap(function ($approver) use ($requester, $allowedSectorIds, $allowedUnitIds) {
            $type = data_get($approver, 'approver_type');
            
            if ($type === 'user') {
                $approverId = data_get($approver, 'approver_id');
                $resolvedId = $this->resolveApprover($approverId, $requester);
                
                return [array_merge($approver, [
                    'approver_id' => $resolvedId,
                    'original_approver_id' => $approverId,
                    'was_escalated' => $resolvedId !== $approverId,
                ])];
            }

            // For role-based approvers, resolve to specific users from same unit
            if ($type === 'role') {
                $roleId = data_get($approver, 'approver_role_id');
                if (!$roleId) {
                    return [$approver];
                }

                $resolvedUsers = $this->resolveRoleApprovers($roleId, $requester);
                
                if ($resolvedUsers->isNotEmpty()) {
                    return $resolvedUsers->map(function ($userId) use ($approver, $roleId, $requester) {
                        // Check if the resolved approver is the requester
                        $approverUser = User::find($userId);
                        if ($approverUser && $approverUser->employee_id === $requester->id) {
                            $escalatedUserId = $this->escalateToHigherLevel($requester);
                            if ($escalatedUserId) {
                                return array_merge($approver, [
                                    'approver_type' => 'user',
                                    'approver_id' => $escalatedUserId,
                                    'approver_role_id' => $roleId,
                                    'was_resolved_from_role' => true,
                                    'was_escalated' => true,
                                    'original_approver_id' => $userId,
                                ]);
                            }
                        }
                        
                        return array_merge($approver, [
                            'approver_type' => 'user',
                            'approver_id' => $userId,
                            'approver_role_id' => $roleId,
                            'was_resolved_from_role' => true,
                        ]);
                    })->toArray();
                }
                
                return [$approver];
            }

            // For position-based approvers
            if ($type === 'position') {
                $positionId = data_get($approver, 'approver_position_id');
                if (!$positionId) {
                    return [$approver];
                }

                $resolvedUsers = $this->resolvePositionApprovers($positionId, $requester, $allowedSectorIds, $allowedUnitIds);
                
                if ($resolvedUsers->isNotEmpty()) {
                    $firstUserId = $resolvedUsers->first();
                    
                    // Check if the resolved approver is the requester
                    $approverUser = User::find($firstUserId);
                    if ($approverUser && $approverUser->employee_id === $requester->id) {
                        $escalatedUserId = $this->escalateToHigherLevel($requester);
                        if ($escalatedUserId) {
                            return [array_merge($approver, [
                                'approver_type' => 'user',
                                'approver_id' => $escalatedUserId,
                                'approver_position_id' => $positionId,
                                'was_resolved_from_position' => true,
                                'was_escalated' => true,
                                'original_position_id' => $positionId,
                            ])];
                        }
                    }
                    
                    return [array_merge($approver, [
                        'approver_type' => 'user',
                        'approver_id' => $firstUserId,
                        'approver_position_id' => $positionId,
                        'was_resolved_from_position' => true,
                    ])];
                }
                
                return [$approver];
            }

            // For hierarchical-based approvers using authority_level
            if ($type === 'hierarchical') {
                $minAuthorityLevel = data_get($approver, 'min_authority_level');
                
                $nextApprover = $this->approvalRoutingService->findNextApprover($requester, $minAuthorityLevel);
                
                if ($nextApprover) {
                    return [array_merge($approver, [
                        'approver_type' => 'user',
                        'approver_id' => $nextApprover->id,
                        'was_resolved_from_hierarchical' => true,
                        'resolved_authority_level' => $nextApprover->employee?->primaryDesignation?->position?->authority_level,
                        'resolved_unit' => $nextApprover->employee?->primaryDesignation?->unit?->name,
                    ])];
                }
                
                return [$approver];
            }

            return [$approver];
        });
        
        // Deduplicate approvers
        $seen = [];
        $uniqueApprovers = [];
        
        foreach ($resolved as $approver) {
            $type = data_get($approver, 'approver_type');
            $approverId = data_get($approver, 'approver_id');
            $approverRoleId = data_get($approver, 'approver_role_id');
            $approverPositionId = data_get($approver, 'approver_position_id');
            $minAuthorityLevel = data_get($approver, 'min_authority_level');
            
            $key = $type . '_' . ($approverId ?? '') . '_' . ($approverRoleId ?? '') . '_' . ($approverPositionId ?? '') . '_' . ($minAuthorityLevel ?? '');
            
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $uniqueApprovers[] = $approver;
            }
        }
        
        return $uniqueApprovers;
    }

    /**
     * Resolve role-based approvers to specific users from the same unit as requester.
     */
    protected function resolveRoleApprovers(int $roleId, Employee $requester): Collection
    {
        $role = Role::find($roleId);
        if (!$role) {
            return collect();
        }

        $requester->load(['primaryDesignation.unit.sector']);
        $primaryDesignation = $requester->primaryDesignation;
        
        if (!$primaryDesignation || !$primaryDesignation->unit_id) {
            return collect();
        }

        $unitId = $primaryDesignation->unit_id;
        $sectorId = $primaryDesignation->unit?->sector_id;

        // Find users with the specified role who have a designation in the same unit
        $users = User::whereHas('roles', function ($query) use ($roleId) {
                $query->where('id', $roleId);
            })
            ->whereHas('employee.designations', function ($query) use ($unitId, $requester) {
                $query->where('unit_id', $unitId)
                    ->whereColumn('employee_id', '!=', \DB::raw("'{$requester->id}'"));
            })
            ->get();

        return $users->pluck('id');
    }

    /**
     * Resolve position-based approvers to specific users from the same unit as requester.
     */
    protected function resolvePositionApprovers(int $positionId, Employee $requester, ?array $allowedSectorIds = null, ?array $allowedUnitIds = null): Collection
    {
        $position = Position::find($positionId);
        if (!$position) {
            return collect();
        }

        $requester->load(['primaryDesignation.unit.sector']);
        $primaryDesignation = $requester->primaryDesignation;
        
        if (!$primaryDesignation) {
            return collect();
        }

        $requesterUnitId = $primaryDesignation->unit_id;
        $requesterSectorId = $primaryDesignation->unit?->sector_id;

        // Find employees with the specified position in the same unit
        $designations = EmployeeDesignation::where('position_id', $positionId)
            ->where('unit_id', $requesterUnitId)
            ->where('employee_id', '!=', $requester->id)
            ->whereHas('employee.user')
            ->get();

        return $designations->map(function ($designation) {
            return $designation->employee?->user?->id;
        })->filter()->values();
    }
}
