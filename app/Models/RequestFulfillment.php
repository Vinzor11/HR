<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class RequestFulfillment extends Model
{
    use HasFactory;

    protected $fillable = [
        'submission_id',
        'fulfilled_by',
        'file_path',
        'original_filename',
        'notes',
        'completed_at',
    ];

    protected $casts = [
        'completed_at' => 'datetime',
    ];

    protected $appends = [
        'file_url',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(RequestSubmission::class, 'submission_id');
    }

    public function fulfiller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fulfilled_by');
    }

    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path ? Storage::url($this->file_path) : null;
    }
}
