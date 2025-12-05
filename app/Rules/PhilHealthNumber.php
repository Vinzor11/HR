<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class PhilHealthNumber implements Rule
{
    public function passes($attribute, $value)
    {
        if (empty($value)) {
            return true; // Optional field
        }

        // Remove non-digits
        $cleaned = preg_replace('/\D/', '', $value);

        // Check if it's exactly 12 digits
        if (strlen($cleaned) === 12) {
            return true;
        }

        // Check formatted format: ####-#####-##
        if (preg_match('/^\d{4}-\d{5}-\d{2}$/', $value)) {
            return true;
        }

        return false;
    }

    public function message()
    {
        return 'The :attribute must be 12 digits or in format ####-#####-##.';
    }
}

