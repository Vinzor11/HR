<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class RequestType extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'created_by',
        'name',
        'description',
        'has_fulfillment',
        'approval_steps',
        'is_published',
        'published_at',
        'certificate_template_id',
        'certificate_config',
    ];

    protected $casts = [
        'has_fulfillment' => 'boolean',
        'approval_steps' => 'array',
        'is_published' => 'boolean',
        'published_at' => 'datetime',
        'certificate_config' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function fields(): HasMany
    {
        return $this->hasMany(RequestField::class)->orderBy('sort_order');
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(RequestSubmission::class);
    }

    /**
     * New org structure relationships (Sector/Unit)
     */
    public function allowedSectors()
    {
        return $this->belongsToMany(Sector::class, 'request_type_allowed_sectors', 'request_type_id', 'sector_id')->withTimestamps();
    }

    public function allowedUnits()
    {
        return $this->belongsToMany(Unit::class, 'request_type_allowed_units', 'request_type_id', 'unit_id')->withTimestamps();
    }

    // Legacy relationships removed - use allowedSectors/allowedUnits instead

    public function trainings()
    {
        return $this->hasMany(Training::class, 'request_type_id', 'id');
    }

    public function certificateTemplate(): BelongsTo
    {
        return $this->belongsTo(CertificateTemplate::class, 'certificate_template_id');
    }

    public function hasCertificateGeneration(): bool
    {
        return !is_null($this->certificate_template_id) && !is_null($this->certificate_config);
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    // Approval modes for steps
    public const APPROVAL_MODE_ANY = 'any';       // Any one approver can approve (OR logic)
    public const APPROVAL_MODE_ALL = 'all';       // All approvers must approve (AND logic)
    public const APPROVAL_MODE_MAJORITY = 'majority'; // Majority must approve

    public function approvalSteps(): Collection
    {
        return collect($this->approval_steps ?? [])
            ->sortBy('sort_order')
            ->values()
            ->map(function ($step) {
                $approvers = collect(data_get($step, 'approvers', []));

                if ($approvers->isEmpty() && data_get($step, 'approver_type')) {
                    $approvers = collect([[
                        'approver_type' => data_get($step, 'approver_type'),
                        'approver_id' => data_get($step, 'approver_id'),
                        'approver_role_id' => data_get($step, 'approver_role_id'),
                        'approver_position_id' => data_get($step, 'approver_position_id'),
                    ]]);
                }

                $step['approvers'] = $approvers
                    ->map(function ($approver) {
                        $type = data_get($approver, 'approver_type');

                        return [
                            'id' => data_get($approver, 'id', (string) Str::ulid()),
                            'approver_type' => $type,
                            'approver_id' => $type === 'user' ? data_get($approver, 'approver_id') : null,
                            'approver_role_id' => $type === 'role' ? data_get($approver, 'approver_role_id') : null,
                            'approver_position_id' => $type === 'position' ? data_get($approver, 'approver_position_id') : null,
                        ];
                    })
                    ->filter(fn ($approver) => $approver['approver_type'] && ($approver['approver_id'] || $approver['approver_role_id'] || $approver['approver_position_id']))
                    ->values();

                // Ensure approval_mode is set (default to 'any' for backward compatibility)
                $step['approval_mode'] = data_get($step, 'approval_mode', self::APPROVAL_MODE_ANY);
                
                // Ensure sla_hours is set (default to null for no deadline)
                $step['sla_hours'] = data_get($step, 'sla_hours');

                return $step;
            });
    }

    /**
     * Get available approval modes.
     */
    public static function getApprovalModes(): array
    {
        return [
            self::APPROVAL_MODE_ANY => 'Any (One approver is sufficient)',
            self::APPROVAL_MODE_ALL => 'All (All approvers must approve)',
            self::APPROVAL_MODE_MAJORITY => 'Majority (More than half must approve)',
        ];
    }

    public function isPublished(): bool
    {
        return (bool) $this->is_published;
    }

    public function requiresFulfillment(): bool
    {
        return (bool) $this->has_fulfillment;
    }
}
