<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Department extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'type',
        'description',
        'faculty_id',
        'head_position_id',
        'faculty_code',
        'faculty_name',
    ];

    protected $casts = [
        'faculty_id' => 'integer',
        'head_position_id' => 'integer',
    ];

    protected $attributes = [
        'type' => 'academic',
    ];

    protected static function booted(): void
    {
        static::saving(function (Department $department): void {
            if ($department->type === 'administrative') {
                $department->faculty_id = null;
            }

            if ($department->code && empty($department->faculty_code)) {
                $department->faculty_code = $department->code;
            }

            if ($department->name && empty($department->faculty_name)) {
                $department->faculty_name = $department->name;
            }
        });
    }

    public function faculty(): BelongsTo
    {
        return $this->belongsTo(Faculty::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    public function positions(): HasMany
    {
        return $this->hasMany(Position::class)->orderBy('hierarchy_level', 'desc');
    }

    public function scopeAcademic($query)
    {
        return $query->where('type', 'academic');
    }

    public function scopeAdministrative($query)
    {
        return $query->where('type', 'administrative');
    }
}

