<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AuditLog extends Model
{
    use HasFactory;

    protected $table = 'audit_logs';
    // Primary key is 'id' (standard Laravel convention)
    public $timestamps = false; // Using created_at instead of timestamps

    protected $fillable = [
        'user_id',
        'performed_by',
        'action',
        'module',
        'entity_type',
        'entity_id',
        'description',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
        'reference_number',
        'snapshot',
        'created_at',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'snapshot' => 'array',
        'created_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (AuditLog $log): void {
            // Generate reference number if not provided
            if (empty($log->reference_number)) {
                $log->reference_number = self::generateReferenceNumber($log->module);
            }

            // Capture user agent if not provided
            if (empty($log->user_agent)) {
                $log->user_agent = request()->userAgent();
            }

            // Set created_at if not provided
            if (empty($log->created_at)) {
                $log->created_at = now();
            }

            // Capture user_id from auth if not provided
            if (empty($log->user_id) && auth()->check()) {
                $log->user_id = auth()->id();
            }

            // Store performer name at creation so it persists after user deletion
            if (empty($log->performed_by)) {
                $log->performed_by = auth()->user()?->name ?? 'System';
            }
        });
    }

    public static function generateReferenceNumber(string $module): string
    {
        $prefix = match(strtolower($module)) {
            'employees' => 'EMP',
            'users' => 'USR',
            'requests' => 'REQ',
            'trainings' => 'TRG',
            'faculties' => 'FAC',
            'departments' => 'DEPT',
            'offices' => 'OFF',
            'positions' => 'POS',
            'roles' => 'ROL',
            'permissions' => 'PERM',
            'request-types' => 'RTYP',
            'request_types' => 'RTYP',
            'organizational' => 'ORG',
            'settings' => 'SET',
            'auth' => 'AUTH',
            'certificates' => 'CERT',
            'certificate-templates' => 'CTMPL',
            'leaves' => 'LEV',
            'holidays' => 'HOL',
            default => 'AUD',
        };
        
        return $prefix . '-' . now()->format('Ymd') . '-' . strtoupper(Str::random(5));
    }

    /**
     * Get the user who performed the action
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id')->withTrashed();
    }

    /**
     * Get formatted action label
     */
    public function getActionLabelAttribute(): string
    {
        return match(strtolower($this->action)) {
            'created' => 'Created',
            'updated' => 'Updated',
            'deleted' => 'Deleted',
            'viewed' => 'Viewed',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            'restored' => 'Restored',
            'exported' => 'Exported',
            default => ucfirst($this->action),
        };
    }

    /**
     * Get action icon name for UI
     */
    public function getActionIconAttribute(): string
    {
        return match(strtolower($this->action)) {
            'created' => 'Plus',
            'updated' => 'Edit',
            'deleted' => 'Trash2',
            'viewed' => 'Eye',
            'approved' => 'Check',
            'rejected' => 'XCircle',
            'restored' => 'RotateCcw',
            'exported' => 'Download',
            default => 'FileText',
        };
    }

    /**
     * Scope to filter by module
     */
    public function scopeForModule($query, string $module)
    {
        return $query->where('module', $module);
    }

    /**
     * Scope to filter by action
     */
    public function scopeForAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope to filter by entity
     */
    public function scopeForEntity($query, string $entityType, ?string $entityId = null)
    {
        $query->where('entity_type', $entityType);
        if ($entityId !== null) {
            $query->where('entity_id', $entityId);
        }
        return $query;
    }

    /**
     * Scope to filter by user
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeDateRange($query, ?string $from = null, ?string $to = null)
    {
        if ($from) {
            $query->where('created_at', '>=', $from);
        }
        if ($to) {
            $query->where('created_at', '<=', $to . ' 23:59:59');
        }
        return $query;
    }

    /**
     * Scope to search audit logs.
     * Modes: any (default), target_id (record targeted by action), reference, performed_by (user who did it), field (field changed on update).
     */
    public function scopeSearch($query, string $search, string $mode = 'any')
    {
        return $query->where(function ($q) use ($search, $mode) {
            switch ($mode) {
                case 'target_id':
                    $q->where('entity_id', 'like', "%{$search}%");
                    break;
                case 'reference':
                    $q->where('reference_number', 'like', "%{$search}%");
                    break;
                case 'performed_by':
                    $q->where('performed_by', 'like', "%{$search}%");
                    break;
                case 'field':
                    $q->where(function ($fq) use ($search) {
                        $fq->where('description', 'like', "%{$search}%")
                            ->orWhere('old_values', 'like', "%{$search}%")
                            ->orWhere('new_values', 'like', "%{$search}%");
                    });
                    break;
                default:
                    $q->where('entity_id', 'like', "%{$search}%")
                        ->orWhere('reference_number', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('old_values', 'like', "%{$search}%")
                        ->orWhere('new_values', 'like', "%{$search}%")
                        ->orWhere('performed_by', 'like', "%{$search}%");
            }
        });
    }
}
