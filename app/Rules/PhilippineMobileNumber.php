<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class PhilippineMobileNumber implements Rule
{
    public function passes($attribute, $value)
    {
        if (empty($value)) {
            return false; // Required field
        }

        // Remove non-digits
        $cleaned = preg_replace('/\D/', '', $value);

        // Check if it's exactly 11 digits
        if (strlen($cleaned) !== 11) {
            return false;
        }

        // Check if it starts with 09 (Philippines mobile format)
        if (!str_starts_with($cleaned, '09')) {
            return false;
        }

        return true;
    }

    public function message()
    {
        return 'The :attribute must be exactly 11 digits starting with 09 (Philippines format).';
    }
}

