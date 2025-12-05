<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class DateNotFuture implements Rule
{
    public function passes($attribute, $value)
    {
        if (empty($value)) {
            return true; // Empty is handled by required validation
        }

        try {
            $date = new \DateTime($value);
            $today = new \DateTime();
            $today->setTime(23, 59, 59); // End of today

            return $date <= $today;
        } catch (\Exception $e) {
            return false; // Invalid date format
        }
    }

    public function message()
    {
        return 'The :attribute cannot be in the future.';
    }
}

