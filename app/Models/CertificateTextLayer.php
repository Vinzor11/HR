<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CertificateTextLayer extends Model
{
    use HasFactory;

    protected $fillable = [
        'certificate_template_id',
        'name',
        'field_key',
        'default_text',
        'x_position',
        'y_position',
        'font_family',
        'font_size',
        'font_color',
        'font_weight',
        'text_align',
        'max_width',
        'sort_order',
    ];

    protected $casts = [
        'x_position' => 'integer',
        'y_position' => 'integer',
        'font_size' => 'integer',
        'max_width' => 'integer',
        'sort_order' => 'integer',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(CertificateTemplate::class, 'certificate_template_id');
    }
}
