<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Holiday extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'date',
        'type',
        'is_recurring',
        'description',
        'is_active',
    ];

    protected $casts = [
        'date' => 'date',
        'is_recurring' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForYear($query, int $year)
    {
        return $query->where(function ($q) use ($year) {
            $q->whereYear('date', $year)
                ->orWhere(function ($q2) {
                    $q2->where('is_recurring', true);
                });
        });
    }

    /**
     * Check if a date is a holiday
     */
    public static function isHoliday(Carbon $date): bool
    {
        // Check for exact date match
        $exactMatch = self::active()
            ->where('date', $date->format('Y-m-d'))
            ->exists();

        if ($exactMatch) {
            return true;
        }

        // Check for recurring holidays (same day and month, any year)
        $recurringMatch = self::active()
            ->where('is_recurring', true)
            ->whereDay('date', $date->day)
            ->whereMonth('date', $date->month)
            ->exists();

        return $recurringMatch;
    }

    /**
     * Get all holidays for a date range
     */
    public static function getHolidaysInRange(Carbon $start, Carbon $end): array
    {
        $holidays = [];
        $current = $start->copy();

        while ($current->lte($end)) {
            if (self::isHoliday($current)) {
                $holidays[] = $current->format('Y-m-d');
            }
            $current->addDay();
        }

        return $holidays;
    }
}

