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
                // Cache key includes user ID, updated_at timestamp, and role IDs to invalidate when roles change
                $roleIds = $user->roles()->pluck('id')->sort()->implode(',');
                $cacheKey = "user_permissions_{$user->id}_{$user->updated_at->timestamp}_roles_{$roleIds}";
                
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
            'csrf'  => csrf_token(), // Explicitly share CSRF token for Inertia
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
                // Determine environment and protocol early
                $isProduction = config('app.env') === 'production';
                
                // Cache Ziggy routes per environment (production vs development)
                // This ensures we don't serve cached HTTP URLs in production
                $cacheKey = 'ziggy_routes_' . ($isProduction ? 'prod' : 'dev');
                
                $ziggyArray = Cache::remember($cacheKey, 3600, function () {
                    $ziggy = new Ziggy();
                    return $ziggy->toArray();
                });
                
                // Get current request info
                $currentHost = $request->getHost();
                $currentScheme = $isProduction ? 'https' : $request->getScheme();
                
                // Build the correct base URL based on environment
                $baseUrl = "{$currentScheme}://{$currentHost}";
                
                // Get current URL with correct scheme
                $location = $request->url();
                
                if ($isProduction) {
                    // ALWAYS force HTTPS in production, regardless of what Laravel detects
                    if (str_starts_with($location, 'http://')) {
                        $location = str_replace('http://', 'https://', $location);
                    }
                } else {
                    // Development: use HTTP
                    if (str_starts_with($location, 'https://')) {
                        $location = str_replace('https://', 'http://', $location);
                    }
                }
                
                // Override Ziggy's url to ensure correct protocol
                $ziggyUrl = $ziggyArray['url'] ?? $baseUrl;
                if ($isProduction && str_starts_with($ziggyUrl, 'http://')) {
                    $ziggyUrl = str_replace('http://', 'https://', $ziggyUrl);
                }
                // Also ensure the host matches
                $ziggyUrl = preg_replace('#^(https?://)([^/]+)#', "{$currentScheme}://{$currentHost}", $ziggyUrl);
                
                return [
                    ...$ziggyArray,
                    'location' => $location,
                    'url' => $ziggyUrl,
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
