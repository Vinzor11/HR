<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\FormatsDates;

class EmployeeVoluntaryWork extends Model
{
    use HasFactory, FormatsDates;

    protected $fillable = [
        'employee_id',
        'organization_name',
        'organization_address',
        'date_from',
        'date_to',
        'hours_rendered',
        'position_or_nature'
    ];

    protected $casts = [
        'date_from' => 'date',
        'date_to' => 'date',
        'hours_rendered' => 'integer'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id', 'id');
    }
}