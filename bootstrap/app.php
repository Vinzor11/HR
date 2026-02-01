<?php

use App\Http\Middleware\AddCacheHeaders;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleExternalRedirects;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: ['appearance']);

        // Trust all proxies for Railway/Heroku (behind load balancers)
        // This MUST be configured before any other middleware to ensure
        // Laravel correctly detects HTTPS from X-Forwarded-Proto header
        $middleware->trustProxies(
            at: '*',
            headers: Request::HEADER_X_FORWARDED_FOR |
                     Request::HEADER_X_FORWARDED_HOST |
                     Request::HEADER_X_FORWARDED_PORT |
                     Request::HEADER_X_FORWARDED_PROTO |
                     Request::HEADER_X_FORWARDED_AWS_ELB
        );

        $middleware->web(append: [
            AddCacheHeaders::class, // Add cache headers early for static assets
            \App\Http\Middleware\PreserveOAuthRedirect::class, // Preserve OAuth authorization URL before auth redirect
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            HandleExternalRedirects::class, // Convert external redirects to full page redirects for Inertia
        ]);

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'research.coordinator' => \App\Http\Middleware\EnsureUserIsResearchCoordinator::class,
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
                try {
                    $request = request();
                    \Log::error('Unhandled Exception', [
                        'message' => $e->getMessage(),
                        'exception' => get_class($e),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                        'trace' => $e->getTraceAsString(),
                        'url' => $request ? $request->fullUrl() : 'N/A',
                        'method' => $request ? $request->method() : 'N/A',
                        'ip' => $request ? $request->ip() : 'N/A',
                        'user_id' => auth()->check() ? auth()->id() : null,
                        'user_agent' => $request ? $request->userAgent() : 'N/A',
                    ]);
                } catch (\Throwable $logError) {
                    // If logging fails, at least log the original error
                    \Log::error('Unhandled Exception (logging failed)', [
                        'message' => $e->getMessage(),
                        'exception' => get_class($e),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                        'log_error' => $logError->getMessage(),
                    ]);
                }
            }
        });
    })->create();
