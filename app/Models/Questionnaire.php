<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\FormatsDates;

class Questionnaire extends Model
{
    use HasFactory, FormatsDates;

    protected $fillable = [
        'employee_id',
        'question_number',
        'answer',
        'details',
        'date_filed',
        'status_of_case'
    ];

    protected $casts = [
        'answer' => 'boolean',
        'date_filed' => 'date'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'id');
    }
}