<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeGradeChange extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'designation_id',
        'from_grade_id',
        'from_grade_type',
        'to_grade_id',
        'to_grade_type',
        'change_type',
        'effective_date',
        'reason',
        'performed_by_employee_id',
    ];

    protected $casts = [
        'effective_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'id');
    }

    public function designation()
    {
        return $this->belongsTo(EmployeeDesignation::class);
    }

    public function performedBy()
    {
        return $this->belongsTo(Employee::class, 'performed_by_employee_id', 'id');
    }

    /**
     * Get the "from" grade/rank model (polymorphic)
     * Note: This is a computed accessor, not a relationship
     */
    public function getFromGradeAttribute()
    {
        if (!$this->from_grade_id || !$this->from_grade_type) {
            return null;
        }

        return $this->from_grade_type === 'academic_rank'
            ? AcademicRank::find($this->from_grade_id)
            : StaffGrade::find($this->from_grade_id);
    }

    /**
     * Get the "to" grade/rank model (polymorphic)
     * Note: This is a computed accessor, not a relationship
     */
    public function getToGradeAttribute()
    {
        return $this->to_grade_type === 'academic_rank'
            ? AcademicRank::find($this->to_grade_id)
            : StaffGrade::find($this->to_grade_id);
    }

    /**
     * Scope for promotions only
     */
    public function scopePromotions($query)
    {
        return $query->where('change_type', 'promotion');
    }

    /**
     * Scope for corrections only
     */
    public function scopeCorrections($query)
    {
        return $query->where('change_type', 'correction');
    }
}
