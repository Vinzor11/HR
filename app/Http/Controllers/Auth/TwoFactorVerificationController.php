<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\UserActivity;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

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
    public function store(Request $request): RedirectResponse|SymfonyResponse
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

        // Log successful login after 2FA verification
        $userAgentInfo = UserActivity::parseUserAgent($request->userAgent());
        $activity = UserActivity::create([
            'user_id' => $user->id,
            'activity_type' => 'login',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device' => $userAgentInfo['device'],
            'browser' => $userAgentInfo['browser'],
            'status' => 'success',
            'login_time' => now(),
        ]);

        // Store activity ID in session for logout tracking
        $request->session()->put('last_activity_id', $activity->id);

        // Redirect to OAuth authorize if that's where they came from
        if ($request->session()->has('oauth_redirect')) {
            $oauthRedirect = $request->session()->pull('oauth_redirect');
            
            // CRITICAL: For ANY XHR/Inertia request, we MUST break the redirect chain
            // to prevent CORS errors. Return an HTML page that does a JavaScript redirect.
            if ($request->header('X-Inertia') || $request->ajax() || $request->wantsJson()) {
                return $this->createFullPageRedirectResponse($oauthRedirect);
            }
            
            return redirect($oauthRedirect);
        }

        // Ensure HTTPS for redirect URL
        $dashboardUrl = route('dashboard', absolute: false);
        if (str_starts_with($dashboardUrl, 'http://')) {
            $dashboardUrl = str_replace('http://', 'https://', $dashboardUrl);
        }
        return redirect()->intended($dashboardUrl);
    }

    /**
     * Create an HTML response that forces a full page redirect.
     */
    protected function createFullPageRedirectResponse(string $url): HttpResponse
    {
        $escapedUrl = htmlspecialchars($url, ENT_QUOTES, 'UTF-8');
        $jsUrl = json_encode($url);
        
        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url={$escapedUrl}">
    <title>Redirecting...</title>
    <style>
        body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
        .loader { text-align: center; }
        .spinner { width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="loader">
        <div class="spinner"></div>
        <p>Redirecting...</p>
    </div>
    <script>window.location.replace({$jsUrl});</script>
</body>
</html>
HTML;

        return new HttpResponse($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }
}
