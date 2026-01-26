<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\FormatsDates;

/**
 * LeaveCreditsHistory Model
 * 
 * Tracks leave credits history over time as per CS Form No. 6 requirements.
 * Used for Section 7 (Certification of Leave Credits).
 */
class LeaveCreditsHistory extends Model
{
    use HasFactory, FormatsDates;

    protected $table = 'leave_credits_history';

    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'earned',
        'used',
        'balance',
        'abs_undertime_deduction',
        'period',
        'as_of_date',
        'remarks',
    ];

    protected $casts = [
        'earned' => 'decimal:3',
        'used' => 'decimal:3',
        'balance' => 'decimal:3',
        'abs_undertime_deduction' => 'decimal:3',
        'as_of_date' => 'date',
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
     * Scope for a specific employee
     */
    public function scopeForEmployee($query, string $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    /**
     * Scope for a specific leave type
     */
    public function scopeForLeaveType($query, int $leaveTypeId)
    {
        return $query->where('leave_type_id', $leaveTypeId);
    }

    /**
     * Scope for records as of a specific date
     */
    public function scopeAsOfDate($query, $date)
    {
        return $query->where('as_of_date', '<=', $date)
            ->orderBy('as_of_date', 'desc');
    }

    /**
     * Get the latest credit record for an employee and leave type
     */
    public static function getLatest(string $employeeId, int $leaveTypeId): ?self
    {
        return self::forEmployee($employeeId)
            ->forLeaveType($leaveTypeId)
            ->orderBy('as_of_date', 'desc')
            ->first();
    }

    /**
     * Calculate total earned credits
     */
    public function getTotalEarnedAttribute(): float
    {
        return $this->earned - $this->abs_undertime_deduction;
    }
}

