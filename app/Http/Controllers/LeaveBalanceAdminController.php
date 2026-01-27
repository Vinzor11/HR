<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\LeaveAccrual;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Services\LeaveService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

/**
 * LeaveBalanceAdminController
 * 
 * Handles admin operations for leave balance management:
 * - Setting initial balances for migrating employees
 * - Granting special leaves (maternity, paternity, etc.)
 * - Manual balance adjustments
 * - Viewing adjustment history
 */
class LeaveBalanceAdminController extends Controller
{
    protected LeaveService $leaveService;

    public function __construct(LeaveService $leaveService)
    {
        $this->leaveService = $leaveService;
    }

    /**
     * Display the leave balance management page
     */
    public function index(Request $request): Response
    {
        $year = $request->integer('year', now()->year);
        $search = $request->input('search');
        $searchMode = $request->input('search_mode', 'any');
        $departmentId = $request->integer('department_id');
        $perPage = $request->integer('per_page', 15);

        // Get employees with their leave balances
        $query = Employee::with(['department', 'position'])
            ->where('status', 'active')
            ->orderBy('surname')
            ->orderBy('first_name');

        if ($search) {
            $query->where(function ($q) use ($search, $searchMode) {
                switch ($searchMode) {
                    case 'name':
                        $q->where('surname', 'like', "%{$search}%")
                            ->orWhere('first_name', 'like', "%{$search}%");
                        break;
                    case 'employee_id':
                        $q->where('id', 'like', "%{$search}%");
                        break;
                    default:
                        $q->where('surname', 'like', "%{$search}%")
                            ->orWhere('first_name', 'like', "%{$search}%")
                            ->orWhere('id', 'like', "%{$search}%");
                }
            });
        }

        if ($departmentId) {
            $query->where('department_id', $departmentId);
        }

        $employees = $query->paginate($perPage)->withQueryString();

        // Load leave balances for each employee
        $leaveTypes = LeaveType::active()->ordered()->get();
        
        $employees->getCollection()->transform(function ($employee) use ($year, $leaveTypes) {
            $balances = [];
            foreach ($leaveTypes as $leaveType) {
                $balance = LeaveBalance::where('employee_id', $employee->id)
                    ->where('leave_type_id', $leaveType->id)
                    ->where('year', $year)
                    ->first();
                
                $balances[$leaveType->code] = [
                    'leave_type_id' => $leaveType->id,
                    'entitled' => (float) ($balance?->entitled ?? 0),
                    'used' => (float) ($balance?->used ?? 0),
                    'balance' => (float) ($balance?->balance ?? 0),
                    'is_manually_set' => $balance?->is_manually_set ?? false,
                ];
            }
            $employee->leave_balances = $balances;
            return $employee;
        });

        // Get departments for filter
        $departments = \App\Models\Department::orderBy('name')->get(['id', 'name']);

        return Inertia::render('admin/leave-balances/index', [
            'employees' => $employees,
            'leaveTypes' => $leaveTypes,
            'departments' => $departments,
            'year' => $year,
            'availableYears' => $this->getAvailableYears(),
            'filters' => [
                'search' => $search,
                'search_mode' => $searchMode,
                'department_id' => $departmentId,
            ],
        ]);
    }

    /**
     * Show the form for adjusting an employee's leave balance
     */
    public function show(Request $request, string $employeeId): Response
    {
        $employee = Employee::with(['department', 'position'])->findOrFail($employeeId);
        $year = $request->integer('year', now()->year);

        // Get all leave types and their balances
        $leaveTypes = LeaveType::active()->ordered()->get();
        $balances = [];

        foreach ($leaveTypes as $leaveType) {
            $balance = LeaveBalance::getOrCreateBalance($employeeId, $leaveType->id, $year);
            // Cast decimal values to float for frontend
            $balance->balance = (float) $balance->balance;
            $balance->entitled = (float) $balance->entitled;
            $balance->used = (float) $balance->used;
            $balance->pending = (float) $balance->pending;
            $balance->accrued = (float) $balance->accrued;
            $balance->initial_balance = (float) $balance->initial_balance;
            $balance->carried_over = (float) $balance->carried_over;
            
            $balances[] = [
                'leave_type' => $leaveType,
                'balance' => $balance,
                'is_available' => $leaveType->isAvailableFor($employee),
            ];
        }

        // Get adjustment history and cast amount to float
        $history = $this->leaveService->getAdjustmentHistory($employeeId, null, $year)
            ->map(function ($item) {
                $item->amount = (float) $item->amount;
                return $item;
            });

        // Get special leave grants and cast amounts to float
        $specialGrants = $this->leaveService->getSpecialLeaveGrants($employeeId, $year);
        foreach ($specialGrants as &$grant) {
            $grant['total_granted'] = (float) $grant['total_granted'];
            foreach ($grant['grants'] as &$g) {
                $g['amount'] = (float) $g['amount'];
            }
        }

        return Inertia::render('admin/leave-balances/show', [
            'employee' => $employee,
            'balances' => $balances,
            'history' => $history,
            'specialGrants' => $specialGrants,
            'year' => $year,
            'availableYears' => $this->getAvailableYears(),
            'accrualTypes' => LeaveAccrual::getAccrualTypes(),
        ]);
    }

