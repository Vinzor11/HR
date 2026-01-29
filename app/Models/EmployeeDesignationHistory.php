<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeDesignationHistory extends Model
{
    use HasFactory;

    protected $table = 'employee_designation_history';

    public $timestamps = false;

    protected $fillable = [
        'designation_id',
        'field_changed',
        'old_value',
        'new_value',
        'changed_by',
        'changed_at',
    ];

    protected $casts = [
        'changed_at' => 'datetime',
    ];

    public function designation()
    {
        return $this->belongsTo(EmployeeDesignation::class);
    }

    public function changedBy()
    {
        return $this->belongsTo(Employee::class, 'changed_by', 'id');
    }
}
