<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class LeaveType extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'description',
        'color',
        'requires_approval',
        'requires_medical_certificate',
        'max_days_per_request',
        'max_days_per_year',
        'min_notice_days',
        'can_carry_over',
        'max_carry_over_days',
        'is_paid',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'requires_approval' => 'boolean',
        'requires_medical_certificate' => 'boolean',
        'can_carry_over' => 'boolean',
        'is_paid' => 'boolean',
        'is_active' => 'boolean',
        'max_days_per_request' => 'integer',
        'max_days_per_year' => 'integer',
        'min_notice_days' => 'integer',
        'max_carry_over_days' => 'integer',
        'sort_order' => 'integer',
    ];

    public function leaveBalances(): HasMany
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function leaveAccruals(): HasMany
    {
        return $this->hasMany(LeaveAccrual::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }
}



