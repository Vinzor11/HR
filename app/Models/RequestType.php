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

    public function allowedFaculties()
    {
        return $this->belongsToMany(Faculty::class, 'request_type_allowed_faculties', 'request_type_id', 'faculty_id')->withTimestamps();
    }

    public function allowedDepartments()
    {
        return $this->belongsToMany(Department::class, 'request_type_allowed_departments', 'request_type_id', 'department_id')->withTimestamps();
    }

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

                return $step;
            });
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
