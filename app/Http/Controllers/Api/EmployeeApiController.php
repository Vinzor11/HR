<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Services\Api\EmployeeApiFormatter;
use App\Services\EmployeeScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmployeeApiController extends Controller
{
    protected EmployeeScopeService $scopeService;

    protected EmployeeApiFormatter $formatter;

    public function __construct(EmployeeScopeService $scopeService, EmployeeApiFormatter $formatter)
    {
        $this->scopeService = $scopeService;
        $this->formatter = $formatter;
    }

    /**
     * List all employees
     * 
     * Returns all employee records from the employees table.
     * Designed for external systems that need to fetch all employee data.
     * 
     * Query Parameters:
     * - page (optional): Page number for pagination (default: 1)
     * - per_page (optional): Number of items per page (default: 50, max: 100)
     * - status (optional): Filter by status - 'active', 'inactive', or 'all' (default: 'active')
     * - include_deleted (optional): Include soft-deleted employees (default: false)
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        // Include soft-deleted employees if requested (for sync purposes)
        $includeDeleted = $request->boolean('include_deleted', false);
        
        // Build query for all employees with new org structure
        $query = $includeDeleted 
            ? Employee::withTrashed()->with(['primaryDesignation.unit.sector', 'primaryDesignation.position', 'primaryDesignation.academicRank', 'primaryDesignation.staffGrade'])
            : Employee::with(['primaryDesignation.unit.sector', 'primaryDesignation.position', 'primaryDesignation.academicRank', 'primaryDesignation.staffGrade']);
        
        // Filter by status
        $status = $request->input('status', 'active');
        if ($status !== 'all') {
            $query->where('status', $status);
        }
        
        // Pagination
        $perPage = min((int)$request->input('per_page', 50), 100); // Max 100 per page
        $employees = $query->orderBy('surname')
            ->orderBy('first_name')
            ->paginate($perPage);
        
        // Format employees data
        $formattedEmployees = $employees->map(fn (Employee $employee) => $this->formatter->format($employee));
        
        return response()->json([
            'data' => $formattedEmployees,
            'meta' => [
                'current_page' => $employees->currentPage(),
                'last_page' => $employees->lastPage(),
                'per_page' => $employees->perPage(),
                'total' => $employees->total(),
                'from' => $employees->firstItem(),
                'to' => $employees->lastItem(),
            ],
            'links' => [
                'first' => $employees->url(1),
                'last' => $employees->url($employees->lastPage()),
                'prev' => $employees->previousPageUrl(),
                'next' => $employees->nextPageUrl(),
            ],
        ]);
    }

    /**
     * Get current employee (from OAuth token)
     * 
     * Returns the employee record associated with the authenticated user.
     * This is the safest endpoint as users can always access their own data.
     */
    public function getCurrentEmployee(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->employee_id) {
            return response()->json([
                'error' => 'No employee record found for this user',
                'message' => 'The authenticated user does not have an associated employee record.'
            ], 404);
        }
        
        $employee = Employee::with(['primaryDesignation.unit.sector', 'primaryDesignation.position', 'primaryDesignation.academicRank', 'primaryDesignation.staffGrade'])
            ->where('id', $user->employee_id)
            ->where('status', 'active')
            ->first();
        
        if (!$employee) {
            return response()->json([
                'error' => 'Employee not found',
                'message' => 'The employee record associated with this user was not found or is inactive.'
            ], 404);
        }
        
        return $this->formatEmployeeResponse($employee);
    }
    
    /**
     * Get employee by employee_id
     * 
     * This endpoint allows external systems to fetch employee data using the employee_id
     * from the OAuth token. Security checks ensure users can only access employees
     * they have permission to view based on their role and scope.
     */
    public function getEmployee(Request $request, string $employee_id): JsonResponse
    {
        $user = $request->user();
        
        // Find the employee
        $employee = Employee::with(['primaryDesignation.unit.sector', 'primaryDesignation.position', 'primaryDesignation.academicRank', 'primaryDesignation.staffGrade'])
            ->where('id', $employee_id)
            ->first();
        
        if (!$employee) {
            return response()->json([
                'error' => 'Employee not found',
                'message' => 'The requested employee record was not found.'
            ], 404);
        }
        
        // Security check: Verify user has permission to view this employee
        if (!$this->scopeService->canViewEmployee($user, $employee)) {
            Log::warning('Unauthorized API access attempt', [
                'user_id' => $user->id,
                'employee_id' => $employee_id,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
            
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'You do not have permission to view this employee record.'
            ], 403);
        }
        
        // Only return active employees for external systems
        if ($employee->status !== 'active') {
            return response()->json([
                'error' => 'Employee not available',
                'message' => 'The requested employee record is not active.'
            ], 404);
        }
        
        return $this->formatEmployeeResponse($employee);
    }
    
    /**
     * Format employee response for API
     */
    private function formatEmployeeResponse(Employee $employee): JsonResponse
    {
        return response()->json($this->formatter->format($employee));
    }
}

