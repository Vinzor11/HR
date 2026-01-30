<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorVerificationService
{
    /**
     * Require that the user has 2FA enabled to perform sensitive actions.
     * Throws ValidationException if user does not have 2FA enabled.
     */
    public function requireTwoFactorEnabled(Request $request, ?User $user = null): void
    {
        $user = $user ?? $request->user();
        if (!$user) {
            return;
        }
        if (!$user->hasTwoFactorEnabled()) {
            throw ValidationException::withMessages([
                'two_factor_required' => ['You must enable two-factor authentication to use this feature. Please set it up in Settings.'],
            ]);
        }
    }

    /**
     * Require valid 2FA code for sensitive actions when user has 2FA enabled.
     * Throws ValidationException if user has 2FA enabled and code is missing or invalid.
     */
    public function validateForSensitiveAction(Request $request, ?User $user = null): void
    {
        $user = $user ?? $request->user();
        $this->requireTwoFactorEnabled($request, $user);

        $code = $request->input('two_factor_code');
        if (empty($code) || !is_string($code)) {
            throw ValidationException::withMessages([
                'two_factor_code' => ['A verification code is required to perform this action.'],
            ]);
        }

        $code = trim($code);
        if (strlen($code) !== 6 || !ctype_digit($code)) {
            throw ValidationException::withMessages([
                'two_factor_code' => ['Please enter a valid 6-digit verification code.'],
            ]);
        }

        $google2fa = new Google2FA();
        $valid = $google2fa->verifyKey($user->two_factor_secret, $code);

        if (!$valid) {
            throw ValidationException::withMessages([
                'two_factor_code' => ['The verification code is invalid or has expired.'],
            ]);
        }
    }
}
