<?php

namespace App\Models;

use App\Models\Relations\SafeBelongsToMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\TrainingApplication;
use App\Models\Concerns\FormatsDates;

class Training extends Model
{
    use HasFactory, SoftDeletes, FormatsDates;

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
        'date_from' => 'date:Y-m-d',
        'date_to' => 'date:Y-m-d',
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

    /**
     * New org structure relationships (Sector/Unit/Position).
     * Uses SafeBelongsToMany so missing pivot table (e.g. before migrations on Railway) returns empty, not 500.
     */
    public function allowedSectors()
    {
        $instance = $this->newRelatedInstance(Sector::class);

        return new SafeBelongsToMany(
            $instance->newQuery(),
            $this,
            'training_allowed_sectors',
            'training_id',
            'sector_id',
            $this->getKeyName(),
            $instance->getKeyName(),
            'allowedSectors'
        )->withTimestamps();
    }

    public function allowedUnits()
    {
        $instance = $this->newRelatedInstance(Unit::class);

        return new SafeBelongsToMany(
            $instance->newQuery(),
            $this,
            'training_allowed_units',
            'training_id',
            'unit_id',
            $this->getKeyName(),
            $instance->getKeyName(),
            'allowedUnits'
        )->withTimestamps();
    }

    public function allowedPositions()
    {
        return $this->belongsToMany(Position::class, 'training_allowed_positions', 'training_id', 'position_id')->withTimestamps();
    }

    // Legacy relationships - kept for backward compatibility during transition
    // These can be removed once migration is complete

    public function applications()
    {
        return $this->hasMany(TrainingApplication::class, 'training_id', 'training_id');
    }

    public function requestType()
    {
        return $this->belongsTo(RequestType::class);
    }
}

