<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        
        // External redirect? Always break XHR chains with an HTML/JS redirect.
        if ($this->isExternalUrl($targetUrl, $request)) {
            return $this->createJavaScriptRedirectResponse($targetUrl);
        }

        // OAuth authorize is an internal URL but will eventually redirect externally.
        // If the current request is XHR/Inertia, break the chain now with an HTML/JS redirect
        // so the browser performs a full navigation instead of XHR following redirects.
        if ($this->isOAuthAuthorizeRedirect($targetUrl) && ($request->header('X-Inertia') || $request->ajax() || $request->wantsJson())) {
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
     * Check if redirect is to the OAuth authorize endpoint
     */
    protected function isOAuthAuthorizeRedirect(string $url): bool
    {
        $parsed = parse_url($url);
        $path = $parsed['path'] ?? '';

        return str_contains($path, '/oauth/authorize');
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

