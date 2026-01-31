<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Unit;

class OAuthClientPositionRole extends Model
{
    protected $table = 'oauth_client_position_roles';

    protected $fillable = [
        'oauth_client_id',
        'unit_id',
        'position_id',
        'role',
    ];

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }
}
