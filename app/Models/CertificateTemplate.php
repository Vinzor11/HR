<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class CertificateTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'background_image_path',
        'width',
        'height',
        'is_active',
    ];

    protected $casts = [
        'width' => 'integer',
        'height' => 'integer',
        'is_active' => 'boolean',
    ];

    public function textLayers(): HasMany
    {
        return $this->hasMany(CertificateTextLayer::class)->orderBy('sort_order');
    }

    public function getBackgroundImageUrlAttribute(): ?string
    {
        return $this->background_image_path ? Storage::url($this->background_image_path) : null;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
