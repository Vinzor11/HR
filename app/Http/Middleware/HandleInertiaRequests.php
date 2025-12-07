<?php
namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $user = $request->user();
        
        // Load roles and permissions efficiently with caching
        $roles = [];
        $permissions = [];
        
        if ($user) {
            try {
                // Load roles with eager loading to prevent N+1
                if (!$user->relationLoaded('roles')) {
                    $user->load('roles.permissions'); // Eager load roles and their permissions
                }
                $roles = $user->roles->pluck('name')->toArray();
            } catch (\Exception $e) {
                $roles = [];
            }
            
            try {
                // Cache permissions per user for 5 minutes to avoid expensive queries on every request
                // Cache key includes user ID and updated_at timestamp to invalidate when user changes
                $cacheKey = "user_permissions_{$user->id}_{$user->updated_at->timestamp}";
                
                $permissions = Cache::remember($cacheKey, 300, function () use ($user) {
                    // Use a more efficient method: get permissions from roles and direct permissions
                    // This avoids the expensive getAllPermissions() method
                    $rolePermissions = $user->roles()
                        ->with('permissions:id,name')
                        ->get()
                        ->pluck('permissions')
                        ->flatten()
                        ->pluck('name')
                        ->unique()
                        ->toArray();
                    
                    $directPermissions = $user->permissions()
                        ->pluck('name')
                        ->toArray();
                    
                    return array_unique(array_merge($rolePermissions, $directPermissions));
                });
            } catch (\Exception $e) {
                $permissions = [];
            }
        }

        return [
             ...parent::share($request),
            'name'  => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth'  => [
                'user'        => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'employee_id' => $user->employee_id,
                    'avatar' => $user->avatar ?? null, // Include avatar if exists
                ] : null,
                'roles'       => $roles,
                'permissions' => $permissions,
            ],
            'ziggy' => function () use ($request): array {
                // Cache Ziggy routes for 1 hour since they don't change often
                $cacheKey = 'ziggy_routes';
                
                $ziggyArray = Cache::remember($cacheKey, 3600, function () {
                    $ziggy = new Ziggy();
                    return $ziggy->toArray();
                });
                
                // Only force HTTPS in production or when request is secure
                $isProduction = config('app.env') === 'production';
                $isSecure = $request->secure();
                $shouldForceHttps = $isProduction || $isSecure;
                
                $baseUrl = config('app.url');
                $location = $request->url();
                
                // In development, ALWAYS use HTTP (never HTTPS)
                if (!$shouldForceHttps) {
                    // Force HTTP in development
                    if ($baseUrl && str_starts_with($baseUrl, 'https://')) {
                        $baseUrl = str_replace('https://', 'http://', $baseUrl);
                    }
                    if (str_starts_with($location, 'https://')) {
                        $location = str_replace('https://', 'http://', $location);
                    }
                } else {
                    // Only convert to HTTPS if we should force it (production)
                    if ($baseUrl && str_starts_with($baseUrl, 'http://')) {
                        $baseUrl = str_replace('http://', 'https://', $baseUrl);
                    }
                    if (str_starts_with($location, 'http://')) {
                        $location = str_replace('http://', 'https://', $location);
                    }
                }
                
                return [
                    ...$ziggyArray,
                    'location' => $location,
                    'url' => $baseUrl ?: $location,
                ];
            },
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
                'newClient' => $request->session()->get('newClient'),
            ],
            'importedData' => fn () => $request->session()->pull('importedData'),
        ];
    }
}
