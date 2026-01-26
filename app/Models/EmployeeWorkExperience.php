<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\FormatsDates;

class EmployeeWorkExperience extends Model
{
    use HasFactory, FormatsDates;

    protected $fillable = [
        'employee_id',
        'position_title',
        'company_name',
        'company_address',
        'date_from',
        'date_to',
        'monthly_salary',
        'salary_grade_step',
        'status_of_appointment',
        'is_gov_service'
    ];

    protected $casts = [
        'date_from' => 'date',
        'date_to' => 'date',
        'monthly_salary' => 'decimal:2',
        'is_gov_service' => 'boolean'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'id');
    }
}