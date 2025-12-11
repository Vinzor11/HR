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
 * 
 * IMPORTANT: When a browser follows redirects from an XHR request automatically,
 * headers like X-Inertia and X-Requested-With are NOT preserved. Therefore, we
 * ALWAYS convert external redirects to full page redirects, regardless of headers.
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
            // ALWAYS use Inertia::location() for external redirects
            // This prevents CORS errors when:
            // 1. Inertia requests follow redirects (X-Inertia header present)
            // 2. Browser XHR follows redirects (headers are lost after first redirect)
            // 3. OAuth callbacks redirect to external URLs
            //
            // For non-JS requests, Inertia::location() returns a standard redirect
            // which the browser handles normally. For Inertia/XHR requests, it returns
            // a 409 with X-Inertia-Location header triggering a full page redirect.
            return Inertia::location($targetUrl);
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

