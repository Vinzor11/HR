<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeePromotion extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'employee_id',
        'from_staff_grade_id',
        'to_staff_grade_id',
        'effective_date',
        'promoted_by',
        'remarks',
        'document_ref',
    ];

    protected $casts = [
        'effective_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'id');
    }

    public function fromStaffGrade()
    {
        return $this->belongsTo(StaffGrade::class, 'from_staff_grade_id');
    }

    public function toStaffGrade()
    {
        return $this->belongsTo(StaffGrade::class, 'to_staff_grade_id');
    }

    public function promotedBy()
    {
        return $this->belongsTo(Employee::class, 'promoted_by', 'id');
    }
}
