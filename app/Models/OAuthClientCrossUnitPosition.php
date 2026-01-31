<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OAuthClientCrossUnitPosition extends Model
{
    protected $table = 'oauth_client_cross_unit_positions';

    protected $fillable = [
        'oauth_client_id',
        'position_id',
        'role',
        'unit_type_filter',
    ];

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }
}
