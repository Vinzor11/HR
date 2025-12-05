<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Training Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration settings for the training module.
    |
    */

    /**
     * Maximum number of times an employee can re-apply for a training
     * after being rejected.
     */
    'max_reapply_attempts' => env('TRAINING_MAX_REAPPLY_ATTEMPTS', 3),
];

