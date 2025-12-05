<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\TrainingApplication;

class Training extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'training_id';

    protected $fillable = [
        'training_title',
        'training_category_id',
        'date_from',
        'date_to',
        'hours',
        'facilitator',
        'venue',
        'capacity',
        'remarks',
        'requires_approval',
        'request_type_id',
        'reference_number',
    ];

    protected $casts = [
        'date_from' => 'date',
        'date_to' => 'date',
        'hours' => 'decimal:2',
        'requires_approval' => 'boolean',
    ];

    protected $attributes = [
        'requires_approval' => false,
    ];

    protected $appends = ['id'];

    public function getIdAttribute(): ?int
    {
        return $this->attributes[$this->primaryKey] ?? null;
    }

    public function getRouteKeyName(): string
    {
        return 'training_id';
    }

    public function allowedFaculties()
    {
        return $this->belongsToMany(Faculty::class, 'training_allowed_faculties', 'training_id', 'faculty_id')->withTimestamps();
    }

    public function allowedDepartments()
    {
        return $this->belongsToMany(Department::class, 'training_allowed_departments', 'training_id', 'department_id')->withTimestamps();
    }

    public function allowedPositions()
    {
        return $this->belongsToMany(Position::class, 'training_allowed_positions', 'training_id', 'position_id')->withTimestamps();
    }

    public function applications()
    {
        return $this->hasMany(TrainingApplication::class, 'training_id', 'training_id');
    }

    public function requestType()
    {
        return $this->belongsTo(RequestType::class);
    }
}

