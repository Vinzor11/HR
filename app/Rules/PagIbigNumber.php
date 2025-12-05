<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class PagIbigNumber implements Rule
{
    public function passes($attribute, $value)
    {
        if (empty($value)) {
            return true; // Optional field
        }

        // Remove non-digits
        $cleaned = preg_replace('/\D/', '', $value);

        // Check if it's 12-14 digits
        if (strlen($cleaned) >= 12 && strlen($cleaned) <= 14) {
            return true;
        }

        return false;
    }

    public function message()
    {
        return 'The :attribute must be 12-14 digits.';
    }
}

