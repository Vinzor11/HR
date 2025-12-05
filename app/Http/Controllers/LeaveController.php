<?php

namespace App\Http\Controllers;

use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Services\LeaveService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class LeaveController extends Controller
{
    protected LeaveService $leaveService;

    public function __construct(LeaveService $leaveService)
    {
        $this->leaveService = $leaveService;
    }

    /**
     * Display leave balance for current user
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

        return Inertia::render('leaves/balance', [
            'balances' => $balances,
            'year' => $year,
            'availableYears' => $this->getAvailableYears(),
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
        $departmentId = $request->integer('department_id');

        // Default to current month if no dates provided
        if (!$dateFrom || !$dateTo) {
            $startDate = now()->startOfMonth();
            $endDate = now()->endOfMonth();
        } else {
            $startDate = Carbon::parse($dateFrom)->startOfDay();
            $endDate = Carbon::parse($dateTo)->endOfDay();
        }

        $leaves = $this->leaveService->getLeaveCalendar($startDate, $endDate, $employeeId, $departmentId);

        // Get leave types for filter dropdown
        $leaveTypes = LeaveType::active()->ordered()->get(['id', 'name', 'code']);

        return Inertia::render('leaves/calendar', [
            'leaves' => $leaves,
            'dateFrom' => $dateFrom ?: $startDate->format('Y-m-d'),
            'dateTo' => $dateTo ?: $endDate->format('Y-m-d'),
            'leaveTypes' => $leaveTypes,
            'selectedEmployeeId' => $employeeId,
            'selectedDepartmentId' => $departmentId,
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

        return response()->json([
            'balances' => $balances,
            'year' => $year,
        ]);
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

