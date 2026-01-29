<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class StaffGrade extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'level',
        'description',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'level' => 'integer',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function assignments()
    {
        return $this->hasMany(EmployeeDesignation::class);
    }

    public function promotionsFrom()
    {
        return $this->hasMany(EmployeePromotion::class, 'from_staff_grade_id');
    }

    public function promotionsTo()
    {
        return $this->hasMany(EmployeePromotion::class, 'to_staff_grade_id');
    }
}
