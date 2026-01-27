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

    /**
     * The accessors to append to the model's array form.
     */
    protected $appends = [
        'background_image_url',
    ];

    public function textLayers(): HasMany
    {
        return $this->hasMany(CertificateTextLayer::class)->orderBy('sort_order');
    }

    public function getBackgroundImageUrlAttribute(): ?string
    {
        if (!$this->background_image_path) {
            return null;
        }

        // Use the public disk to generate the correct URL
        return Storage::disk('public')->url($this->background_image_path);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
