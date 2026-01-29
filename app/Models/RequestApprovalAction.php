<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'due_at',
        'reminded_at',
        'reminder_count',
        'is_escalated',
        'escalated_at',
        'escalated_from_user_id',
        'delegated_from_user_id',
    ];

    protected $casts = [
        'acted_at' => 'datetime',
        'due_at' => 'datetime',
        'reminded_at' => 'datetime',
        'escalated_at' => 'datetime',
        'is_escalated' => 'boolean',
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

    /**
     * The user this action was escalated from.
     */
    public function escalatedFromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'escalated_from_user_id');
    }

    /**
     * The user this action was delegated from.
     */
    public function delegatedFromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegated_from_user_id');
    }

    /**
     * Comments associated with this approval action.
     */
    public function comments(): HasMany
    {
        return $this->hasMany(ApprovalComment::class, 'approval_action_id');
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope to get overdue approval actions.
     */
    public function scopeOverdue($query)
    {
        return $query->where('status', self::STATUS_PENDING)
            ->whereNotNull('due_at')
            ->where('due_at', '<', now());
    }

    /**
     * Scope to get actions due soon (within specified hours).
     */
    public function scopeDueSoon($query, int $hours = 24)
    {
        return $query->where('status', self::STATUS_PENDING)
            ->whereNotNull('due_at')
            ->where('due_at', '>', now())
            ->where('due_at', '<=', now()->addHours($hours));
    }

    /**
     * Check if this action is overdue.
     */
    public function isOverdue(): bool
    {
        return $this->status === self::STATUS_PENDING 
            && $this->due_at 
            && $this->due_at->isPast();
    }

    /**
     * Check if this action is due soon.
     */
    public function isDueSoon(int $hours = 24): bool
    {
        return $this->status === self::STATUS_PENDING 
            && $this->due_at 
            && $this->due_at->isFuture()
            && $this->due_at->lte(now()->addHours($hours));
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
            
            $employee = Employee::with(['primaryDesignation.unit.sector', 'primaryDesignation.position'])->find($user->employee_id);
            if (!$employee) {
                \Log::warning('canUserAct - Employee not found', [
                    'action_id' => $this->id,
                    'user_id' => $user->id,
                    'employee_id' => $user->employee_id,
                ]);
                return false;
            }
            
            $employeePositionId = $employee->primaryDesignation?->position_id;
            \Log::info('canUserAct - Employee found', [
                'action_id' => $this->id,
                'employee_id' => $employee->id,
                'employee_position_id' => $employeePositionId,
                'required_position_id' => $this->approver_position_id,
                'employee_unit_id' => $employee->primaryDesignation?->unit_id,
            ]);
            
            // Check if employee has the position
            if ($employeePositionId !== $this->approver_position_id) {
                \Log::warning('canUserAct - Position mismatch', [
                    'action_id' => $this->id,
                    'employee_position_id' => $employeePositionId,
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
            // verify that the approver is in the same sector as the requester
            // Get requester from submission
            $requester = $this->submission->user->employee ?? null;
            if ($requester) {
                $requester->load(['primaryDesignation.unit.sector', 'primaryDesignation.position']);
                
                $requesterSectorId = $requester->primaryDesignation?->unit?->sector_id;
                $approverSectorId = $employee->primaryDesignation?->unit?->sector_id;
                
                \Log::info('canUserAct - Checking requester context', [
                    'action_id' => $this->id,
                    'requester_unit_id' => $requester->primaryDesignation?->unit_id,
                    'requester_sector_id' => $requesterSectorId,
                    'approver_unit_id' => $employee->primaryDesignation?->unit_id,
                    'approver_sector_id' => $approverSectorId,
                ]);
                
                // Check if approver's sector matches requester's sector
                // Since positions are filtered by training requirements and are unique,
                // we only need to check sector match
                if ($requesterSectorId && $approverSectorId) {
                    if ($approverSectorId !== $requesterSectorId) {
                        \Log::warning('canUserAct - Sector mismatch', [
                            'action_id' => $this->id,
                            'requester_sector_id' => $requesterSectorId,
                            'approver_sector_id' => $approverSectorId,
                        ]);
                        return false;
                    }
                    
                    \Log::info('canUserAct - Sector match, allowing approval', [
                        'action_id' => $this->id,
                        'sector_id' => $requesterSectorId,
                    ]);
                    return true;
                }
                
                // If one or both don't have sector IDs, allow it
                \Log::info('canUserAct - No sector check needed, allowing approval', [
                    'action_id' => $this->id,
                    'requester_sector_id' => $requesterSectorId,
                    'approver_sector_id' => $approverSectorId,
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
