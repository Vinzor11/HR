<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\FormatsDates;

class EmployeeCivilServiceEligibility extends Model
{
    use HasFactory, FormatsDates;

    protected $fillable = [
        'employee_id',
        'eligibility',
        'rating',
        'exam_date',
        'exam_place',
        'license_no',
        'license_validity'
    ];

    protected $casts = [
        'exam_date' => 'date',
        'license_validity' => 'date'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'id');
    }
}