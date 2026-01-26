<?php

namespace App\Models\Concerns;

trait FormatsDates
{
    /**
     * Convert the model instance to an array.
     * Override to ensure date fields are formatted as YYYY-MM-DD.
     * This is necessary because serializeDate() doesn't work for $casts.
     */
    public function toArray(): array
    {
        $array = parent::toArray();
        
        // Get all date fields from casts
        $dateFields = $this->getDateFields();
        
        // Format each date field
        foreach ($dateFields as $field) {
            if (isset($array[$field])) {
                $array[$field] = $this->formatDateValue($array[$field]);
            }
        }
        
        return $array;
    }

    /**
     * Get list of date fields from casts
     */
    protected function getDateFields(): array
    {
        $dateFields = [];
        
        if (isset($this->casts)) {
            foreach ($this->casts as $field => $cast) {
                // Check if it's a date cast (date, date:format, or datetime)
                if (is_string($cast) && (str_starts_with($cast, 'date') || str_starts_with($cast, 'datetime'))) {
                    $dateFields[] = $field;
                }
            }
        }
        
        return $dateFields;
    }

    /**
     * Format a date value to YYYY-MM-DD format
     */
    protected function formatDateValue($value): ?string
    {
        if ($value === null) {
            return null;
        }

        try {
            // If it's already a Carbon instance
            if ($value instanceof \Carbon\Carbon) {
                return $value->toDateString();
            }

            // If it's a DateTimeInterface
            if ($value instanceof \DateTimeInterface) {
                return \Carbon\Carbon::instance($value)->toDateString();
            }

            // If it's a string, try to parse it
            if (is_string($value)) {
                // If already in YYYY-MM-DD format, return as is
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                    return $value;
                }

                // Try to parse and format (handles ISO format strings)
                $carbon = \Carbon\Carbon::parse($value);
                return $carbon->toDateString();
            }
        } catch (\Exception $e) {
            // If parsing fails, return original value
            return is_string($value) ? $value : null;
        }

        return null;
    }

    /**
     * Prepare a date for array / JSON serialization.
     * This ensures dates are always serialized as YYYY-MM-DD strings.
     */
    protected function serializeDate(\DateTimeInterface $date): string
    {
        return $date->format('Y-m-d');
    }
}
