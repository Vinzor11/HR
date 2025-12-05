<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Position;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Collection;

class HierarchicalApproverService
{
    /**
     * Resolve approver based on hierarchical structure.
     * If approver equals requester, automatically escalate to higher level.
     * 
     * Flow: Faculty → Department → Position
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

        $approverEmployee = Employee::with(['position', 'department.faculty'])->find($approverUser->employee_id);
        if (!$approverEmployee) {
            return $approverId; // Return original if approver employee not found
        }

        // Check if approver is the requester
        if ($approverEmployee->id === $requester->id) {
            return $this->escalateToHigherLevel($requester);
        }

        // Check if same position (same hierarchy level, different name)
        if ($requester->position_id && $approverEmployee->position_id) {
            $requesterPosition = Position::find($requester->position_id);
            $approverPosition = Position::find($approverEmployee->position_id);

            if ($requesterPosition && $approverPosition) {
                // If same hierarchy level but different position names
                if ($requesterPosition->hierarchy_level === $approverPosition->hierarchy_level 
                    && $requesterPosition->id !== $approverPosition->id) {
                    return $this->escalateToHigherLevel($requester);
                }
            }
        }

        // No escalation needed, return original approver
        return $approverId;
    }

    /**
     * Escalate to higher hierarchy level.
     * 
     * Priority:
     * 1. Higher position in same department
     * 2. Department head
     * 3. Faculty level (Dean, Associate Dean)
     * 4. Administrative department (if academic)
     * 
     * @param Employee $requester
     * @return int|null
     */
    protected function escalateToHigherLevel(Employee $requester): ?int
    {
        $requester->load(['position', 'department.faculty']);

        if (!$requester->position || !$requester->department) {
            return null;
        }

        $currentLevel = $requester->position->hierarchy_level ?? 1;
        $departmentId = $requester->department_id;
        $facultyId = $requester->department->faculty_id;

        // 1. Try to find higher position in same department
        // First, ensure we're only looking at departments associated with the requester's faculty
        $departmentIds = [];
        if ($facultyId) {
            $departmentIds = Department::where('faculty_id', $facultyId)->pluck('id')->toArray();
        }
        
        // If no faculty or department not in faculty, use the requester's department
        if (empty($departmentIds) || in_array($departmentId, $departmentIds)) {
            $departmentIds = [$departmentId];
        }
        
        $higherPosition = Position::whereIn('department_id', $departmentIds)
            ->where('hierarchy_level', '>', $currentLevel)
            ->orderBy('hierarchy_level', 'asc')
            ->first();

        if ($higherPosition) {
            $higherEmployee = Employee::where('position_id', $higherPosition->id)
                ->where('id', '!=', $requester->id) // Exclude requester
                ->whereHas('user')
                ->first();

            if ($higherEmployee && $higherEmployee->user) {
                return $higherEmployee->user->id;
            }
        }

        // 2. Try department head
        if ($requester->department->head_position_id) {
            $headPosition = Position::find($requester->department->head_position_id);
            if ($headPosition) {
                $headEmployee = Employee::where('position_id', $headPosition->id)
                    ->whereHas('user')
                    ->first();

                if ($headEmployee && $headEmployee->user && $headEmployee->id !== $requester->id) {
                    return $headEmployee->user->id;
                }
            }
        }

        // 3. Try faculty level (Dean, Associate Dean) - hierarchy level 9-10
        if ($facultyId) {
            $facultyPositions = Position::where('faculty_id', $facultyId)
                ->whereIn('hierarchy_level', [9, 10]) // Dean (10), Associate Dean (9)
                ->orderBy('hierarchy_level', 'desc')
                ->get();

            foreach ($facultyPositions as $facultyPosition) {
                $facultyEmployee = Employee::where('position_id', $facultyPosition->id)
                    ->where('id', '!=', $requester->id) // Exclude requester
                    ->whereHas('user')
                    ->first();

                if ($facultyEmployee && $facultyEmployee->user) {
                    return $facultyEmployee->user->id;
                }
            }
        }

        // 4. If academic department, try administrative department
        if ($requester->department->type === 'academic') {
            $adminDepartment = Department::where('type', 'administrative')
                ->whereHas('positions', function ($query) {
                    $query->where('hierarchy_level', '>=', 8); // Department head level or higher
                })
                ->first();

            if ($adminDepartment) {
                $adminPosition = $adminDepartment->positions()
                    ->where('hierarchy_level', '>=', 8)
                    ->orderBy('hierarchy_level', 'desc')
                    ->first();

                if ($adminPosition) {
                    $adminEmployee = Employee::where('position_id', $adminPosition->id)
                        ->where('id', '!=', $requester->id) // Exclude requester
                        ->whereHas('user')
                        ->first();

                    if ($adminEmployee && $adminEmployee->user) {
                        return $adminEmployee->user->id;
                    }
                }
            }
        }

        // Cannot resolve, return null
        return null;
    }

