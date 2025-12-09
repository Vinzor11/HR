<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware to preserve OAuth authorization URL when redirecting to login
 * 
 * This ensures that when a user is redirected to /login from /oauth/authorize,
 * the full authorization URL (including all query parameters like client_id, state, etc.)
 * is preserved so they can be redirected back after successful authentication.
 * 
 * This fixes the issue where OAuth state mismatch occurs because the authorization
 * request is lost after login redirect.
 */
class PreserveOAuthRedirect
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // If this is an OAuth authorization request, preserve the full URL
        // (including query parameters) in the session before auth middleware runs
        // This ensures the authorization request with all params (client_id, state, etc.)
        // is preserved when user is redirected to login
        if ($request->is('oauth/authorize')) {
            // Store the full authorization URL with all query parameters
            // This includes: client_id, redirect_uri, response_type, scope, state, etc.
            $request->session()->put('oauth_redirect', $request->fullUrl());
        }

        return $next($request);
    }
}

