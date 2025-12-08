<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorVerificationController extends Controller
{
    /**
     * Show the two factor authentication verification page.
     */
    public function show(Request $request): Response
    {
        // Check if user needs 2FA verification
        if (!$request->session()->has('login.id')) {
            return redirect()->route('login');
        }

        return Inertia::render('auth/two-factor-challenge');
    }

    /**
     * Handle the two factor authentication verification.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string'],
        ]);

        $userId = $request->session()->get('login.id');
        
        if (!$userId) {
            return redirect()->route('login');
        }

        $user = \App\Models\User::find($userId);

        if (!$user || !$user->hasTwoFactorEnabled()) {
            return redirect()->route('login');
        }

        $google2fa = new Google2FA();
        $code = trim($request->input('code')); // Trim whitespace

        // Check if it's a recovery code (case-insensitive, trimmed)
        $recoveryCodes = $user->two_factor_recovery_codes ?? [];
        $isRecoveryCode = false;
        $matchedRecoveryCode = null;

        foreach ($recoveryCodes as $recoveryCode) {
            if (strcasecmp(trim($recoveryCode), $code) === 0) {
                $isRecoveryCode = true;
                $matchedRecoveryCode = $recoveryCode;
                break;
            }
        }

        if ($isRecoveryCode && $matchedRecoveryCode) {
            // Remove used recovery code
            $recoveryCodes = array_values(array_diff($recoveryCodes, [$matchedRecoveryCode]));
            $user->two_factor_recovery_codes = $recoveryCodes;
            $user->save();
        } else {
            // Verify TOTP code (must be exactly 6 digits)
            if (strlen($code) !== 6 || !ctype_digit($code)) {
                throw ValidationException::withMessages([
                    'code' => ['The authentication code must be 6 digits, or enter a valid recovery code.'],
                ]);
            }

            $valid = $google2fa->verifyKey($user->two_factor_secret, $code);

            if (!$valid) {
                throw ValidationException::withMessages([
                    'code' => ['The provided two factor authentication code was invalid.'],
                ]);
            }
        }

        // Clear the login session
        $request->session()->forget('login.id');

        // Log the user in
        Auth::login($user, $request->session()->get('login.remember', false));
        $request->session()->regenerate();

        // Redirect to OAuth authorize if that's where they came from
        if ($request->session()->has('oauth_redirect')) {
            $oauthRedirect = $request->session()->pull('oauth_redirect');
            return redirect($oauthRedirect);
        }

        // Ensure HTTPS for redirect URL
        $dashboardUrl = route('dashboard', absolute: false);
        if (str_starts_with($dashboardUrl, 'http://')) {
            $dashboardUrl = str_replace('http://', 'https://', $dashboardUrl);
        }
        return redirect()->intended($dashboardUrl);
    }
}