    /**
     * Resolve all approvers in an approval step.
     * 
     * For role-based approvers, filters by requester's faculty and department.
     * For position-based approvers, optionally filters by training's allowed faculties/departments.
     * 
     * @param array $approvers Array of approver configurations
     * @param Employee $requester
     * @param array|null $allowedFacultyIds Optional: Training's allowed faculty IDs for position filtering
     * @param array|null $allowedDepartmentIds Optional: Training's allowed department IDs for position filtering
     * @return array Resolved approvers
     */
    public function resolveApprovers(array $approvers, Employee $requester, ?array $allowedFacultyIds = null, ?array $allowedDepartmentIds = null): array
    {
        $requester->load(['position', 'department.faculty']);
        
        $resolved = collect($approvers)->flatMap(function ($approver) use ($requester, $allowedFacultyIds, $allowedDepartmentIds) {
            $type = data_get($approver, 'approver_type');
            
            if ($type === 'user') {
                $approverId = data_get($approver, 'approver_id');
                
                // Check if approver is the requester
                $approverUser = User::find($approverId);
                if ($approverUser && $approverUser->employee_id === $requester->id) {
                    // Approver is the requester - always escalate
                    if ($this->isRequesterAtMaxHierarchyLevel($requester)) {
                        // At max hierarchy level - assign to faculty-level position
                        $facultyPosition = $this->getFacultyLevelPositionForDepartment($requester);
                        if ($facultyPosition) {
                            return [array_merge($approver, [
                                'approver_type' => 'position',
                                'approver_id' => null,
                                'approver_position_id' => $facultyPosition->id,
                                'was_escalated_to_faculty' => true,
                                'original_approver_id' => $approverId,
                            ])];
                        }
                    }
                    // If not at max hierarchy level or faculty position not found,
                    // resolveApprover will handle escalation to higher level user
                }
                
                $resolvedId = $this->resolveApprover($approverId, $requester);
                
                return [array_merge($approver, [
                    'approver_id' => $resolvedId,
                    'original_approver_id' => $approverId, // Keep original for logging
                    'was_escalated' => $resolvedId !== $approverId,
                ])];
            }

            // For role-based approvers, resolve to specific users from same faculty/department
            if ($type === 'role') {
                $roleId = data_get($approver, 'approver_role_id');
                if (!$roleId) {
                    return [$approver];
                }

                $resolvedUsers = $this->resolveRoleApprovers($roleId, $requester);
                
                // If we found users, convert to user-based approvers
                // If multiple users found, create multiple approver entries
                if ($resolvedUsers->isNotEmpty()) {
                    return $resolvedUsers->map(function ($userId) use ($approver, $roleId, $requester) {
                        // Check if the resolved approver is the requester
                        $approverUser = User::find($userId);
                        if ($approverUser && $approverUser->employee_id === $requester->id) {
                            // Approver is the requester - always escalate
                            if ($this->isRequesterAtMaxHierarchyLevel($requester)) {
                                // At max hierarchy level - assign to faculty-level position
                                $facultyPosition = $this->getFacultyLevelPositionForDepartment($requester);
                                if ($facultyPosition) {
                                    return array_merge($approver, [
                                        'approver_type' => 'position',
                                        'approver_id' => null,
                                        'approver_position_id' => $facultyPosition->id,
                                        'was_escalated_to_faculty' => true,
                                        'original_role_id' => $roleId,
                                    ]);
                                }
                            } else {
                                // Not at max hierarchy level - escalate to higher level user
                                $escalatedUserId = $this->escalateToHigherLevel($requester);
                                if ($escalatedUserId) {
                                    return array_merge($approver, [
                                        'approver_type' => 'user',
                                        'approver_id' => $escalatedUserId,
                                        'approver_role_id' => $roleId, // Keep original role for reference
                                        'was_resolved_from_role' => true,
                                        'was_escalated' => true,
                                        'original_approver_id' => $userId,
                                    ]);
                                }
                            }
                        }
                        
                        return array_merge($approver, [
                            'approver_type' => 'user',
                            'approver_id' => $userId,
                            'approver_role_id' => $roleId, // Keep original role for reference
                            'was_resolved_from_role' => true,
                        ]);
                    })->toArray();
                }
                
                // If no users found, return original role-based approver
                // (will be checked later when user tries to approve)
                return [$approver];
            }

            // For position-based approvers, resolve to the FIRST user found in that position
            // Since positions are filtered by training requirements, each position should be unique
            // We resolve to a specific user to ensure only ONE approval action is created
            if ($type === 'position') {
                $positionId = data_get($approver, 'approver_position_id');
                if (!$positionId) {
                    return [$approver];
                }

                // First, resolve the position to actual users to check if requester is in that position
                $resolvedUsers = $this->resolvePositionApprovers($positionId, $requester, $allowedFacultyIds, $allowedDepartmentIds);
                
                // Take only the FIRST user found (since positions are unique in the filtered context)
                // This ensures only ONE approval action is created per position
                if ($resolvedUsers->isNotEmpty()) {
                    $firstUserId = $resolvedUsers->first();
                    
                    // Check if the resolved approver is the requester
                    $approverUser = User::find($firstUserId);
                    if ($approverUser && $approverUser->employee_id === $requester->id) {
                        // Approver is the requester - always escalate
                        if ($this->isRequesterAtMaxHierarchyLevel($requester)) {
                            // At max hierarchy level - assign to faculty-level position
                            $facultyPosition = $this->getFacultyLevelPositionForDepartment($requester);
                            if ($facultyPosition) {
                                return [array_merge($approver, [
                                    'approver_type' => 'position',
                                    'approver_id' => null,
                                    'approver_position_id' => $facultyPosition->id,
                                    'was_escalated_to_faculty' => true,
                                    'original_position_id' => $positionId,
                                ])];
                            }
                        } else {
                            // Not at max hierarchy level - escalate to higher level user
                            $escalatedUserId = $this->escalateToHigherLevel($requester);
                            if ($escalatedUserId) {
                                return [array_merge($approver, [
                                    'approver_type' => 'user',
                                    'approver_id' => $escalatedUserId,
                                    'approver_position_id' => $positionId, // Keep original position for reference
                                    'was_resolved_from_position' => true,
                                    'was_escalated' => true,
                                    'original_position_id' => $positionId,
                                ])];
                            }
                        }
                    }
                    
                    return [array_merge($approver, [
                        'approver_type' => 'user',
                        'approver_id' => $firstUserId,
                        'approver_position_id' => $positionId, // Keep original position for reference
                        'was_resolved_from_position' => true,
                    ])];
                }
                
                // If no users found, check if position matches requester's position (fallback check)
                // This handles cases where the position might not have been resolved yet
                if ($requester->position_id && (int)$positionId === (int)$requester->position_id) {
                    // Position matches requester's position - always escalate
                    if ($this->isRequesterAtMaxHierarchyLevel($requester)) {
                        // At max hierarchy level - assign to faculty-level position
                        $facultyPosition = $this->getFacultyLevelPositionForDepartment($requester);
                        if ($facultyPosition) {
                            return [array_merge($approver, [
                                'approver_type' => 'position',
                                'approver_id' => null,
                                'approver_position_id' => $facultyPosition->id,
                                'was_escalated_to_faculty' => true,
                                'original_position_id' => $positionId,
                            ])];
                        }
                    } else {
                        // Not at max hierarchy level - escalate to higher level user
                        $escalatedUserId = $this->escalateToHigherLevel($requester);
                        if ($escalatedUserId) {
                            return [array_merge($approver, [
                                'approver_type' => 'user',
                                'approver_id' => $escalatedUserId,
                                'approver_position_id' => $positionId, // Keep original position for reference
                                'was_resolved_from_position' => true,
                                'was_escalated' => true,
                                'original_position_id' => $positionId,
                            ])];
                        }
                    }
                }
                
                // If no users found, return original position-based approver
                // (will be checked later when user tries to approve)
                return [$approver];
            }

            return [$approver];
        });
        
        // Deduplicate approvers based on a unique key
        $seen = [];
        $uniqueApprovers = [];
        
        foreach ($resolved as $approver) {
            $type = data_get($approver, 'approver_type');
            $approverId = data_get($approver, 'approver_id');
            $approverRoleId = data_get($approver, 'approver_role_id');
            $approverPositionId = data_get($approver, 'approver_position_id');
            
            // Create a unique key for this approver
            $key = $type . '_' . ($approverId ?? '') . '_' . ($approverRoleId ?? '') . '_' . ($approverPositionId ?? '');
            
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $uniqueApprovers[] = $approver;
            }
        }
        
