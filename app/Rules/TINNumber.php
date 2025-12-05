<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class TINNumber implements Rule
{
    public function passes($attribute, $value)
    {
        if (empty($value)) {
            return true; // Optional field
        }

        // Remove non-digits
        $cleaned = preg_replace('/\D/', '', $value);

        // Check if it's 9-12 digits
        if (strlen($cleaned) >= 9 && strlen($cleaned) <= 12) {
            return true;
        }

        // Check formatted format: ###-###-###-### (can have 3-4 groups)
        if (preg_match('/^\d{3}-\d{3}-\d{3}(-\d{3})?$/', $value)) {
            return true;
        }

        return false;
    }

    public function message()
    {
        return 'The :attribute must be 9-12 digits or in format ###-###-###-###.';
    }
}

