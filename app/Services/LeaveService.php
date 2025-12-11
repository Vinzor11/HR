<?php

namespace App\Services;

use App\Models\LeaveBalance;
use App\Models\LeaveCreditsHistory;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Holiday;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * LeaveService - CSC Compliant
 * 
 * Based on Civil Service Commission (CSC) Omnibus Rules on Leave
 * and CS Form No. 6 (Revised 2020)
 * 
 * Key CSC Rules:
 * - VL/SL accrue at 1.25 days per month (15 days/year)
 * - Mandatory/Forced Leave: 5 days from VL for those with 10+ VL credits
 * - Sick leave 5+ days requires medical certificate
 * - VL requires 5 days advance filing; SL can be filed immediately
 */
class LeaveService
{
    // CSC Monthly accrual rate (15 days / 12 months = 1.25 days/month)
    public const MONTHLY_ACCRUAL_RATE = 1.25;
    public const CARRY_OVER_CAP_DAYS = 30; // cap per type (VL/SL)
    public const ACCRUAL_CUTOFF_DAY = 15; // hired before this day accrues
    
    // Forced leave rules (org-configured)
    public const MIN_VL_FOR_FORCED_LEAVE = 25; // trigger when VL balance exceeds this in December
    public const FORCED_LEAVE_DAYS = 5;
    
    // Sick leave proof threshold (>2 consecutive days)
    public const SICK_LEAVE_MEDICAL_CERT_DAYS = 3;
    
    // Minimum remaining VL after a request (org policy)
    public const MIN_REMAINING_VL_AFTER_REQUEST = 5;
    /**
     * Calculate working days between two dates (excluding weekends and holidays)
     */
    public function calculateWorkingDays(Carbon $startDate, Carbon $endDate): float
    {
        $days = 0;
        $current = $startDate->copy();

        while ($current->lte($endDate)) {
            // Skip weekends
            if (!$current->isWeekend()) {
                // Skip holidays
                if (!Holiday::isHoliday($current)) {
                    $days++;
                }
            }
            $current->addDay();
        }

        return $days;
    }

    /**
     * Get leave balance for an employee
     */
    public function getEmployeeBalance(string $employeeId, ?int $year = null): array
    {
        $year = $year ?? now()->year;
        $leaveTypes = LeaveType::active()->ordered()->get();
        $balances = [];

        foreach ($leaveTypes as $leaveType) {
            $balance = LeaveBalance::getOrCreateBalance($employeeId, $leaveType->id, $year);
            $balances[] = [
                'leave_type' => $leaveType,
                'balance' => $balance,
                'available' => $balance->balance,
                'entitled' => $balance->entitled,
                'used' => $balance->used,
                'pending' => $balance->pending,
                'accrued' => $balance->accrued,
            ];
        }

        return $balances;
    }

    /**
     * Check if employee has sufficient leave balance
     */
    public function hasSufficientBalance(string $employeeId, int $leaveTypeId, float $days, int $year = null): bool
    {
        $year = $year ?? now()->year;
        $balance = LeaveBalance::getOrCreateBalance($employeeId, $leaveTypeId, $year);

        return $balance->balance >= $days;
    }

