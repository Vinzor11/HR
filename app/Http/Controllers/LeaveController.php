<?php

namespace App\Http\Controllers;

use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Employee;
use App\Services\LeaveService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * LeaveController - CS Form No. 6 Compliant
 * 
 * Handles leave-related views and API endpoints
 */
class LeaveController extends Controller
{
    protected LeaveService $leaveService;

    public function __construct(LeaveService $leaveService)
    {
        $this->leaveService = $leaveService;
    }

    /**
     * Display leave balance for current user
     * Shows CSC-compliant leave credits (VL, SL, SPL, etc.)
     */
    public function myBalance(Request $request): Response
    {
        $user = $request->user();
        $employeeId = $user->employee_id;

        if (!$employeeId) {
            return Inertia::render('leaves/balance', [
                'error' => 'No employee record found for your account.',
            ]);
        }

        $year = $request->integer('year', now()->year);
        $balances = $this->leaveService->getEmployeeBalance($employeeId, $year);

        // Get forced leave status (CSC requirement)
        $forcedLeaveStatus = $this->leaveService->getForcedLeaveStatus($employeeId, $year);

        // Get leave credits as of today for CS Form No. 6 Section 7
        $leaveCredits = $this->leaveService->getLeaveCreditsAsOfDate($employeeId);

        // When will employee start earning leave credits? (based on designation start date)
        $accrualEligibility = $this->getAccrualEligibility($employeeId);

        return Inertia::render('leaves/balance', [
            'balances' => $balances,
            'year' => $year,
            'availableYears' => $this->getAvailableYears(),
            'forcedLeaveStatus' => $forcedLeaveStatus,
            'leaveCredits' => $leaveCredits,
            'accrualEligibility' => $accrualEligibility,
        ]);
    }

    /**
     * Display leave calendar
     */
    public function calendar(Request $request): Response
    {
        $user = $request->user();
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $employeeId = $request->input('employee_id');
        $unitId = $request->integer('unit_id');

        // Default to current month if no dates provided
        if (!$dateFrom || !$dateTo) {
            $startDate = now()->startOfMonth();
            $endDate = now()->endOfMonth();
        } else {
            $startDate = Carbon::parse($dateFrom)->startOfDay();
            $endDate = Carbon::parse($dateTo)->endOfDay();
        }

        $leaves = $this->leaveService->getLeaveCalendar($startDate, $endDate, $employeeId, $unitId);

        // Get leave types for filter dropdown
        $leaveTypes = LeaveType::active()->ordered()->get(['id', 'name', 'code']);
        $units = \App\Models\Unit::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);

