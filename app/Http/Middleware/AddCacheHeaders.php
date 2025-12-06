<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AddCacheHeaders
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Add cache headers for static assets (JS, CSS, images, fonts)
        if ($request->is('build/*') || 
            $request->is('assets/*') ||
            preg_match('/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/', $request->path())) {
            
            // Cache static assets for 1 year (with hash-based filenames, this is safe)
            $response->headers->set('Cache-Control', 'public, max-age=31536000, immutable');
            $response->headers->set('Expires', now()->addYear()->toRfc7231String());
        }

        return $response;
    }
}

