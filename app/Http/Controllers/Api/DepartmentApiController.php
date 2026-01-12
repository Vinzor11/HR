<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentApiController extends Controller
{
    /**
     * Get all departments/offices
     * 
     * Returns a list of all active departments. Can be filtered by type
     * (academic or administrative) using query parameter.
     * 
     * Query parameters:
     * - type: Filter by department type ('academic' or 'administrative')
     * - status: Filter by status (default: active only)
     */
    public function index(Request $request): JsonResponse
    {
        $type = $request->input('type'); // 'academic' or 'administrative'
        $status = $request->input('status', 'active'); // Default to active only
        
        $query = Department::query();
        
        // Filter by type if provided
        if ($type && in_array($type, ['academic', 'administrative'])) {
            $query->where('type', $type);
        }
        
        // Only return non-deleted departments
        $query->whereNull('deleted_at');
        
        // Load faculty relationship
        $departments = $query->with('faculty')
            ->orderBy('name')
            ->get()
            ->map(function ($dept) {
                return [
                    'id' => $dept->id,
                    'code' => $dept->code,
                    'name' => $dept->name,
                    'type' => $dept->type,
                    'description' => $dept->description,
                    'faculty' => $dept->faculty ? [
                        'id' => $dept->faculty->id,
                        'code' => $dept->faculty->code,
                        'name' => $dept->faculty->name,
                    ] : null,
                ];
            });
        
        return response()->json([
            'data' => $departments,
            'count' => $departments->count(),
        ]);
    }
    
    /**
     * Get specific department by ID
     * 
     * Returns detailed information about a specific department/office.
     */
    public function show(string $id): JsonResponse
    {
        $department = Department::with('faculty')
            ->whereNull('deleted_at')
            ->find($id);
        
        if (!$department) {
            return response()->json([
                'error' => 'Department not found',
                'message' => 'The requested department was not found or has been deleted.'
            ], 404);
        }
        
        return response()->json([
            'id' => $department->id,
            'code' => $department->code,
            'name' => $department->name,
            'type' => $department->type,
            'description' => $department->description,
            'faculty' => $department->faculty ? [
                'id' => $department->faculty->id,
                'code' => $department->faculty->code,
                'name' => $department->faculty->name,
                'type' => $department->faculty->type,
                'description' => $department->faculty->description,
            ] : null,
        ]);
    }
}

