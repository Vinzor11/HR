<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class RequestSubmission extends Model
{
    use HasFactory;
    use SoftDeletes;

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_FULFILLMENT = 'fulfillment';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'request_type_id',
        'user_id',
        'reference_code',
        'status',
        'current_step_index',
        'approval_state',
        'submitted_at',
        'fulfilled_at',
        'certificate_path',
    ];

    protected $casts = [
        'approval_state' => 'array',
        'submitted_at' => 'datetime',
        'fulfilled_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (RequestSubmission $submission): void {
            if (empty($submission->reference_code)) {
                $submission->reference_code = self::generateReferenceCode();
            }
            if (empty($submission->submitted_at)) {
                $submission->submitted_at = now();
            }
        });
    }

    public function requestType(): BelongsTo
    {
        return $this->belongsTo(RequestType::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(RequestAnswer::class, 'submission_id');
    }

    public function approvalActions(): HasMany
    {
        return $this->hasMany(RequestApprovalAction::class, 'submission_id')->orderBy('step_index');
    }

    public function fulfillment(): HasOne
    {
        return $this->hasOne(RequestFulfillment::class, 'submission_id');
    }

    public function hasCertificate(): bool
    {
        return !is_null($this->certificate_path);
    }

    public function getCertificateUrlAttribute(): ?string
    {
        return $this->certificate_path ? \Illuminate\Support\Facades\Storage::url($this->certificate_path) : null;
    }

    public function scopeOwnedBy($query, ?int $userId)
    {
        return $query->when($userId, fn ($builder) => $builder->where('user_id', $userId));
    }

    public function scopeForRequestType($query, ?int $requestTypeId)
    {
        return $query->when($requestTypeId, fn ($builder) => $builder->where('request_type_id', $requestTypeId));
    }

    public function pendingApprovalAction(): ?RequestApprovalAction
    {
        return $this->approvalActions->firstWhere('status', RequestApprovalAction::STATUS_PENDING);
    }

    public function requiresFulfillment(): bool
    {
        return $this->requestType?->requiresFulfillment() ?? false;
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED || (!$this->requiresFulfillment() && $this->status === self::STATUS_APPROVED);
    }

    public static function generateReferenceCode(): string
    {
        return 'REQ-' . now()->format('Ymd') . '-' . strtoupper(Str::random(5));
    }
}
