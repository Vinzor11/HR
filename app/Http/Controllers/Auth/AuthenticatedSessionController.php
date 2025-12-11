<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\UserActivity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
            // Pass flag to indicate OAuth flow - form should use traditional submission
            'hasOAuthRedirect' => $request->session()->has('oauth_redirect'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse|SymfonyResponse
    {
        try {
            $request->authenticate();
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Log failed login attempt
            $email = $request->input('email');
            $user = \App\Models\User::where('email', $email)->first();
            
            if ($user) {
                $userAgentInfo = UserActivity::parseUserAgent($request->userAgent());
                UserActivity::create([
                    'user_id' => $user->id,
                    'activity_type' => 'login_failed',
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'device' => $userAgentInfo['device'],
                    'browser' => $userAgentInfo['browser'],
                    'status' => 'failed',
                    'login_time' => now(),
                ]);
            }
            
            throw $e;
        }

        $user = Auth::user();

        // Check if user has 2FA enabled
        if ($user && $user->hasTwoFactorEnabled()) {
            // Store user ID and remember preference in session
            // Don't regenerate session yet - we'll do it after 2FA verification
            $request->session()->put('login.id', $user->id);
            $request->session()->put('login.remember', $request->boolean('remember'));

            // Logout the user temporarily
            Auth::logout();

            // Redirect to 2FA verification
            return redirect()->route('two-factor.login');
        }

        // Only regenerate session if 2FA is not enabled
        $request->session()->regenerate();

        // Log successful login
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
        // This preserves the OAuth authorization flow with all query parameters (state, client_id, etc.)
        if ($request->session()->has('oauth_redirect')) {
            $oauthRedirect = $request->session()->pull('oauth_redirect');
            
            // CRITICAL: For ANY XHR/Inertia request, we MUST break the redirect chain
            // to prevent CORS errors. The OAuth flow will eventually redirect to an
            // external callback URL, and XHR cannot follow cross-origin redirects.
            //
            // Return an HTML page that does a JavaScript redirect - this CANNOT be
            // followed by XHR (XHR receives HTML, not a redirect response).
            // The browser will then render the HTML and execute the JS redirect.
            if ($request->header('X-Inertia') || $request->ajax() || $request->wantsJson()) {
                return $this->createFullPageRedirectResponse($oauthRedirect);
            }
            
            // For traditional form submissions (non-Inertia), use regular redirect
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
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $user = Auth::user();
        
        // Log logout if user is authenticated
        if ($user) {
            $activityId = $request->session()->get('last_activity_id');
            
            if ($activityId) {
                // Update the last login activity with logout time
                $activity = UserActivity::where('id', $activityId)
                    ->where('user_id', $user->id)
                    ->where('activity_type', 'login')
                    ->whereNull('logout_time')
                    ->latest()
                    ->first();
                
                if ($activity) {
                    $activity->update([
                        'logout_time' => now(),
                    ]);
                } else {
                    // Create new logout activity if we can't find the login
                    $userAgentInfo = UserActivity::parseUserAgent($request->userAgent());
                    UserActivity::create([
                        'user_id' => $user->id,
                        'activity_type' => 'logout',
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                        'device' => $userAgentInfo['device'],
                        'browser' => $userAgentInfo['browser'],
                        'status' => 'success',
                        'logout_time' => now(),
                    ]);
                }
            } else {
                // Create logout activity if no activity ID in session
                $userAgentInfo = UserActivity::parseUserAgent($request->userAgent());
                UserActivity::create([
                    'user_id' => $user->id,
                    'activity_type' => 'logout',
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'device' => $userAgentInfo['device'],
                    'browser' => $userAgentInfo['browser'],
                    'status' => 'success',
                    'logout_time' => now(),
                ]);
            }
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    /**
     * Create an HTML response that forces a full page redirect.
     * 
     * This is used when we need to break an XHR redirect chain.
     * By returning HTML instead of a 302 redirect, the XHR receives
     * HTML content (not a redirect), which breaks the chain.
     * Inertia will see this as an unexpected response and do a full page reload.
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
