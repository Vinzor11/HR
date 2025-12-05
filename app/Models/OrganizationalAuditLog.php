<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class OrganizationalAuditLog extends Model
{
    use HasFactory;

    protected $table = 'organizational_audit_log';
    protected $primaryKey = 'record_id';
    public $timestamps = false; // Using action_date instead of timestamps

    protected $fillable = [
        'unit_type',
        'unit_id',
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
        static::creating(function (OrganizationalAuditLog $log): void {
            if (empty($log->reference_number)) {
                $log->reference_number = self::generateReferenceNumber($log->unit_type);
            }
        });
    }

    public static function generateReferenceNumber(string $unitType): string
    {
        $prefix = match($unitType) {
            'faculty' => 'FAC',
            'department' => 'DEPT',
            'office' => 'OFF',
            'position' => 'POS',
            default => 'ORG',
        };
        
        return $prefix . '-' . now()->format('Ymd') . '-' . strtoupper(Str::random(5));
    }

    protected $casts = [
        'old_value' => 'array',
        'new_value' => 'array',
        'action_date' => 'datetime',
    ];

    /**
     * Get the new_value attribute, handling both strings and arrays.
     * When a string is stored, it gets JSON encoded by the array cast.
     * On retrieval, we decode and return the original string if it was a string.
     */
    public function getNewValueAttribute($value)
    {
        // If null, return null
        if ($value === null) {
            return null;
        }
        
        // The array cast has already decoded JSON from database
        // If it's a string (meaning the original value was a string that got encoded),
        // we need to check if it's a JSON-encoded string
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            // If decode succeeded and result is a string, return it
            if (json_last_error() === JSON_ERROR_NONE && is_string($decoded)) {
                return $decoded;
            }
            // If decode succeeded and result is an array, return it
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
            // Decode failed or not JSON, return original
            return $value;
        }
        
        // If it's already an array (from cast), return as-is
        return $value;
    }

    /**
     * Get the related unit (faculty, department, office, or position)
     */
    public function unit()
    {
        return match($this->unit_type) {
            'faculty' => $this->belongsTo(Faculty::class, 'unit_id'),
            'department' => $this->belongsTo(Department::class, 'unit_id'),
            'office' => $this->belongsTo(Department::class, 'unit_id'), // Offices are departments with type='administrative'
            'position' => $this->belongsTo(Position::class, 'unit_id'),
            default => null,
        };
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
}