        return $uniqueApprovers;
    }

    /**
     * Resolve role-based approvers to specific users from the same faculty/department as requester.
     * 
     * @param int $roleId The role ID to find approvers for
     * @param Employee $requester The employee making the request
     * @return Collection Collection of user IDs
     */
    protected function resolveRoleApprovers(int $roleId, Employee $requester): Collection
    {
        $role = Role::find($roleId);
        if (!$role) {
            return collect();
        }

        $requester->load(['department.faculty']);
        
        if (!$requester->department) {
            return collect();
        }

        $facultyId = $requester->department->faculty_id;
        $departmentId = $requester->department_id;

        // Find users with the specified role who are in the same faculty and department
        // Exclude the requester to avoid self-approval
        $users = User::whereHas('roles', function ($query) use ($roleId) {
                $query->where('id', $roleId);
            })
            ->whereHas('employee', function ($query) use ($facultyId, $departmentId, $requester) {
                $query->where('department_id', $departmentId)
                    ->where('id', '!=', $requester->id); // Exclude requester
                
                // Also check if employee's department belongs to the same faculty
                if ($facultyId) {
                    $query->whereHas('department', function ($q) use ($facultyId) {
                        $q->where('faculty_id', $facultyId);
                    });
                }
            })
            ->get();

        return $users->pluck('id');
    }

    /**
     * Resolve position-based approvers to specific users from the same faculty/department as requester.
     * Optionally filters by training's allowed faculties/departments.
     * 
     * @param int $positionId The position ID to find approvers for
     * @param Employee $requester The employee making the request
     * @param array|null $allowedFacultyIds Optional: Training's allowed faculty IDs
     * @param array|null $allowedDepartmentIds Optional: Training's allowed department IDs
     * @return Collection Collection of user IDs
     */
    protected function resolvePositionApprovers(int $positionId, Employee $requester, ?array $allowedFacultyIds = null, ?array $allowedDepartmentIds = null): Collection
    {
        $position = Position::find($positionId);
        if (!$position) {
            return collect();
        }

        $requester->load(['department.faculty']);
        
        if (!$requester->department) {
            return collect();
        }

        $requesterFacultyId = $requester->department->faculty_id;
        $requesterDepartmentId = $requester->department_id;

        // Check if the position is associated with training's allowed faculties/departments
        $positionMatchesTrainingRestrictions = true;
        if (!empty($allowedFacultyIds) || !empty($allowedDepartmentIds)) {
            $positionMatchesTrainingRestrictions = false;
            
            // Check if position's faculty is in allowed faculties
            if (!empty($allowedFacultyIds) && $position->faculty_id && in_array($position->faculty_id, $allowedFacultyIds)) {
                $positionMatchesTrainingRestrictions = true;
            }
            
            // Check if position's department is in allowed departments
            if (!empty($allowedDepartmentIds) && $position->department_id && in_array($position->department_id, $allowedDepartmentIds)) {
                $positionMatchesTrainingRestrictions = true;
            }
        }

        // If position doesn't match training restrictions, return empty
        if (!$positionMatchesTrainingRestrictions) {
            return collect();
        }

        // Find employees with the specified position in the requester's department
        // Exclude the requester to avoid self-approval
        $employees = Employee::where('position_id', $positionId)
            ->where('department_id', $requesterDepartmentId)
            ->where('id', '!=', $requester->id) // Exclude requester
            ->whereHas('department', function ($query) use ($requesterFacultyId) {
                if ($requesterFacultyId) {
                    $query->where('faculty_id', $requesterFacultyId);
                }
            })
            ->whereHas('user') // Only employees with user accounts
            ->get();

        return $employees->map(function ($employee) {
            return $employee->user?->id;
        })->filter()->values();
    }

    /**
     * Check if the requester is at the maximum hierarchy level in their department.
     * 
     * @param Employee $requester
     * @return bool
     */
    protected function isRequesterAtMaxHierarchyLevel(Employee $requester): bool
    {
        if (!$requester->position || !$requester->department_id) {
            return false;
        }

        $requesterLevel = $requester->position->hierarchy_level ?? 1;
        
        // Find the maximum hierarchy level in the requester's department
        $maxLevel = Position::where('department_id', $requester->department_id)
            ->max('hierarchy_level');
        
        // If no max level found, requester is not at max
        if (!$maxLevel) {
            return false;
        }
        
        // Check if requester's level equals the max level
        return $requesterLevel >= $maxLevel;
    }

    /**
     * Get the faculty-level position for the requester's department's faculty.
     * 
     * @param Employee $requester
     * @return Position|null
     */
    protected function getFacultyLevelPositionForDepartment(Employee $requester): ?Position
    {
        if (!$requester->department || !$requester->department->faculty_id) {
            return null;
        }

        $facultyId = $requester->department->faculty_id;
        
        // Find faculty-level positions (Dean, Associate Dean) for this faculty
        // Order by hierarchy level descending to get highest level first (Dean = 10, Associate Dean = 9)
        $facultyPosition = Position::where('faculty_id', $facultyId)
            ->whereNull('department_id') // Faculty-level positions have no department
            ->whereIn('hierarchy_level', [9, 10]) // Dean (10), Associate Dean (9)
            ->orderBy('hierarchy_level', 'desc')
            ->first();
        
        return $facultyPosition;
    }
}

