<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeRankPromotion extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'employee_id',
        'from_academic_rank_id',
        'to_academic_rank_id',
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

    public function fromAcademicRank()
    {
        return $this->belongsTo(AcademicRank::class, 'from_academic_rank_id');
    }

    public function toAcademicRank()
    {
        return $this->belongsTo(AcademicRank::class, 'to_academic_rank_id');
    }

    public function promotedBy()
    {
        return $this->belongsTo(Employee::class, 'promoted_by', 'id');
    }
}
