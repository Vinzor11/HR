<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware to handle redirects to external URLs when using Inertia.js
 * 
 * When Inertia receives a redirect response, it follows the redirect as an XHR request.
 * If the redirect goes to an external domain, this causes CORS errors because the
 * external domain doesn't have CORS headers for the origin.
 * 
 * This middleware detects external redirects and converts them to Inertia::location()
 * responses, which tell Inertia to do a full page redirect instead of XHR.
 */
class HandleExternalRedirects
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only process redirect responses
        if (!($response instanceof RedirectResponse)) {
            return $response;
        }

        $targetUrl = $response->getTargetUrl();
        
        // Check if this is an external redirect
        if ($this->isExternalUrl($targetUrl, $request)) {
            // For Inertia requests, use Inertia::location() for external redirects
            // This tells Inertia to do a full page redirect instead of XHR
            if ($request->header('X-Inertia')) {
                return Inertia::location($targetUrl);
            }
            
            // For XHR/AJAX requests, use Inertia::location() to force full page redirect
            // This prevents CORS errors when browser follows redirect chain
            if ($request->ajax() || $request->wantsJson()) {
                return Inertia::location($targetUrl);
            }
            
            // For regular requests during OAuth flow, check if this might be followed by XHR
            // If the request came from an Inertia page (has X-Inertia-Version header or
            // Accept header includes application/json), use Inertia::location()
            $acceptHeader = $request->header('Accept', '');
            if (str_contains($acceptHeader, 'application/json') || $request->header('X-Inertia-Version')) {
                return Inertia::location($targetUrl);
            }
        }

        return $response;
    }

    /**
     * Check if the URL is external (different origin than current request)
     */
    protected function isExternalUrl(string $url, Request $request): bool
    {
        // Parse the target URL
        $parsed = parse_url($url);
        
        // Relative URLs are internal
        if (!isset($parsed['host'])) {
            return false;
        }

        // Get current request host
        $currentHost = $request->getHost();
        
        // Compare hosts (case-insensitive)
        return strcasecmp($parsed['host'], $currentHost) !== 0;
    }
}