        return Inertia::render('leaves/calendar', [
            'leaves' => $leaves,
            'dateFrom' => $dateFrom ?: $startDate->format('Y-m-d'),
            'dateTo' => $dateTo ?: $endDate->format('Y-m-d'),
            'leaveTypes' => $leaveTypes,
            'units' => $units,
            'selectedEmployeeId' => $employeeId,
            'selectedUnitId' => $unitId,
        ]);
    }

    /**
     * Display leave history for current user
     */
    public function myHistory(Request $request): Response
    {
        $user = $request->user();
        $employeeId = $user->employee_id;

        if (!$employeeId) {
            return Inertia::render('leaves/history', [
                'error' => 'No employee record found for your account.',
            ]);
        }

        $perPage = $request->integer('per_page', 15);
        $status = $request->input('status');
        $leaveTypeId = $request->integer('leave_type_id');

        $query = LeaveRequest::with(['leaveType:id,name,code', 'approver:id,name', 'rejector:id,name'])
            ->forEmployee($employeeId)
            ->orderByDesc('start_date');

        if ($status) {
            $query->where('status', $status);
        }

        if ($leaveTypeId) {
            $query->where('leave_type_id', $leaveTypeId);
        }

        try {
            $requests = $query->paginate($perPage)->withQueryString();

            return Inertia::render('leaves/history', [
                'requests' => $requests,
                'leaveTypes' => LeaveType::active()->ordered()->get(),
                'filters' => [
                    'status' => $status,
                    'leave_type_id' => $leaveTypeId,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Error loading leave history', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return Inertia::render('leaves/history', [
                'requests' => new \Illuminate\Pagination\LengthAwarePaginator([], 0, $perPage),
                'leaveTypes' => LeaveType::active()->ordered()->get(),
                'filters' => [
                    'status' => $status,
                    'leave_type_id' => $leaveTypeId,
                ],
                'error' => 'Error loading leave history. Please try again.',
            ]);
        }
    }

    /**
     * Get leave balance API endpoint
     * Returns CSC-compliant leave credits
     */
    public function getBalance(Request $request)
    {
        $user = $request->user();
        $employeeId = $user->employee_id;

        if (!$employeeId) {
            return response()->json(['error' => 'No employee record found'], 404);
        }

        $year = $request->integer('year', now()->year);
        $balances = $this->leaveService->getEmployeeBalance($employeeId, $year);
        
        // Include forced leave status and leave credits for CS Form No. 6
        $forcedLeaveStatus = $this->leaveService->getForcedLeaveStatus($employeeId, $year);
        $leaveCredits = $this->leaveService->getLeaveCreditsAsOfDate($employeeId);

        return response()->json([
            'balances' => $balances,
            'year' => $year,
            'forcedLeaveStatus' => $forcedLeaveStatus,
            'leaveCredits' => $leaveCredits,
        ]);
    }

    /**
     * Get leave history for a specific leave type
     * Returns accrual/adjustment history (earned/spent)
     */
    public function getLeaveHistory(Request $request)
    {
        $user = $request->user();
        $employeeId = $user->employee_id;

        if (!$employeeId) {
            return response()->json(['error' => 'No employee record found'], 404);
        }

        $validated = $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'year' => 'nullable|integer|min:2000|max:2100',
        ]);

        $year = $validated['year'] ?? now()->year;
        $history = $this->leaveService->getAdjustmentHistory(
            $employeeId,
            $validated['leave_type_id'],
            $year
        )->map(function ($item) {
            // Get the type label using the accessor
            $typeLabel = $item->accrual_type_label;
            
            return [
                'id' => $item->id,
                'date' => $item->accrual_date->format('Y-m-d'),
                'type' => $item->accrual_type,
                'type_label' => $typeLabel,
                'amount' => (float) $item->amount,
                'notes' => $item->notes,
                'reference_number' => $item->reference_number,
                'created_by' => $item->creator?->name ?? 'System',
            ];
        });

        return response()->json([
            'history' => $history,
            'year' => $year,
        ]);
    }

    /**
     * Get leave credits certification for CS Form No. 6 Section 7
     * Returns VL and SL balances as of a specific date
     */
    public function getLeaveCredits(Request $request)
    {
        $user = $request->user();
        $employeeId = $request->input('employee_id', $user->employee_id);

        if (!$employeeId) {
            return response()->json(['error' => 'No employee record found'], 404);
        }

        // Check if user can view other employee's credits
        if ($employeeId !== $user->employee_id && !$user->can('access-employees-module')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $asOfDate = $request->input('as_of_date') 
            ? Carbon::parse($request->input('as_of_date'))
            : now();

        $credits = $this->leaveService->getLeaveCreditsAsOfDate($employeeId, $asOfDate);
        $forcedLeaveStatus = $this->leaveService->getForcedLeaveStatus($employeeId, $asOfDate->year);

        // Get employee info for certification
        $employee = Employee::find($employeeId);

        return response()->json([
            'employee' => $employee ? [
                'id' => $employee->id,
                'name' => trim("{$employee->first_name} {$employee->middle_name} {$employee->surname}"),
                'position' => $employee->position?->title,
                'department' => $employee->department?->name,
            ] : null,
            'credits' => $credits,
            'forcedLeaveStatus' => $forcedLeaveStatus,
            'certifiedBy' => $user->name,
            'certifiedAt' => now()->format('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Get available leave types for an employee
     * Filters by gender and eligibility per CSC rules
     */
    public function getAvailableLeaveTypes(Request $request)
    {
        $user = $request->user();
        $employeeId = $user->employee_id;

        if (!$employeeId) {
            // Return all active leave types if no employee record
            return response()->json([
                'leaveTypes' => LeaveType::active()->ordered()->get(),
            ]);
        }

        $employee = Employee::find($employeeId);
        if (!$employee) {
            return response()->json([
                'leaveTypes' => LeaveType::active()->ordered()->get(),
            ]);
        }

        $leaveTypes = $this->leaveService->getAvailableLeaveTypes($employee);

        return response()->json([
            'leaveTypes' => $leaveTypes,
        ]);
    }

    /**
     * Get accrual eligibility info for display on leave balance page.
     * Employees only earn VL/SL when designated; credits start from designation start_date.
     */
    protected function getAccrualEligibility(string $employeeId): array
    {
        $employee = Employee::with('designations')->find($employeeId);
        if (!$employee) {
            return ['status' => 'no_designation', 'start_date' => null, 'message' => null];
        }

        $designations = $employee->designations;
        if ($designations->isEmpty()) {
            return [
                'status' => 'no_designation',
                'start_date' => null,
                'message' => 'You will start earning leave credits when a designation is added. Ask your admin to add your unit/position in Manage Designations.',
            ];
        }

        // Get earliest designation start_date (when they first became/Will become eligible)
        $earliestStart = $designations->min('start_date');
        if (!$earliestStart) {
            return ['status' => 'no_designation', 'start_date' => null, 'message' => null];
        }

        $startDate = $earliestStart instanceof \Carbon\Carbon
            ? $earliestStart
            : Carbon::parse($earliestStart);
        $today = now()->startOfDay();

        if ($startDate->gt($today)) {
            return [
                'status' => 'starts_future',
                'start_date' => $startDate->format('Y-m-d'),
                'message' => 'You will start earning leave credits from ' . $startDate->format('F j, Y') . ' when your designation begins.',
            ];
        }

        return [
            'status' => 'earning',
            'start_date' => $startDate->format('Y-m-d'),
            'message' => 'You started earning leave credits from ' . $startDate->format('F j, Y') . '.',
        ];
    }

    /**
     * Get available years for leave data
     * Returns years from first leave record to current year + 1
     */
    protected function getAvailableYears(): array
    {
        $currentYear = now()->year;
        
        // Get the earliest year from leave balances
        $earliestBalance = \App\Models\LeaveBalance::min('year');
        
        // Get the earliest year from leave requests
        $earliestRequest = \App\Models\LeaveRequest::whereNotNull('start_date')
            ->selectRaw('MIN(YEAR(start_date)) as min_year')
            ->value('min_year');
        
        $startYear = min(
            filter_var($earliestBalance, FILTER_VALIDATE_INT) ?: $currentYear,
            filter_var($earliestRequest, FILTER_VALIDATE_INT) ?: $currentYear,
            $currentYear
        );
        
        // Always include current year and next year
        $endYear = $currentYear + 1;
        
        // Ensure we have at least 5 years shown, but start from earliest data
        if ($endYear - $startYear < 4) {
            $startYear = max($endYear - 4, $currentYear - 4);
        }
        
        $years = [];
        for ($year = $endYear; $year >= $startYear; $year--) {
            $years[] = $year;
        }
        
        return $years;
    }
}

