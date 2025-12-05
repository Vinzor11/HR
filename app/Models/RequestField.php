<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RequestField extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_type_id',
        'field_key',
        'label',
        'field_type',
        'is_required',
        'description',
        'options',
        'sort_order',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'options' => 'array',
    ];

    public function requestType(): BelongsTo
    {
        return $this->belongsTo(RequestType::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(RequestAnswer::class, 'field_id');
    }

    public function requiresOptionValues(): bool
    {
        return in_array($this->field_type, ['dropdown', 'checkbox', 'radio'], true);
    }
}
