<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class EmployeeAuditLog extends Model
{
    use HasFactory;

    protected $table = 'employee_audit_log';
    protected $primaryKey = 'record_id';
    public $timestamps = false; // Using action_date instead of timestamps

    protected $fillable = [
        'employee_id',
        'reference_number',
        'action_type',
        'field_changed',
        'old_value',
        'new_value',
        'action_date',
        'performed_by',
    ];

    protected static function booted(): void
    {
        static::creating(function (EmployeeAuditLog $log): void {
            if (empty($log->reference_number)) {
                $log->reference_number = self::generateReferenceNumber();
            }
        });
    }

    public static function generateReferenceNumber(): string
    {
        return 'EMP-' . now()->format('Ymd') . '-' . strtoupper(Str::random(5));
    }

    protected $casts = [
        'old_value' => 'array',
        'new_value' => 'array',
        'action_date' => 'datetime',
    ];

    /**
     * Get the employee that owns this audit log.
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'id');
    }

    /**
     * Get formatted action type label
     */
    public function getActionLabelAttribute(): string
    {
        return match($this->action_type) {
            'CREATE' => 'Created',
            'UPDATE' => 'Updated',
            'DELETE' => 'Deleted',
            default => $this->action_type,
        };
    }

    /**
     * Get action icon name
     */
    public function getActionIconAttribute(): string
    {
        return match($this->action_type) {
            'CREATE' => 'Plus',
            'UPDATE' => 'Edit',
            'DELETE' => 'Trash2',
            default => 'FileText',
        };
    }
}

