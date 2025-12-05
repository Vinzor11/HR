<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Employee;

class RequestApprovalAction extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'submission_id',
        'step_index',
        'approver_id',
        'approver_role_id',
        'approver_position_id',
        'status',
        'notes',
        'acted_at',
        'meta',
    ];

    protected $casts = [
        'acted_at' => 'datetime',
        'meta' => 'array',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(RequestSubmission::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function approverRole(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'approver_role_id');
    }

    public function approverPosition(): BelongsTo
    {
        return $this->belongsTo(Position::class, 'approver_position_id');
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function canUserAct(User $user): bool
    {
        \Log::info('canUserAct - Start', [
            'action_id' => $this->id,
            'action_status' => $this->status,
            'approver_id' => $this->approver_id,
            'approver_role_id' => $this->approver_role_id,
            'approver_position_id' => $this->approver_position_id,
            'user_id' => $user->id,
            'user_employee_id' => $user->employee_id,
        ]);

        if ($this->status !== self::STATUS_PENDING) {
            \Log::warning('canUserAct - Status is not pending', [
                'action_id' => $this->id,
                'status' => $this->status,
            ]);
            return false;
        }

        if ($this->approver_id) {
            $result = $this->approver_id === $user->id;
            \Log::info('canUserAct - Checked approver_id', [
                'action_id' => $this->id,
                'approver_id' => $this->approver_id,
                'user_id' => $user->id,
                'match' => $result,
            ]);
            return $result;
        }

        if ($this->approver_role_id) {
            $roleName = $this->approverRole?->name;
            $result = $roleName ? $user->hasRole($roleName) : false;
            \Log::info('canUserAct - Checked approver_role_id', [
                'action_id' => $this->id,
                'approver_role_id' => $this->approver_role_id,
                'role_name' => $roleName,
                'user_has_role' => $result,
            ]);
            return $result;
        }

        if ($this->approver_position_id) {
            \Log::info('canUserAct - Checking position-based approver', [
                'action_id' => $this->id,
                'approver_position_id' => $this->approver_position_id,
            ]);

            if (!$user->employee_id) {
                \Log::warning('canUserAct - User has no employee_id', [
                    'action_id' => $this->id,
                    'user_id' => $user->id,
                ]);
                return false;
            }
            
            $employee = Employee::with(['department.faculty', 'position'])->find($user->employee_id);
            if (!$employee) {
                \Log::warning('canUserAct - Employee not found', [
                    'action_id' => $this->id,
                    'user_id' => $user->id,
                    'employee_id' => $user->employee_id,
                ]);
                return false;
            }
            
            \Log::info('canUserAct - Employee found', [
                'action_id' => $this->id,
                'employee_id' => $employee->id,
                'employee_position_id' => $employee->position_id,
                'required_position_id' => $this->approver_position_id,
                'employee_department_id' => $employee->department_id,
            ]);
            
            // Check if employee has the position
            if ($employee->position_id !== $this->approver_position_id) {
                \Log::warning('canUserAct - Position mismatch', [
                    'action_id' => $this->id,
                    'employee_position_id' => $employee->position_id,
                    'required_position_id' => $this->approver_position_id,
                ]);
                return false;
            }
            
            // If this position was resolved to a specific user (approver_id is set), 
            // we don't need to check department/faculty matching since it was already validated during resolution
            if ($this->approver_id) {
                // Position was resolved to a user, just check if this is that user
                $result = $this->approver_id === $user->id;
                \Log::info('canUserAct - Position resolved to user, checking approver_id', [
                    'action_id' => $this->id,
                    'approver_id' => $this->approver_id,
                    'user_id' => $user->id,
                    'match' => $result,
                ]);
                return $result;
            }
            
            // For position-based approvers that weren't resolved to users,
            // verify that the approver is in the same faculty/department as the requester
            // Get requester from submission
            $requester = $this->submission->user->employee ?? null;
            if ($requester) {
                $requester->load(['department.faculty', 'position']);
                
                \Log::info('canUserAct - Checking requester context', [
                    'action_id' => $this->id,
                    'requester_department_id' => $requester->department_id,
                    'requester_faculty_id' => $requester->department?->faculty_id ?? $requester->position?->faculty_id,
                    'approver_department_id' => $employee->department_id,
                    'approver_faculty_id' => $employee->department?->faculty_id ?? $employee->position?->faculty_id,
                ]);
                
                // Check if approver's faculty matches requester's faculty
                // Since positions are filtered by training requirements and are unique,
                // we only need to check faculty match, not exact department match
                $requesterFacultyId = $requester->department?->faculty_id ?? $requester->position?->faculty_id;
                $approverFacultyId = $employee->department?->faculty_id ?? $employee->position?->faculty_id;
                
                // If both have faculty IDs, they must match
                if ($requesterFacultyId && $approverFacultyId) {
                    if ($approverFacultyId !== $requesterFacultyId) {
                        \Log::warning('canUserAct - Faculty mismatch', [
                            'action_id' => $this->id,
                            'requester_faculty_id' => $requesterFacultyId,
                            'approver_faculty_id' => $approverFacultyId,
                        ]);
                        return false;
                    }
                    
                    // Faculty matches, allow approval
                    \Log::info('canUserAct - Faculty match, allowing approval', [
                        'action_id' => $this->id,
                        'faculty_id' => $requesterFacultyId,
                    ]);
                    return true;
                }
                
                // If one or both don't have faculty IDs, allow it
                // (positions are already filtered by training requirements)
                \Log::info('canUserAct - No faculty check needed, allowing approval', [
                    'action_id' => $this->id,
                    'requester_faculty_id' => $requesterFacultyId,
                    'approver_faculty_id' => $approverFacultyId,
                ]);
                return true;
            }
            
            // If no requester employee found, allow it (shouldn't happen but be safe)
            \Log::info('canUserAct - No requester employee, allowing approval', ['action_id' => $this->id]);
            return true;
        }

        \Log::warning('canUserAct - No approver type matched', ['action_id' => $this->id]);
        return false;
    }
}
