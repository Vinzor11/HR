<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\UserActivity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

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
    public function store(LoginRequest $request): RedirectResponse
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
            
            // CRITICAL: If this is an Inertia XHR request, we MUST use Inertia::location()
            // to force a full page redirect. Otherwise, Inertia will follow the redirect
            // via XHR, which will eventually hit an external OAuth callback URL and cause
            // CORS errors (browser XHR can't redirect to external domains).
            //
            // Inertia::location() returns a 409 response with X-Inertia-Location header,
            // which tells Inertia's client-side code to do a full page navigation instead.
            if ($request->header('X-Inertia')) {
                return Inertia::location($oauthRedirect);
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
}
