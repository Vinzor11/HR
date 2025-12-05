<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class NameField implements Rule
{
    private $maxLength;

    public function __construct($maxLength = 100)
    {
        $this->maxLength = $maxLength;
    }

    public function passes($attribute, $value)
    {
        if (empty($value)) {
            return true; // Empty is handled by required validation
        }

        // Check max length
        if (strlen($value) > $this->maxLength) {
            return false;
        }

        // Allow letters, spaces, hyphens, apostrophes, and periods
        if (!preg_match('/^[a-zA-Z\s\-\'\.]+$/', $value)) {
            return false;
        }

        return true;
    }

    public function message()
    {
        return 'The :attribute can only contain letters, spaces, hyphens, apostrophes, and periods, and must not exceed ' . $this->maxLength . ' characters.';
    }
}

