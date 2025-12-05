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
        'department_id',
        'faculty_id',
        'hierarchy_level',
        'position_type',
        'position_category',
        'slug',
        'creation_type',
        'capacity',
    ];

    protected $casts = [
        'department_id' => 'integer',
        'faculty_id' => 'integer',
        'hierarchy_level' => 'integer',
        'capacity' => 'integer',
    ];

    protected $attributes = [
        'hierarchy_level' => 1,
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function faculty(): BelongsTo
    {
        return $this->belongsTo(Faculty::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    /**
     * Get the rank/level of this position (higher number = higher rank).
     */
    public function getRank(): int
    {
        return $this->hierarchy_level ?? 1;
    }

    /**
     * Scope to get positions higher than a given position.
     */
    public function scopeHigherThan($query, Position $position)
    {
        return $query->where('hierarchy_level', '>', $position->hierarchy_level);
    }
}

