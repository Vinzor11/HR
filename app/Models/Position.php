<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Position extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'pos_code',
        'pos_name',
        'description',
        'position_type',
        'slug',
        'creation_type',
        'sector_id',
        'authority_level',
    ];

    protected $casts = [
        'sector_id' => 'integer',
        'authority_level' => 'integer',
    ];

    // Legacy relationships removed - use sector() and assignments() instead

    public function sector(): BelongsTo
    {
        return $this->belongsTo(Sector::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(EmployeeDesignation::class);
    }

    public function unitPositions(): HasMany
    {
        return $this->hasMany(UnitPosition::class);
    }

    /**
     * Get the rank/level of this position (higher number = higher rank).
     * Uses authority_level for the new organizational structure.
     */
    public function getRank(): int
    {
        return $this->authority_level ?? 1;
    }

    /**
     * Scope to get positions higher than a given position.
     * Uses authority_level for the new organizational structure.
     */
    public function scopeHigherThan($query, Position $position)
    {
        $level = $position->authority_level ?? 1;
        return $query->where('authority_level', '>', $level);
    }
}

