<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeDesignation extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'employee_designations';

    protected $fillable = [
        'employee_id',
        'unit_id',
        'position_id',
        'academic_rank_id',
        'staff_grade_id',
        'is_primary',
        'start_date',
        'end_date',
        'remarks',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'id');
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function position()
    {
        return $this->belongsTo(Position::class);
    }

    public function academicRank()
    {
        return $this->belongsTo(AcademicRank::class);
    }

    public function staffGrade()
    {
        return $this->belongsTo(StaffGrade::class);
    }

    public function gradeChanges()
    {
        return $this->hasMany(EmployeeGradeChange::class, 'designation_id');
    }

    /**
     * Scope to get only active designations (end_date is null or in the future)
     */
    public function scopeActive($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('end_date')
              ->orWhere('end_date', '>=', now());
        });
    }

    /**
     * Scope to get primary designations
     */
    public function scopePrimary($query)
    {
        return $query->where('is_primary', true);
    }
}
