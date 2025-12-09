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
        
        // Eager load employee with position and department relationships
        $user->load('employee.position', 'employee.department');
        
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
            $claims['first_name'] = $employee->first_name ?? null;
            $claims['last_name'] = $employee->surname ?? null;
            $claims['middle_name'] = $employee->middle_name ?? null;
            
            // Add department name if available
            if ($employee->department) {
                $claims['department'] = $employee->department->name ?? null;
            }
            
            // Add position name if available (Position model uses 'pos_name' field)
            if ($employee->position) {
                $claims['position'] = $employee->position->pos_name ?? null;
            }
        }
        
        // Add role/permission claims
        $claims['roles'] = $user->getRoleNames()->toArray();
        $claims['permissions'] = $user->getAllPermissions()->pluck('name')->toArray();
        
        return response()->json($claims);
    }
}

