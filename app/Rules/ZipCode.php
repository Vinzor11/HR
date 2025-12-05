<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class ZipCode implements Rule
{
    public function passes($attribute, $value)
    {
        if (empty($value)) {
            return false; // Required field
        }

        // Remove non-digits
        $cleaned = preg_replace('/\D/', '', $value);

        // Check if it's exactly 4 digits
        return strlen($cleaned) === 4;
    }

    public function message()
    {
        return 'The :attribute must be exactly 4 digits.';
    }
}

