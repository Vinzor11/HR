<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class UserAuditLog extends Model
{
    use HasFactory;

    protected $table = 'user_audit_log';
    protected $primaryKey = 'record_id';
    public $timestamps = false; // Using action_date instead of timestamps

    protected $fillable = [
        'user_id',
        'reference_number',
        'action_type',
        'field_changed',
        'old_value',
        'new_value',
        'snapshot',
        'action_date',
        'performed_by',
    ];

    protected static function booted(): void
    {
        static::creating(function (UserAuditLog $log): void {
            if (empty($log->reference_number)) {
                $log->reference_number = self::generateReferenceNumber();
            }

            if (empty($log->snapshot) && $log->user_id) {
                $user = User::withTrashed()->find($log->user_id);
                if ($user) {
                    $log->snapshot = $user->toArray(); // hidden fields stay hidden
                }
            }
        });
    }

    public static function generateReferenceNumber(): string
    {
        return 'USR-' . now()->format('Ymd') . '-' . strtoupper(Str::random(5));
    }

    protected $casts = [
        'old_value' => 'array',
        'new_value' => 'array',
        'snapshot' => 'array',
        'action_date' => 'datetime',
    ];

    /**
     * Get the user that owns this audit log.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id')->withTrashed();
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
