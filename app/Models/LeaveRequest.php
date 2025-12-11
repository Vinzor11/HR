<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;
use App\Models\User;

/**
 * LeaveRequest Model - CS Form No. 6 Compliant
 * 
 * Based on Civil Service Commission (CSC) CS Form No. 6 (Revised 2020)
 * Application for Leave
 */
class LeaveRequest extends Model
{
    use HasFactory;

    // Location options (6.A)
    public const LOCATION_WITHIN_PH = 'within_philippines';
    public const LOCATION_ABROAD = 'abroad';

    // Sick Leave types (6.B)
    public const SICK_IN_HOSPITAL = 'in_hospital';
    public const SICK_OUT_PATIENT = 'out_patient';

    // Study Leave types (6.D)
    public const STUDY_MASTERS = 'completion_masters';
    public const STUDY_BAR_BOARD = 'bar_board_exam';
    public const STUDY_OTHER = 'other';

    // Other Leave types (6.E)
    public const OTHER_MONETIZATION = 'monetization';
    public const OTHER_TERMINAL = 'terminal_leave';
    public const OTHER_OTHER = 'other';

    // Recommendation options
    public const RECOMMEND_APPROVAL = 'approval';
    public const RECOMMEND_DISAPPROVAL = 'disapproval';

    protected $fillable = [
        'request_submission_id',
        'employee_id',
        'leave_type_id',
        'start_date',
        'end_date',
        'days',
        'reason',
        'status',
        'approved_at',
        'approved_by',
        'rejection_reason',
        'rejected_by',
        'rejected_at',
        // CS Form No. 6 - Details of Leave (Section 6)
        'location',
        'location_details',
        'sick_leave_type',
        'illness_description',
        'women_special_illness',
        'study_leave_type',
        'study_leave_details',
        'other_leave_type',
        'other_leave_details',
        // Commutation (Section 5)
        'commutation_requested',
        // Leave Credits (Section 7)
        'vacation_leave_balance',
        'sick_leave_balance',
        // Recommendation (Section 8)
        'recommendation',
        'recommendation_reason',
        'recommended_by',
        'recommended_at',
        'days_with_pay',
        'days_without_pay',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'days' => 'decimal:2',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'recommended_at' => 'datetime',
        'commutation_requested' => 'boolean',
        'vacation_leave_balance' => 'decimal:3',
        'sick_leave_balance' => 'decimal:3',
        'days_with_pay' => 'decimal:2',
        'days_without_pay' => 'decimal:2',
    ];

    public function requestSubmission(): BelongsTo
    {
        return $this->belongsTo(RequestSubmission::class, 'request_submission_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'id');
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function recommender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recommended_by');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeForEmployee($query, string $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    public function scopeInDateRange($query, Carbon $start, Carbon $end)
    {
        return $query->where(function ($q) use ($start, $end) {
            $q->whereBetween('start_date', [$start, $end])
                ->orWhereBetween('end_date', [$start, $end])
                ->orWhere(function ($q2) use ($start, $end) {
                    $q2->where('start_date', '<=', $start)
                        ->where('end_date', '>=', $end);
                });
        });
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    /**
     * Check if commutation was requested
     */
    public function hasCommutationRequested(): bool
    {
        return $this->commutation_requested === true;
    }

    /**
     * Check if this leave requires a medical certificate
     */
    public function requiresMedicalCertificate(): bool
    {
        // Sick leave of 5+ days requires medical certificate
        if ($this->leaveType?->isSickLeave() && $this->days >= 5) {
            return true;
        }

        return $this->leaveType?->requires_medical_certificate ?? false;
    }

    /**
     * Get total days (with pay + without pay)
     */
    public function getTotalDays(): float
    {
        return ($this->days_with_pay ?? 0) + ($this->days_without_pay ?? 0);
    }

    /**
     * Check if leave is abroad
     */
    public function isAbroad(): bool
    {
        return $this->location === self::LOCATION_ABROAD;
    }

    /**
     * Check if this is a hospitalized sick leave
     */
    public function isHospitalized(): bool
    {
        return $this->sick_leave_type === self::SICK_IN_HOSPITAL;
    }

    /**
     * Get the location display text
     */
    public function getLocationDisplayAttribute(): ?string
    {
        if (empty($this->location)) {
            return null;
        }

        $display = $this->location === self::LOCATION_WITHIN_PH
            ? 'Within the Philippines'
            : 'Abroad';

        if ($this->location_details) {
            $display .= ' - ' . $this->location_details;
        }

        return $display;
    }

    /**
     * Get sick leave type display
     */
    public function getSickLeaveDisplayAttribute(): ?string
    {
        if (empty($this->sick_leave_type)) {
            return null;
        }

        $display = $this->sick_leave_type === self::SICK_IN_HOSPITAL
            ? 'In Hospital'
            : 'Out Patient';

        if ($this->illness_description) {
            $display .= ' - ' . $this->illness_description;
        }

        return $display;
    }

    /**
     * Get study leave type display
     */
    public function getStudyLeaveDisplayAttribute(): ?string
    {
        if (empty($this->study_leave_type)) {
            return null;
        }

        $types = [
            self::STUDY_MASTERS => 'Completion of Master\'s Degree',
            self::STUDY_BAR_BOARD => 'BAR/Board Examination Review',
            self::STUDY_OTHER => 'Other Purpose',
        ];

        $display = $types[$this->study_leave_type] ?? $this->study_leave_type;

        if ($this->study_leave_details) {
            $display .= ' - ' . $this->study_leave_details;
        }

        return $display;
    }
}

