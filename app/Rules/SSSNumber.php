<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class SSSNumber implements Rule
{
    public function passes($attribute, $value)
    {
        if (empty($value)) {
            return true; // Optional field
        }

        // Remove non-digits
        $cleaned = preg_replace('/\D/', '', $value);

        // Check if it's exactly 10 digits
        if (strlen($cleaned) === 10) {
            return true;
        }

        // Check formatted format: ##-#######-#
        if (preg_match('/^\d{2}-\d{7}-\d{1}$/', $value)) {
            return true;
        }

        return false;
    }

    public function message()
    {
        return 'The :attribute must be 10 digits or in format ##-#######-#.';
    }
}

