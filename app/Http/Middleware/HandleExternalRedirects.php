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
 * This middleware detects external redirects and converts them to full page redirects
 * that work regardless of whether the request is Inertia, XHR, or a normal browser request.
 * 
 * IMPORTANT: When a browser follows redirects from an XHR request automatically,
 * headers like X-Inertia and X-Requested-With are NOT preserved. Therefore, we
 * return an HTML page with a JavaScript redirect that works for ANY request type.
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
            // For Inertia requests with the header, use Inertia::location()
            // This is the cleanest approach when we know it's an Inertia request
            if ($request->header('X-Inertia')) {
                return Inertia::location($targetUrl);
            }
            
            // For ALL other requests (including XHR that lost headers during redirect chain),
            // return an HTML page that does a JavaScript redirect.
            // This ensures the browser does a full page navigation instead of XHR.
            // 
            // This handles the case where:
            // 1. Login submits via Inertia XHR
            // 2. Server redirects to /oauth/authorize (XHR follows)
            // 3. /oauth/authorize redirects to external callback (XHR would follow, causing CORS)
            // 4. This middleware intercepts and returns HTML with JS redirect
            // 5. Browser executes JS redirect as full page navigation - no CORS!
            return $this->createJavaScriptRedirectResponse($targetUrl);
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

    /**
     * Create an HTML response that redirects via JavaScript
     * 
     * This works for ANY request type because:
     * - For normal browser requests: HTML loads, JS executes, redirects
     * - For XHR requests: Response is HTML, browser can't follow as redirect,
     *   but the JavaScript will execute when the page renders
     * 
     * The key insight is that returning HTML (not a 302) stops the XHR redirect chain.
     * The browser then renders the HTML which executes the JavaScript redirect.
     */
    protected function createJavaScriptRedirectResponse(string $url): Response
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
</head>
<body>
    <p>Redirecting to external site...</p>
    <script>window.location.href = {$jsUrl};</script>
</body>
</html>
HTML;

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }
}

