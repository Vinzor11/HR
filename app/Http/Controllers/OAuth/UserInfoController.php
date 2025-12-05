<?php

namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserInfoController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Get user's employee data if exists
        $employee = $user->employee ?? null;
        
        // Base claims (OpenID Connect standard)
        $claims = [
            'sub' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified' => $user->hasVerifiedEmail(),
        ];
        
        // Add employee-specific claims if available
        if ($employee) {
            $claims['employee_id'] = (string) $employee->id;
            $claims['employee_number'] = $employee->employee_number ?? null;
            
            // Load relationships if they exist
            if ($employee->relationLoaded('department') || $employee->department) {
                $claims['department'] = $employee->department->name ?? null;
            }
            
            if ($employee->relationLoaded('position') || $employee->position) {
                $claims['position'] = $employee->position->name ?? null;
            }
        }
        
        // Add role/permission claims
        $claims['roles'] = $user->getRoleNames()->toArray();
        $claims['permissions'] = $user->getAllPermissions()->pluck('name')->toArray();
        
        return response()->json($claims);
    }
}

