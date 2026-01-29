<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Unit-Position Whitelist Configuration
    |--------------------------------------------------------------------------
    |
    | Controls how the unit-position whitelist is enforced.
    |
    | strict_mode: If true, positions MUST be in the whitelist to be assigned.
    |              If false, positions are allowed if no whitelist exists for
    |              that unit type (backward compatibility).
    |
    */
    'unit_position_whitelist' => [
        'strict_mode' => env('HR_WHITELIST_STRICT_MODE', false),
    ],
];
