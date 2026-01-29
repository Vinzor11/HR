<?php

namespace App\Providers;

use App\Http\Responses\InertiaAuthorizationViewResponse;
use App\Models\EmployeeDesignation;
use App\Models\RequestSubmission;
use App\Models\Unit;
use App\Observers\EmployeeDesignationObserver;
use App\Observers\LeaveRequestObserver;
use App\Observers\CertificateGenerationObserver;
use App\Policies\UnitPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;
use Laravel\Passport\Contracts\AuthorizationViewResponse;
use Laravel\Passport\Passport;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(AuthorizationViewResponse::class, fn () => new InertiaAuthorizationViewResponse());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Note: Trusted proxies are now configured in bootstrap/app.php
        // using $middleware->trustProxies() which is the recommended approach
        
        // Force HTTPS URLs ONLY in production
        // In development, explicitly use HTTP
        if (config('app.env') === 'production') {
            URL::forceScheme('https');
            
            // Ensure APP_URL uses HTTPS for Vite asset generation
            $appUrl = config('app.url');
            if ($appUrl && str_starts_with($appUrl, 'http://')) {
                config(['app.url' => str_replace('http://', 'https://', $appUrl)]);
            }
        } else {
            // In development, explicitly force HTTP
            URL::forceScheme('http');
            
            // Ensure APP_URL uses HTTP in development
            $appUrl = config('app.url');
            if ($appUrl && str_starts_with($appUrl, 'https://')) {
                config(['app.url' => str_replace('https://', 'http://', $appUrl)]);
            }
        }
        
        // Register Leave Request Observer
        RequestSubmission::observe(LeaveRequestObserver::class);
        
        // Register Certificate Generation Observer
        RequestSubmission::observe(CertificateGenerationObserver::class);
        
        // Register Employee Designation Observer
        EmployeeDesignation::observe(EmployeeDesignationObserver::class);

        // Configure Passport
        Passport::tokensExpireIn(now()->addHours(1));
        Passport::refreshTokensExpireIn(now()->addDays(30));
        
        // Define scopes for different systems
        Passport::tokensCan([
            'accounting' => 'Access accounting system',
            'payroll' => 'Access payroll system',
            'hr' => 'Access HR system',
            'openid' => 'OpenID Connect',
            'profile' => 'Access profile information',
            'email' => 'Access email address',
        ]);
        
        // Default scope
        Passport::setDefaultScope(['hr']);
        
        // Register policies
        Gate::policy(Unit::class, UnitPolicy::class);
    }
}
