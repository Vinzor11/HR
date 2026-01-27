<?php

namespace App\Http\Middleware;

use App\Models\UserActivity;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogOAuthAuthorization
{
    /**
     * Handle an incoming request and log OAuth authorization (login) activity.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only log on POST to oauth/authorize (approval)
        if ($request->isMethod('POST') && $request->is('oauth/authorize')) {
            $user = $request->user();
            
            if ($user) {
                $userAgentInfo = UserActivity::parseUserAgent($request->userAgent());
                UserActivity::create([
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'user_email' => $user->email,
                    'activity_type' => 'oauth_login',
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'device' => $userAgentInfo['device'],
                    'browser' => $userAgentInfo['browser'],
                    'status' => 'success',
                    'login_time' => now(),
                ]);
            }
        }
        
        return $next($request);
    }
}
