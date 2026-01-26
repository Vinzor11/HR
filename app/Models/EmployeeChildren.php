<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\FormatsDates;

class EmployeeChildren extends Model
{
    use HasFactory, FormatsDates;

    protected $fillable = [
        'employee_id',
        'full_name',
        'birth_date'
    ];

    protected $casts = [
        'birth_date' => 'date'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'id');
    }
}