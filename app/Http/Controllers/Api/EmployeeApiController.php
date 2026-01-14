<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Services\EmployeeScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmployeeApiController extends Controller
{
    protected EmployeeScopeService $scopeService;

    public function __construct(EmployeeScopeService $scopeService)
    {
        $this->scopeService = $scopeService;
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
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        // Build query for all employees
        $query = Employee::with(['department', 'position']);
        
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
        $formattedEmployees = $employees->map(function ($employee) {
            return $this->formatEmployeeResponseData($employee);
        });
        
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
        
        $employee = Employee::with(['department', 'position'])
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
        $employee = Employee::with(['department', 'position'])
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
     * 
     * Returns a structured JSON response with all necessary employee information
     * for form auto-filling in external systems.
     */
    private function formatEmployeeResponse(Employee $employee): JsonResponse
    {
        return response()->json($this->formatEmployeeResponseData($employee));
    }

    /**
     * Format employee data for list responses (returns array instead of JsonResponse)
     * 
     * @param Employee $employee
     * @return array
     */
    private function formatEmployeeResponseData(Employee $employee): array
    {
        return [
            'id' => $employee->id,
            'name' => [
                'surname' => $employee->surname,
                'first_name' => $employee->first_name,
                'middle_name' => $employee->middle_name,
                'name_extension' => $employee->name_extension,
                'full_name' => trim("{$employee->first_name} {$employee->middle_name} {$employee->surname} {$employee->name_extension}"),
            ],
            'contact' => [
                'email' => $employee->email_address,
                'mobile' => $employee->mobile_no,
                'telephone' => $employee->telephone_no,
            ],
            'employment' => [
                'status' => $employee->status,
                'employment_status' => $employee->employment_status,
                'employee_type' => $employee->employee_type,
                'date_hired' => $employee->date_hired?->format('Y-m-d'),
                'date_regularized' => $employee->date_regularized?->format('Y-m-d'),
            ],
            'department' => $employee->department ? [
                'id' => $employee->department->id,
                'code' => $employee->department->code,
                'name' => $employee->department->name,
                'type' => $employee->department->type,
                'faculty_id' => $employee->department->faculty_id,
            ] : null,
            'position' => $employee->position ? [
                'id' => $employee->position->id,
                'code' => $employee->position->pos_code,
                'name' => $employee->position->pos_name,
            ] : null,
            'personal' => [
                'birth_date' => $employee->birth_date?->format('Y-m-d'),
                'birth_place' => $employee->birth_place,
                'sex' => $employee->sex,
                'civil_status' => $employee->civil_status,
                'citizenship' => $employee->citizenship,
                'dual_citizenship' => $employee->dual_citizenship,
                'citizenship_type' => $employee->citizenship_type,
            ],
            'address' => [
                'residential' => [
                    'house_no' => $employee->res_house_no,
                    'street' => $employee->res_street,
                    'subdivision' => $employee->res_subdivision,
                    'barangay' => $employee->res_barangay,
                    'city' => $employee->res_city,
                    'province' => $employee->res_province,
                    'zip_code' => $employee->res_zip_code,
                ],
                'permanent' => [
                    'house_no' => $employee->perm_house_no,
                    'street' => $employee->perm_street,
                    'subdivision' => $employee->perm_subdivision,
                    'barangay' => $employee->perm_barangay,
                    'city' => $employee->perm_city,
                    'province' => $employee->perm_province,
                    'zip_code' => $employee->perm_zip_code,
                ],
            ],
            'government_ids' => [
                'gsis' => $employee->gsis_id_no,
                'pagibig' => $employee->pagibig_id_no,
                'philhealth' => $employee->philhealth_no,
                'sss' => $employee->sss_no,
                'tin' => $employee->tin_no,
                'agency_employee_no' => $employee->agency_employee_no,
                'government_issued_id' => $employee->government_issued_id,
                'id_number' => $employee->id_number,
                'id_date_issued' => $employee->id_date_issued?->format('Y-m-d'),
                'id_place_of_issue' => $employee->id_place_of_issue,
            ],
            'special_categories' => [
                'pwd_id_no' => $employee->pwd_id_no,
                'solo_parent_id_no' => $employee->solo_parent_id_no,
                'indigenous_group' => $employee->indigenous_group,
            ],
        ];
    }
}

