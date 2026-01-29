<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class ApprovalDelegation extends Model
{
    use HasFactory;

    protected $fillable = [
        'delegator_id',
        'delegate_id',
        'starts_at',
        'ends_at',
        'reason',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * The user who delegated their approval authority.
     */
    public function delegator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegator_id');
    }

    /**
     * The user who received the delegation.
     */
    public function delegate(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegate_id');
    }

    /**
     * The user who created this delegation record.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope to get currently active delegations.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where('starts_at', '<=', now())
            ->where(function ($q) {
                $q->whereNull('ends_at')
                    ->orWhere('ends_at', '>=', now());
            });
    }

    /**
     * Scope to get delegations for a specific delegator.
     */
    public function scopeForDelegator(Builder $query, int $userId): Builder
    {
        return $query->where('delegator_id', $userId);
    }

    /**
     * Scope to get delegations for a specific delegate.
     */
    public function scopeForDelegate(Builder $query, int $userId): Builder
    {
        return $query->where('delegate_id', $userId);
    }

    /**
     * Check if this delegation is currently effective.
     */
    public function isEffective(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $now = now();
        
        if ($this->starts_at > $now) {
            return false;
        }

        if ($this->ends_at && $this->ends_at < $now) {
            return false;
        }

        return true;
    }

    /**
     * Get the active delegate for a user, if any.
     */
    public static function getActiveDelegateFor(int $userId): ?User
    {
        $delegation = static::active()
            ->forDelegator($userId)
            ->with('delegate')
            ->first();

        return $delegation?->delegate;
    }

    /**
     * Get all users who have delegated to a specific user.
     */
    public static function getDelegatorsFor(int $userId): array
    {
        return static::active()
            ->forDelegate($userId)
            ->pluck('delegator_id')
            ->toArray();
    }

    /**
     * Check if a user can act on behalf of another user.
     */
    public static function canActOnBehalfOf(int $actingUserId, int $originalUserId): bool
    {
        if ($actingUserId === $originalUserId) {
            return true;
        }

        return static::active()
            ->where('delegator_id', $originalUserId)
            ->where('delegate_id', $actingUserId)
            ->exists();
    }
}
