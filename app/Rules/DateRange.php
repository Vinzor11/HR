<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class DateRange implements Rule
{
    private $fromDate;

    public function __construct($fromDate)
    {
        $this->fromDate = $fromDate;
    }

    public function passes($attribute, $value)
    {
        if (empty($value) || empty($this->fromDate)) {
            return true; // Empty dates are handled by required validation
        }

        try {
            $from = new \DateTime($this->fromDate);
            $to = new \DateTime($value);

            return $from <= $to;
        } catch (\Exception $e) {
            return false; // Invalid date format
        }
    }

    public function message()
    {
        return 'The :attribute must be after or equal to the "from" date.';
    }
}

