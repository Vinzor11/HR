<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    protected $fillable = [
        'name',
        'label',
        'description',
        'is_active',
        'guard_name',
        'level',
    ];

    protected $casts = [
        'level' => 'integer',
        'is_active' => 'boolean',
    ];

    protected $attributes = [
        'level' => 0,
    ];

    /**
     * Scope to get roles by hierarchy level.
     */
    public function scopeByLevel($query, int $level)
    {
        return $query->where('level', $level);
    }

    /**
     * Scope to get roles at or above a certain level.
     */
    public function scopeAtOrAboveLevel($query, int $minLevel)
    {
        return $query->where('level', '>=', $minLevel);
    }
}
