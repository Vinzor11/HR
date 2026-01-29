<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Unit extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'sector_id',
        'unit_type',
        'name',
        'code',
        'parent_unit_id',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function sector()
    {
        return $this->belongsTo(Sector::class);
    }

    public function parentUnit()
    {
        return $this->belongsTo(Unit::class, 'parent_unit_id');
    }

    public function childUnits()
    {
        return $this->hasMany(Unit::class, 'parent_unit_id');
    }

    public function assignments()
    {
        return $this->hasMany(EmployeeDesignation::class);
    }

    /**
     * Alias for assignments - employee designations in this unit
     */
    public function employeeDesignations()
    {
        return $this->hasMany(EmployeeDesignation::class);
    }

    public function allowedPositions()
    {
        return $this->hasMany(UnitPosition::class, 'unit_type', 'unit_type');
    }
}