    /**
     * Set initial balance for an employee (system migration)
     */
    public function setInitialBalance(Request $request, string $employeeId)
    {
        $validated = $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'balance' => 'required|numeric|min:0',
            'used_to_date' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:500',
            'as_of_date' => 'nullable|date',
            'year' => 'nullable|integer|min:2000|max:2100',
        ]);

        try {
            $employee = Employee::findOrFail($employeeId);
            $leaveType = LeaveType::findOrFail($validated['leave_type_id']);

            $result = $this->leaveService->setInitialBalance(
                $employeeId,
                $validated['leave_type_id'],
                $validated['balance'],
                $validated['used_to_date'] ?? 0,
                $validated['notes'],
                $validated['as_of_date'] ? Carbon::parse($validated['as_of_date']) : null,
                $validated['year']
            );

            return response()->json([
                'success' => true,
                'message' => "Initial {$leaveType->name} balance set successfully for {$employee->first_name} {$employee->surname}",
                'balance' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to set initial balance', [
                'employee_id' => $employeeId,
                'data' => $validated,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to set initial balance: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Adjust leave balance (add or deduct credits)
     */
    public function adjustBalance(Request $request, string $employeeId)
    {
        $validated = $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'amount' => 'required|numeric',
            'reason' => 'required|string|max:500',
            'adjustment_type' => 'nullable|string|in:adjustment,correction,manual,restored,forfeited',
            'year' => 'nullable|integer|min:2000|max:2100',
        ]);

        try {
            $employee = Employee::findOrFail($employeeId);
            $leaveType = LeaveType::findOrFail($validated['leave_type_id']);

            $result = $this->leaveService->adjustBalance(
                $employeeId,
                $validated['leave_type_id'],
                $validated['amount'],
                $validated['reason'],
                $validated['adjustment_type'] ?? LeaveAccrual::TYPE_ADJUSTMENT,
                $validated['year']
            );

            $action = $validated['amount'] >= 0 ? 'added to' : 'deducted from';

            return response()->json([
                'success' => true,
                'message' => abs($validated['amount']) . " days {$action} {$leaveType->name} for {$employee->first_name} {$employee->surname}",
                'balance' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to adjust balance', [
                'employee_id' => $employeeId,
                'data' => $validated,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to adjust balance: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Grant special leave credits
     */
    public function grantSpecialLeave(Request $request, string $employeeId)
    {
        $validated = $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'days' => 'required|numeric|min:0.5',
            'reason' => 'required|string|max:500',
            'supporting_document' => 'nullable|string|max:255',
            'year' => 'nullable|integer|min:2000|max:2100',
        ]);

        try {
            $employee = Employee::findOrFail($employeeId);
            $leaveType = LeaveType::findOrFail($validated['leave_type_id']);

            $result = $this->leaveService->grantSpecialLeave(
                $employeeId,
                $validated['leave_type_id'],
                $validated['days'],
                $validated['reason'],
                $validated['supporting_document'],
                $validated['year']
            );

            return response()->json([
                'success' => true,
                'message' => "{$validated['days']} days of {$leaveType->name} granted to {$employee->first_name} {$employee->surname}",
                'balance' => $result,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to grant special leave', [
                'employee_id' => $employeeId,
                'data' => $validated,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to grant special leave: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get employee's leave balance details (API)
     */
    public function getEmployeeBalance(Request $request, string $employeeId)
    {
        $year = $request->integer('year', now()->year);
        
        try {
            $employee = Employee::with(['department', 'position'])->findOrFail($employeeId);
            $balances = $this->leaveService->getEmployeeBalance($employeeId, $year);
            $history = $this->leaveService->getAdjustmentHistory($employeeId, null, $year);
            $specialGrants = $this->leaveService->getSpecialLeaveGrants($employeeId, $year);

            return response()->json([
                'employee' => $employee,
                'balances' => $balances,
                'history' => $history,
                'specialGrants' => $specialGrants,
                'year' => $year,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Employee not found',
            ], 404);
        }
    }

    /**
     * Bulk set initial balances (for migration)
     */
    public function bulkSetInitialBalances(Request $request)
    {
        $validated = $request->validate([
            'balances' => 'required|array|min:1',
            'balances.*.employee_id' => 'required|exists:employees,id',
            'balances.*.leave_type_id' => 'required|exists:leave_types,id',
            'balances.*.balance' => 'required|numeric|min:0',
            'balances.*.used_to_date' => 'nullable|numeric|min:0',
            'balances.*.notes' => 'nullable|string|max:500',
            'as_of_date' => 'nullable|date',
        ]);

        try {
            $asOfDate = $validated['as_of_date'] 
                ? Carbon::parse($validated['as_of_date']) 
                : null;

            $results = $this->leaveService->bulkSetInitialBalances(
                $validated['balances'],
                $asOfDate
            );

            return response()->json([
                'success' => true,
                'message' => count($results['success']) . ' balances set successfully',
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to bulk set initial balances', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to set initial balances: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get available years for leave data
     */
    protected function getAvailableYears(): array
    {
        $currentYear = now()->year;
        $startYear = $currentYear - 5;
        $endYear = $currentYear + 1;

        $years = [];
        for ($year = $endYear; $year >= $startYear; $year--) {
            $years[] = $year;
        }

        return $years;
    }

    /**
     * Get special leave types (for dropdown)
     */
    public function getSpecialLeaveTypes()
    {
        $specialLeaveTypes = LeaveType::active()
            ->where('is_special_leave', true)
            ->ordered()
            ->get(['id', 'name', 'code', 'max_days_per_year', 'gender_restriction']);

        return response()->json([
            'leaveTypes' => $specialLeaveTypes,
        ]);
    }
}


