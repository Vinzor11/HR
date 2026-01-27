<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserActivity;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserActivitiesController extends Controller
{
    /**
     * Get user activities (login/logout logs)
     */
    public function activities(Request $request): Response
    {
        abort_unless($request->user()->can('view-user-activities'), 403, 'Unauthorized action.');

        $activities = UserActivity::with(['user' => function ($query) {
                $query->withTrashed()->select('id', 'name', 'email')
                    ->with('roles:roles.id,roles.name');
            }])
            ->orderBy('created_at', 'desc')
            ->limit(500)
            ->get()
            ->map(function ($activity) {
                // Use stored name/email (persist when user deleted); fallback to user relation or placeholders
                $userName = $activity->user_name ?? $activity->user?->name
                    ?? ($activity->user_id ? "User #{$activity->user_id} (deleted)" : 'Unknown User');
                $userEmail = $activity->user_email ?? $activity->user?->email ?? '—';
                
                // Get user roles
                $userRoles = null;
                if ($activity->user && $activity->user->relationLoaded('roles')) {
                    $roles = $activity->user->roles;
                    if ($roles && $roles->isNotEmpty()) {
                        $roleNames = $roles->map(function ($role) {
                            return ucwords(str_replace('-', ' ', $role->name));
                        })->toArray();
                        $userRoles = implode(', ', $roleNames);
                    }
                }
                
                return [
                    'id' => $activity->id,
                    'user_id' => $activity->user_id,
                    'user_name' => $userName,
                    'user_email' => $userEmail,
                    'user_roles' => $userRoles,
                    'activity_type' => $activity->activity_type,
                    'ip_address' => $activity->ip_address,
                    'device' => $activity->device,
                    'browser' => $activity->browser,
                    'status' => $activity->status,
                    'login_time' => $activity->login_time?->toIso8601String(),
                    'logout_time' => $activity->logout_time?->toIso8601String(),
                    'created_at' => $activity->created_at->toIso8601String(),
                ];
            });

        $users = User::select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return Inertia::render('users/activities', [
            'activities' => $activities,
            'users' => $users,
        ]);
    }
}
