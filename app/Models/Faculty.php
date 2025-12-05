<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Faculty extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'description',
        'status',
        'type',
    ];

    protected $attributes = [
        'type' => 'academic',
        'status' => 'active',
    ];

    /**
     * A faculty can manage many departments.
     */
    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    /**
     * A faculty can have many positions.
     */
    public function positions(): HasMany
    {
        return $this->hasMany(Position::class);
    }

    /**
     * Scope to only include active faculties.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}