    /**
     * Reserve leave balance (when request is submitted)
     */
    public function reserveBalance(string $employeeId, int $leaveTypeId, float $days, int $year = null): bool
    {
        $year = $year ?? now()->year;
        
        DB::beginTransaction();
        try {
            $balance = LeaveBalance::getOrCreateBalance($employeeId, $leaveTypeId, $year);

            if ($balance->balance < $days) {
                DB::rollBack();
                return false;
            }

            $balance->pending += $days;
            $balance->recalculateBalance();
            
            DB::commit();
            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to reserve leave balance', [
                'employee_id' => $employeeId,
                'leave_type_id' => $leaveTypeId,
                'days' => $days,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Release reserved balance (when request is rejected or cancelled)
     */
    public function releaseBalance(string $employeeId, int $leaveTypeId, float $days, int $year = null): void
    {
        $year = $year ?? now()->year;
        
        DB::beginTransaction();
        try {
            $balance = LeaveBalance::getOrCreateBalance($employeeId, $leaveTypeId, $year);
            $balance->pending = max(0, $balance->pending - $days);
            $balance->recalculateBalance();
            
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to release leave balance', [
                'employee_id' => $employeeId,
                'leave_type_id' => $leaveTypeId,
                'days' => $days,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Deduct leave balance (when request is approved)
     */
    public function deductBalance(string $employeeId, int $leaveTypeId, float $days, int $year = null): void
    {
        $year = $year ?? now()->year;
        
        DB::beginTransaction();
        try {
            $balance = LeaveBalance::getOrCreateBalance($employeeId, $leaveTypeId, $year);
            
            // Move from pending to used
            $balance->pending = max(0, $balance->pending - $days);
            $balance->used += $days;
            $balance->recalculateBalance();
            
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to deduct leave balance', [
                'employee_id' => $employeeId,
                'leave_type_id' => $leaveTypeId,
                'days' => $days,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Add leave accrual
     */
    public function addAccrual(string $employeeId, int $leaveTypeId, float $amount, string $accrualType = 'manual', string $notes = null, int $year = null, int $createdBy = null): void
    {
        $year = $year ?? now()->year;
        $createdBy = $createdBy ?? auth()->id();
        
        DB::beginTransaction();
        try {
            // Create accrual record
            $accrual = \App\Models\LeaveAccrual::create([
                'employee_id' => $employeeId,
                'leave_type_id' => $leaveTypeId,
                'amount' => $amount,
                'accrual_date' => now(),
                'accrual_type' => $accrualType,
                'notes' => $notes,
                'created_by' => $createdBy,
            ]);

            // Update balance
            $balance = LeaveBalance::getOrCreateBalance($employeeId, $leaveTypeId, $year);
            $balance->accrued += $amount;
            $balance->entitled += $amount;
            $balance->recalculateBalance();
            
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to add leave accrual', [
                'employee_id' => $employeeId,
                'leave_type_id' => $leaveTypeId,
                'amount' => $amount,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Get leave requests for calendar view
     */
    public function getLeaveCalendar(Carbon $startDate, Carbon $endDate, ?string $employeeId = null, ?int $departmentId = null): array
    {
        $query = LeaveRequest::with(['employee', 'leaveType', 'requestSubmission'])
            ->approved()
            ->inDateRange($startDate, $endDate);

        if ($employeeId) {
            $query->where('employee_id', $employeeId);
        }

        if ($departmentId) {
            $query->whereHas('employee', function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            });
        }

        return $query->get()->map(function ($request) {
            return [
                'id' => $request->id,
                'employee_id' => $request->employee_id,
                'employee_name' => $request->employee ? trim("{$request->employee->first_name} {$request->employee->surname}") : 'Unknown',
                'leave_type' => $request->leaveType->name,
                'leave_type_id' => $request->leaveType->id,
                'leave_type_code' => $request->leaveType->code,
                'leave_type_color' => $request->leaveType->color,
                'start_date' => $request->start_date->format('Y-m-d'),
                'end_date' => $request->end_date->format('Y-m-d'),
                'days' => $request->days,
                'reference_code' => $request->requestSubmission->reference_code ?? null,
            ];
        })->toArray();
    }

    /**
     * Validate leave request
     */
    public function validateLeaveRequest(string $employeeId, int $leaveTypeId, Carbon $startDate, Carbon $endDate, ?string &$error = null): bool
    {
        $leaveType = LeaveType::findOrFail($leaveTypeId);
        $employee = Employee::findOrFail($employeeId);

        // Check if leave type is available for employee (gender restriction)
        if (!$leaveType->isAvailableFor($employee)) {
            $error = "{$leaveType->name} is not available for this employee";
            return false;
        }

        // Check minimum notice
        $noticeDays = now()->diffInDays($startDate);
        if ($noticeDays < $leaveType->min_notice_days) {
            $error = "Minimum notice of {$leaveType->min_notice_days} days required for {$leaveType->name}";
            return false;
        }

        // Check date range
        if ($endDate->lt($startDate)) {
            $error = 'End date must be after start date';
            return false;
        }

        // Calculate days
        $days = $this->calculateWorkingDays($startDate, $endDate);

        // Check max days per request
        if ($leaveType->max_days_per_request && $days > $leaveType->max_days_per_request) {
            $error = "Maximum {$leaveType->max_days_per_request} days allowed per request for {$leaveType->name}";
            return false;
        }

        // For credit-based leaves (VL, SL), check balance and org policies
        if ($leaveType->isCreditBased() || !$leaveType->is_special_leave) {
            // Check if leave uses credits from another type (e.g., Forced Leave uses VL)
            $sourceType = $leaveType->getCreditsSource() ?? $leaveType;
            
            if (!$this->hasSufficientBalance($employeeId, $sourceType->id, $days)) {
                $balance = LeaveBalance::getCurrentYearBalance($employeeId, $sourceType->id);
                $available = $balance ? $balance->balance : 0;
                $error = "Insufficient {$sourceType->name} balance. Available: {$available} days";
                return false;
            }

            // Enforce minimum remaining VL after request (policy), skip for Forced Leave
            if ($sourceType->code === LeaveType::CODE_VACATION && $leaveType->code !== LeaveType::CODE_MANDATORY_FORCED) {
                $balance = LeaveBalance::getCurrentYearBalance($employeeId, $sourceType->id);
                $available = $balance ? $balance->balance : 0;
                if (($available - $days) < self::MIN_REMAINING_VL_AFTER_REQUEST) {
                    $error = "At least " . self::MIN_REMAINING_VL_AFTER_REQUEST . " VL days must remain after this request.";
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Get leave credits for CS Form No. 6 Section 7
     * Returns VL and SL balances as of filing date
     */
    public function getLeaveCreditsAsOfDate(string $employeeId, ?Carbon $asOfDate = null): array
    {
        $asOfDate = $asOfDate ?? now();
        $year = $asOfDate->year;

        $vlType = LeaveType::where('code', LeaveType::CODE_VACATION)->first();
        $slType = LeaveType::where('code', LeaveType::CODE_SICK)->first();

        $vlBalance = $vlType 
            ? LeaveBalance::getOrCreateBalance($employeeId, $vlType->id, $year)
            : null;
        $slBalance = $slType 
            ? LeaveBalance::getOrCreateBalance($employeeId, $slType->id, $year)
            : null;

        return [
            'vacation_leave' => [
                'total_earned' => $vlBalance?->entitled ?? 0,
                'less_used' => $vlBalance?->used ?? 0,
                'balance' => $vlBalance?->balance ?? 0,
            ],
            'sick_leave' => [
                'total_earned' => $slBalance?->entitled ?? 0,
                'less_used' => $slBalance?->used ?? 0,
                'balance' => $slBalance?->balance ?? 0,
            ],
            'as_of_date' => $asOfDate->format('Y-m-d'),
        ];
    }

    /**
     * Process monthly leave accrual for an employee
     * CSC Rule: VL and SL accrue at 1.25 days per month (with proration/cutoff and caps)
     */
    public function processMonthlyAccrual(string $employeeId, Carbon $month): void
    {
        $employee = Employee::findOrFail($employeeId);
        
        // Only active employees accrue leave
        if ($employee->status !== 'active') {
            return;
        }

        $year = $month->year;
        $accrualDate = $month->copy()->endOfMonth();

        // Skip if hired after this month
        if ($employee->date_hired && $employee->date_hired->gt($accrualDate)) {
            return;
        }

        $hireDate = $employee->date_hired ? $employee->date_hired->copy() : null;
        $isHireMonth = $hireDate && $hireDate->isSameMonth($accrualDate) && $hireDate->isSameYear($accrualDate);
        $eligibleThisMonth = !$hireDate || !$isHireMonth || $hireDate->day < self::ACCRUAL_CUTOFF_DAY;
        $daysInMonth = $accrualDate->daysInMonth;
        $daysEmployed = $hireDate
            ? ($isHireMonth ? $hireDate->diffInDays($accrualDate) + 1 : $daysInMonth)
            : $daysInMonth;
        $proratedRate = $eligibleThisMonth
            ? round(($daysEmployed / $daysInMonth) * self::MONTHLY_ACCRUAL_RATE, 2)
            : 0.0;

        // Accrue VL and SL
        $leaveTypeCodes = [LeaveType::CODE_VACATION, LeaveType::CODE_SICK];
        
        foreach ($leaveTypeCodes as $code) {
            $leaveType = LeaveType::where('code', $code)->first();
            if (!$leaveType) {
                continue;
            }

            if ($proratedRate > 0) {
                $this->addAccrual(
                    $employeeId,
                    $leaveType->id,
                    $proratedRate,
                    'monthly',
                    "Monthly accrual for {$month->format('F Y')} (prorated)",
                    $year,
                    null
                );
            }

            // Enforce carry-over cap
            $balance = LeaveBalance::getOrCreateBalance($employeeId, $leaveType->id, $year);
            $excess = max(0, $balance->balance - self::CARRY_OVER_CAP_DAYS);
            if ($excess > 0) {
                $balance->entitled = max(0, $balance->entitled - $excess);
                $balance->recalculateBalance();
            }

            // Record in credits history after cap
            $this->recordCreditsHistory($employeeId, $leaveType->id, $month);
        }
    }

    /**
     * Record leave credits history for audit trail
     */
    public function recordCreditsHistory(string $employeeId, int $leaveTypeId, Carbon $period): void
    {
        $year = $period->year;
        $balance = LeaveBalance::getOrCreateBalance($employeeId, $leaveTypeId, $year);

        LeaveCreditsHistory::create([
            'employee_id' => $employeeId,
            'leave_type_id' => $leaveTypeId,
            'earned' => $balance->entitled,
            'used' => $balance->used,
            'balance' => $balance->balance,
            'abs_undertime_deduction' => 0, // To be implemented if needed
            'period' => $period->format('F Y'),
            'as_of_date' => $period->endOfMonth(),
        ]);
    }

    /**
     * Check if employee needs to take mandatory/forced leave
     * Org Rule: If VL > threshold in December, must take forced leave
     */
    public function needsForcedLeave(string $employeeId, ?int $year = null): bool
    {
        $year = $year ?? now()->year;
        
        $vlType = LeaveType::where('code', LeaveType::CODE_VACATION)->first();
        if (!$vlType) {
            return false;
        }

        $balance = LeaveBalance::getOrCreateBalance($employeeId, $vlType->id, $year);
        
        // Only evaluate in December
        if (now()->month !== 12) {
            return false;
        }

        return $balance->balance > self::MIN_VL_FOR_FORCED_LEAVE;
    }

    /**
     * Get forced leave status for an employee
     */
    public function getForcedLeaveStatus(string $employeeId, ?int $year = null): array
    {
        $year = $year ?? now()->year;
        
        $flType = LeaveType::where('code', LeaveType::CODE_MANDATORY_FORCED)->first();
        if (!$flType) {
            return [
                'required' => false,
                'days_required' => 0,
                'days_taken' => 0,
                'days_remaining' => 0,
            ];
        }

        $needsForced = $this->needsForcedLeave($employeeId, $year);
        
        // Get forced leave taken this year
        $daysTaken = LeaveRequest::where('employee_id', $employeeId)
            ->where('leave_type_id', $flType->id)
            ->whereYear('start_date', $year)
            ->where('status', 'approved')
            ->sum('days');

        return [
            'required' => $needsForced,
            'days_required' => $needsForced ? self::FORCED_LEAVE_DAYS : 0,
            'days_taken' => (float) $daysTaken,
            'days_remaining' => $needsForced ? max(0, self::FORCED_LEAVE_DAYS - $daysTaken) : 0,
        ];
    }

    /**
     * Check if medical certificate is required for sick leave
     * CSC Rule: SL of 5+ days requires medical certificate
     */
    public function requiresMedicalCertificate(LeaveType $leaveType, float $days): bool
    {
        if ($leaveType->isSickLeave() && $days >= self::SICK_LEAVE_MEDICAL_CERT_DAYS) {
            return true;
        }

        return $leaveType->requires_medical_certificate;
    }

    /**
     * Get available leave types for an employee based on gender and eligibility
     */
    public function getAvailableLeaveTypes(Employee $employee): \Illuminate\Database\Eloquent\Collection
    {
        $gender = strtolower($employee->sex ?? 'all');
        
        return LeaveType::active()
            ->ordered()
            ->where(function ($query) use ($gender) {
                $query->where('gender_restriction', 'all')
                    ->orWhere('gender_restriction', $gender);
            })
            ->get();
    }

    /**
     * Calculate leave monetization value
     * CSC Rule: VL and SL can be monetized upon separation (Terminal Leave)
     */
    public function calculateMonetization(string $employeeId, float $dailyRate): array
    {
        $year = now()->year;
        
        $vlType = LeaveType::where('code', LeaveType::CODE_VACATION)->first();
        $slType = LeaveType::where('code', LeaveType::CODE_SICK)->first();

        $vlBalance = $vlType 
            ? LeaveBalance::getOrCreateBalance($employeeId, $vlType->id, $year)->balance 
            : 0;
        $slBalance = $slType 
            ? LeaveBalance::getOrCreateBalance($employeeId, $slType->id, $year)->balance 
            : 0;

        $totalDays = $vlBalance + $slBalance;
        $totalValue = $totalDays * $dailyRate;

        return [
            'vacation_leave_days' => $vlBalance,
            'sick_leave_days' => $slBalance,
            'total_days' => $totalDays,
            'daily_rate' => $dailyRate,
            'total_value' => $totalValue,
        ];
    }
}

