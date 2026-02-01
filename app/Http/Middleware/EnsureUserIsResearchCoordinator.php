<?php

namespace App\Http\Middleware;

use App\Models\Employee;
use App\Models\Position;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsResearchCoordinator
{
    /**
     * Ensure the authenticated user has a Research Coordinator (RES_COORD) designation.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->employee_id) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Authentication required. No employee record found.',
            ], 401);
        }

        $position = Position::where('pos_code', 'RES_COORD')->first();

        if (!$position) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Research Coordinator position is not configured.',
            ], 403);
        }

        $hasCoordinatorRole = Employee::where('id', $user->employee_id)
            ->whereHas('designations', function ($query) use ($position) {
                $query->where('position_id', $position->id)->active();
            })
            ->exists();

        if (!$hasCoordinatorRole) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'You must be a Research Coordinator to access this endpoint.',
            ], 403);
        }

        return $next($request);
    }
}
