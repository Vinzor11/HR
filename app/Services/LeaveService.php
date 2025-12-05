<?php

namespace App\Services;

use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Holiday;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LeaveService
{
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

        // Check balance
        if (!$this->hasSufficientBalance($employeeId, $leaveTypeId, $days)) {
            $balance = LeaveBalance::getCurrentYearBalance($employeeId, $leaveTypeId);
            $error = "Insufficient leave balance. Available: {$balance->balance} days";
            return false;
        }

        return true;
    }
}

