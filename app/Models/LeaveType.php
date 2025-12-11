<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * LeaveType Model - CSC Compliant
 * 
 * Based on Civil Service Commission (CSC) Omnibus Rules on Leave
 * and CS Form No. 6 (Revised 2020)
 */
class LeaveType extends Model
{
    use HasFactory, SoftDeletes;

    // CSC Leave Type Codes
    public const CODE_VACATION = 'VL';
    public const CODE_SICK = 'SL';
    public const CODE_MANDATORY_FORCED = 'FL';
    public const CODE_SPECIAL_PRIVILEGE = 'SPL';
    public const CODE_SOLO_PARENT = 'SoloP';
    public const CODE_STUDY = 'Study';
    public const CODE_VAWC = 'VAWC';
    public const CODE_REHABILITATION = 'Rehab';
    public const CODE_WOMEN_SPECIAL = 'WSL';
    public const CODE_CALAMITY = 'CL';
    public const CODE_ADOPTION = 'Adopt';
    public const CODE_MATERNITY = 'ML';
    public const CODE_PATERNITY = 'PL';
    public const CODE_TERMINAL = 'TL';

    protected $fillable = [
        'name',
        'code',
        'description',
        'color',
        'requires_approval',
        'requires_medical_certificate',
        'max_days_per_request',
        'max_days_per_year',
        'min_notice_days',
        'can_carry_over',
        'max_carry_over_days',
        'is_paid',
        'is_active',
        'sort_order',
        // CSC-specific fields
        'gender_restriction',
        'uses_credits_from',
        'is_monetizable',
        'is_special_leave',
        'required_document',
        'legal_basis',
        'commutation_applicable',
    ];

    protected $casts = [
        'requires_approval' => 'boolean',
        'requires_medical_certificate' => 'boolean',
        'can_carry_over' => 'boolean',
        'is_paid' => 'boolean',
        'is_active' => 'boolean',
        'is_monetizable' => 'boolean',
        'is_special_leave' => 'boolean',
        'commutation_applicable' => 'boolean',
        'max_days_per_request' => 'integer',
        'max_days_per_year' => 'integer',
        'min_notice_days' => 'integer',
        'max_carry_over_days' => 'integer',
        'sort_order' => 'integer',
    ];

    public function leaveBalances(): HasMany
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function leaveAccruals(): HasMany
    {
        return $this->hasMany(LeaveAccrual::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * Scope for leave types that use credits (VL, SL)
     */
    public function scopeCreditBased($query)
    {
        return $query->whereIn('code', [self::CODE_VACATION, self::CODE_SICK]);
    }

    /**
     * Scope for special leave types (not counted against VL/SL)
     */
    public function scopeSpecialLeave($query)
    {
        return $query->where('is_special_leave', true);
    }

    /**
     * Scope for leave types available to a specific gender
     */
    public function scopeForGender($query, string $gender)
    {
        return $query->where(function ($q) use ($gender) {
            $q->where('gender_restriction', 'all')
              ->orWhere('gender_restriction', strtolower($gender));
        });
    }

    /**
     * Check if this leave type is available for an employee
     */
    public function isAvailableFor(Employee $employee): bool
    {
        if (!$this->is_active) {
            return false;
        }

        // Check gender restriction
        if ($this->gender_restriction !== 'all') {
            $employeeGender = strtolower($employee->sex ?? '');
            if ($this->gender_restriction !== $employeeGender) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if this leave type requires a specific document
     */
    public function requiresDocument(): bool
    {
        return !empty($this->required_document);
    }

    /**
     * Get the leave type that provides credits for this leave
     * (e.g., Forced Leave uses VL credits)
     */
    public function getCreditsSource(): ?self
    {
        if (empty($this->uses_credits_from)) {
            return null;
        }

        return self::where('code', $this->uses_credits_from)->first();
    }

    /**
     * Check if this is vacation leave
     */
    public function isVacationLeave(): bool
    {
        return $this->code === self::CODE_VACATION;
    }

    /**
     * Check if this is sick leave
     */
    public function isSickLeave(): bool
    {
        return $this->code === self::CODE_SICK;
    }

    /**
     * Check if this is a credit-based leave (VL or SL)
     */
    public function isCreditBased(): bool
    {
        return in_array($this->code, [self::CODE_VACATION, self::CODE_SICK]);
    }
}



