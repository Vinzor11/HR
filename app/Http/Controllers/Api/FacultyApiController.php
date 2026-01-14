<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Faculty;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacultyApiController extends Controller
{
    /**
     * Get all faculties
     * 
     * Returns a list of all active faculties.
     * 
     * Query parameters:
     * - type: Filter by faculty type
     * - status: Filter by status (default: active only)
     * - include_deleted: Include soft-deleted faculties (default: false)
     */
    public function index(Request $request): JsonResponse
    {
        $type = $request->input('type');
        $status = $request->input('status', 'active');
        $includeDeleted = $request->boolean('include_deleted', false);
        
        // Include soft-deleted faculties if requested (for sync purposes)
        $query = $includeDeleted 
            ? Faculty::withTrashed()
            : Faculty::query();
        
        // Filter by type if provided
        if ($type) {
            $query->where('type', $type);
        }
        
        // Filter by status (default: active only)
        if ($status === 'active') {
            $query->where('status', 'active');
        } elseif ($status) {
            $query->where('status', $status);
        }
        
        // Only return non-deleted faculties if include_deleted is false
        if (!$includeDeleted) {
            $query->whereNull('deleted_at');
        }
        
        $faculties = $query->orderBy('name')
            ->get()
            ->map(function ($faculty) {
                return [
                    'id' => $faculty->id,
                    'code' => $faculty->code,
                    'name' => $faculty->name,
                    'type' => $faculty->type,
                    'description' => $faculty->description,
                    'status' => $faculty->status,
                    'is_deleted' => $faculty->trashed(), // true if soft-deleted
                    'deleted_at' => $faculty->deleted_at?->format('Y-m-d H:i:s'), // null if not deleted
                ];
            });
        
        return response()->json([
            'data' => $faculties,
            'count' => $faculties->count(),
        ]);
    }
    
    /**
     * Get specific faculty by ID
     * 
     * Returns detailed information about a specific faculty.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $includeDeleted = $request->boolean('include_deleted', false);
        
        $query = $includeDeleted 
            ? Faculty::withTrashed()
            : Faculty::whereNull('deleted_at');
        
        $faculty = $query->find($id);
        
        if (!$faculty) {
            return response()->json([
                'error' => 'Faculty not found',
                'message' => 'The requested faculty was not found or has been deleted.'
            ], 404);
        }
        
        return response()->json([
            'id' => $faculty->id,
            'code' => $faculty->code,
            'name' => $faculty->name,
            'type' => $faculty->type,
            'description' => $faculty->description,
            'status' => $faculty->status,
            'is_deleted' => $faculty->trashed(), // true if soft-deleted
            'deleted_at' => $faculty->deleted_at?->format('Y-m-d H:i:s'), // null if not deleted
        ]);
    }
}

