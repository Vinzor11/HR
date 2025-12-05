<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'entitled',
        'accrued',
        'used',
        'pending',
        'balance',
        'carried_over',
        'year',
    ];

    protected $casts = [
        'entitled' => 'decimal:2',
        'accrued' => 'decimal:2',
        'used' => 'decimal:2',
        'pending' => 'decimal:2',
        'balance' => 'decimal:2',
        'carried_over' => 'decimal:2',
        'year' => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'id');
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }

    /**
     * Recalculate balance based on entitled, used, and pending
     */
    public function recalculateBalance(): void
    {
        $this->balance = $this->entitled - $this->used - $this->pending;
        $this->save();
    }

    /**
     * Get balance for current year
     */
    public static function getCurrentYearBalance(string $employeeId, int $leaveTypeId): ?self
    {
        return self::where('employee_id', $employeeId)
            ->where('leave_type_id', $leaveTypeId)
            ->where('year', now()->year)
            ->first();
    }

    /**
     * Get or create balance for employee and leave type for current year
     */
    public static function getOrCreateBalance(string $employeeId, int $leaveTypeId, int $year = null): self
    {
        $year = $year ?? now()->year;

        return self::firstOrCreate(
            [
                'employee_id' => $employeeId,
                'leave_type_id' => $leaveTypeId,
                'year' => $year,
            ],
            [
                'entitled' => 0,
                'accrued' => 0,
                'used' => 0,
                'pending' => 0,
                'balance' => 0,
                'carried_over' => 0,
            ]
        );
    }
}



