<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\FormatsDates;

class LeaveBalance extends Model
{
    use HasFactory, FormatsDates;

    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'entitled',
        'accrued',
        'used',
        'pending',
        'balance',
        'carried_over',
        'initial_balance',
        'balance_as_of_date',
        'migration_notes',
        'is_manually_set',
        'year',
    ];

    protected $casts = [
        'entitled' => 'decimal:2',
        'accrued' => 'decimal:2',
        'used' => 'decimal:2',
        'pending' => 'decimal:2',
        'balance' => 'decimal:2',
        'carried_over' => 'decimal:2',
        'initial_balance' => 'decimal:2',
        'balance_as_of_date' => 'date',
        'is_manually_set' => 'boolean',
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

    public function accruals(): HasMany
    {
        return $this->hasMany(LeaveAccrual::class, 'employee_id', 'employee_id')
            ->where('leave_type_id', $this->leave_type_id);
    }

    /**
     * Recalculate balance based on entitled, used, and pending
     * Formula: balance = entitled - used - pending
     * Where entitled includes: initial_balance + carried_over + accrued
     */
    public function recalculateBalance(): void
    {
        $this->balance = $this->entitled - $this->used - $this->pending;
        $this->save();
    }

    /**
     * Get the breakdown of how entitled was calculated
     */
    public function getEntitledBreakdownAttribute(): array
    {
        return [
            'initial_balance' => (float) $this->initial_balance,
            'carried_over' => (float) $this->carried_over,
            'accrued' => (float) $this->accrued,
            'total_entitled' => (float) $this->entitled,
        ];
    }

    /**
     * Check if this balance was set manually (migration/adjustment)
     */
    public function wasManuallySet(): bool
    {
        return $this->is_manually_set || $this->initial_balance > 0;
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
     * Automatically carries over unused balance from previous year if applicable
     */
    public static function getOrCreateBalance(string $employeeId, int $leaveTypeId, int $year = null): self
    {
        $year = $year ?? now()->year;

        $balance = self::firstOrCreate(
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
                'initial_balance' => 0,
                'is_manually_set' => false,
            ]
        );

        // If this is a newly created balance, check for carry-over from previous year
        if ($balance->wasRecentlyCreated) {
            $previousYear = $year - 1;
            $previousBalance = self::where('employee_id', $employeeId)
                ->where('leave_type_id', $leaveTypeId)
                ->where('year', $previousYear)
                ->first();

            if ($previousBalance && $previousBalance->balance > 0) {
                $leaveType = \App\Models\LeaveType::find($leaveTypeId);
                
                // Check if this leave type allows carry-over
                if ($leaveType && $leaveType->can_carry_over) {
                    // Apply carry-over cap (30 days per CSC rules, or leave type specific limit)
                    $carryOverCap = $leaveType->max_carry_over_days 
                        ? min($leaveType->max_carry_over_days, \App\Services\LeaveService::CARRY_OVER_CAP_DAYS)
                        : \App\Services\LeaveService::CARRY_OVER_CAP_DAYS;
                    
                    $carryOverAmount = min($previousBalance->balance, $carryOverCap);
                    
                    if ($carryOverAmount > 0) {
                        // Update the new year's balance with carry-over
                        $balance->carried_over = $carryOverAmount;
                        $balance->entitled = $carryOverAmount;
                        $balance->recalculateBalance();

                        // Create accrual record for audit trail
                        \App\Models\LeaveAccrual::create([
                            'employee_id' => $employeeId,
                            'leave_type_id' => $leaveTypeId,
                            'amount' => $carryOverAmount,
                            'accrual_date' => now(),
                            'accrual_type' => \App\Models\LeaveAccrual::TYPE_CARRY_OVER,
                            'notes' => "Carried over from {$previousYear} (balance: {$previousBalance->balance} days, capped at {$carryOverAmount} days)",
                            'effective_date' => \Carbon\Carbon::create($year, 1, 1),
                            'reference_number' => 'CO-' . strtoupper(uniqid()),
                            'created_by' => auth()->id(),
                        ]);

                        \Illuminate\Support\Facades\Log::info('Leave balance carried over', [
                            'employee_id' => $employeeId,
                            'leave_type_id' => $leaveTypeId,
                            'from_year' => $previousYear,
                            'to_year' => $year,
                            'previous_balance' => $previousBalance->balance,
                            'carried_over' => $carryOverAmount,
                        ]);
                    }
                }
            }
        }

        return $balance;
    }

    /**
     * Get all balances for an employee for a specific year
     */
    public static function getEmployeeBalances(string $employeeId, int $year = null): \Illuminate\Database\Eloquent\Collection
    {
        $year = $year ?? now()->year;

        return self::where('employee_id', $employeeId)
            ->where('year', $year)
            ->with('leaveType')
            ->get();
    }
}
