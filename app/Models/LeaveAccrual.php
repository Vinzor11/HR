<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\FormatsDates;

class LeaveAccrual extends Model
{
    use HasFactory, FormatsDates;

    // Accrual type constants for better code organization
    public const TYPE_ANNUAL = 'annual';
    public const TYPE_MONTHLY = 'monthly';
    public const TYPE_MANUAL = 'manual';
    public const TYPE_INITIAL_MIGRATION = 'initial_migration';
    public const TYPE_SPECIAL_GRANT = 'special_grant';
    public const TYPE_CORRECTION = 'correction';
    public const TYPE_CARRY_OVER = 'carry_over';
    public const TYPE_FORFEITED = 'forfeited';
    public const TYPE_RESTORED = 'restored';
    public const TYPE_ADJUSTMENT = 'adjustment';

    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'amount',
        'accrual_date',
        'accrual_type',
        'notes',
        'supporting_document',
        'reference_number',
        'effective_date',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'accrual_date' => 'date',
        'effective_date' => 'date',
    ];

    /**
     * Get all available accrual types
     */
    public static function getAccrualTypes(): array
    {
        return [
            self::TYPE_ANNUAL => 'Annual Entitlement',
            self::TYPE_MONTHLY => 'Monthly Accrual',
            self::TYPE_MANUAL => 'Manual Adjustment',
            self::TYPE_INITIAL_MIGRATION => 'Initial Balance (Migration)',
            self::TYPE_SPECIAL_GRANT => 'Special Leave Grant',
            self::TYPE_CORRECTION => 'Correction',
            self::TYPE_CARRY_OVER => 'Carry Over from Previous Year',
            self::TYPE_FORFEITED => 'Forfeited Credits',
            self::TYPE_RESTORED => 'Restored Credits',
            self::TYPE_ADJUSTMENT => 'Balance Adjustment',
        ];
    }

    /**
     * Get human-readable accrual type label
     */
    public function getAccrualTypeLabelAttribute(): string
    {
        return self::getAccrualTypes()[$this->accrual_type] ?? ucfirst(str_replace('_', ' ', $this->accrual_type));
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'id');
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeForYear($query, int $year)
    {
        return $query->whereYear('accrual_date', $year);
    }

    public function scopeForEmployee($query, string $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    public function scopeForLeaveType($query, int $leaveTypeId)
    {
        return $query->where('leave_type_id', $leaveTypeId);
    }

    public function scopeOfType($query, string $accrualType)
    {
        return $query->where('accrual_type', $accrualType);
    }

    /**
     * Scope for migration/initial balance entries
     */
    public function scopeMigrationEntries($query)
    {
        return $query->where('accrual_type', self::TYPE_INITIAL_MIGRATION);
    }

    /**
     * Scope for special leave grants
     */
    public function scopeSpecialGrants($query)
    {
        return $query->where('accrual_type', self::TYPE_SPECIAL_GRANT);
    }

    /**
     * Check if this is a deduction (negative amount)
     */
    public function isDeduction(): bool
    {
        return $this->amount < 0;
    }

    /**
     * Check if this is a migration entry
     */
    public function isMigrationEntry(): bool
    {
        return $this->accrual_type === self::TYPE_INITIAL_MIGRATION;
    }

    /**
     * Check if this is a special grant
     */
    public function isSpecialGrant(): bool
    {
        return $this->accrual_type === self::TYPE_SPECIAL_GRANT;
    }
}
