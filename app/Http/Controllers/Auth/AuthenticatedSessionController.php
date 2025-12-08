<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
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
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

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

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
