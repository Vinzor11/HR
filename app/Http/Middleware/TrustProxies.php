<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrustProxies
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Trust all proxies for Railway/Heroku (behind load balancers)
        // This ensures Laravel correctly detects HTTPS from X-Forwarded-Proto header
        try {
            // Use static method if available
            if (method_exists(Request::class, 'setTrustedProxies')) {
                Request::setTrustedProxies(
                    ['*'],
                    Request::HEADER_X_FORWARDED_FOR |
                    Request::HEADER_X_FORWARDED_HOST |
                    Request::HEADER_X_FORWARDED_PORT |
                    Request::HEADER_X_FORWARDED_PROTO
                );
            } elseif (method_exists($request, 'setTrustedProxies')) {
                // Try instance method
                $request->setTrustedProxies(
                    ['*'],
                    Request::HEADER_X_FORWARDED_FOR |
                    Request::HEADER_X_FORWARDED_HOST |
                    Request::HEADER_X_FORWARDED_PORT |
                    Request::HEADER_X_FORWARDED_PROTO
                );
            }
        } catch (\Exception $e) {
            // Silently fail if method doesn't exist - trustHosts should handle it
        }

        return $next($request);
    }
}

