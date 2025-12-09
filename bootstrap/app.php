<?php

use App\Http\Middleware\AddCacheHeaders;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: ['appearance']);

        // Trust all proxies (required for Railway, Heroku, and other platforms behind load balancers)
        // This ensures Laravel correctly detects HTTPS from X-Forwarded-Proto header
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            AddCacheHeaders::class, // Add cache headers early for static assets
            \App\Http\Middleware\PreserveOAuthRedirect::class, // Preserve OAuth authorization URL before auth redirect
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);

        // Exclude OAuth token endpoint from CSRF protection
        $middleware->validateCsrfTokens(except: [
            'oauth/token',
        ]);

    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Log all exceptions with detailed context in production
        $exceptions->report(function (Throwable $e) {
            // Only log in production (errors are already logged in development)
            if (app()->environment('production')) {
                \Log::error('Unhandled Exception', [
                    'message' => $e->getMessage(),
                    'exception' => get_class($e),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString(),
                    'url' => request()->fullUrl(),
                    'method' => request()->method(),
                    'ip' => request()->ip(),
                    'user_id' => auth()->id(),
                    'user_agent' => request()->userAgent(),
                ]);
            }
        });
    })->create();
