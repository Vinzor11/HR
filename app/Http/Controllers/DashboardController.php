<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Department;
use App\Models\Position;
use App\Models\RequestSubmission;
use App\Models\RequestType;
use App\Models\Training;
use App\Models\User;
use App\Models\EmployeeAuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        
        // Ensure user is authenticated
        if (!$user) {
            abort(401, 'Unauthenticated');
        }
        
        $data = [];

        // 1. Top Summary Cards ("At a Glance")
        $data['summary_cards'] = $this->getSummaryCards($user);

        // 2. Requests Overview Section
        $data['recent_requests'] = $this->getRecentRequests($user);

        // 3. Fulfillment Queue
        if ($user->can('access-request-types-module') || $this->userCanFulfill($user)) {
            $data['fulfillment_queue'] = $this->getFulfillmentQueue($user);
        }

        // 4. Employee Insights
        if ($user->can('access-employees-module')) {
            $data['employee_insights'] = $this->getEmployeeInsights();
        }

        // 5. Quick Actions (permission-based)
        $data['quick_actions'] = $this->getQuickActions($user);

        // 6. Analytics Data
        $data['analytics'] = $this->getAnalytics($user);

        // 7. Notifications/Alerts
        $data['notifications'] = $this->getNotifications($user);

        // 8. Request Type Statistics (for Dynamic Builder)
        if ($user->can('access-request-types-module')) {
            $data['request_type_stats'] = $this->getRequestTypeStats();
        }

        return Inertia::render('dashboard', $data);
    }

    private function getSummaryCards($user): array
    {
        $cards = [];

        // Total Employees
        if ($user->can('access-employees-module')) {
            $totalEmployees = Employee::where('status', 'active')->count();
            $newThisWeek = Employee::where('status', 'active')
                ->whereBetween('created_at', [Carbon::now()->startOfWeek(), Carbon::now()])
                ->count();

            $cards[] = [
                'title' => 'Total Employees',
                'value' => $totalEmployees,
                'trend' => $newThisWeek > 0 ? "+{$newThisWeek} this week" : null,
                'icon' => 'Users',
                'color' => 'blue',
                'link' => route('employees.index'),
            ];
        }

        // Pending HR Requests
        $pendingRequests = RequestSubmission::where('status', 'pending')->count();
        $cards[] = [
            'title' => 'Pending HR Requests',
            'value' => $pendingRequests,
            'trend' => null,
            'icon' => 'Clock',
            'color' => 'amber',
            'link' => route('requests.index', ['status' => 'pending']),
        ];

        // Requests In Fulfillment
        $fulfillmentRequests = RequestSubmission::where('status', 'fulfillment')->count();
        $cards[] = [
            'title' => 'Requests In Fulfillment',
            'value' => $fulfillmentRequests,
            'trend' => null,
            'icon' => 'FileCheck',
            'color' => 'sky',
            'link' => route('requests.index', ['status' => 'fulfillment']),
        ];

        // Completed Requests
        $completedRequests = RequestSubmission::where('status', 'completed')
            ->whereBetween('updated_at', [Carbon::now()->startOfWeek(), Carbon::now()])
            ->count();
        $cards[] = [
            'title' => 'Completed Requests',
            'value' => RequestSubmission::where('status', 'completed')->count(),
            'trend' => $completedRequests > 0 ? "+{$completedRequests} this week" : null,
            'icon' => 'CheckCircle2',
            'color' => 'emerald',
            'link' => route('requests.index', ['status' => 'completed']),
        ];

        // Upcoming Birthdays
        if ($user->can('access-employees-module')) {
            $upcomingBirthdays = Employee::where('status', 'active')
                ->whereRaw('DAYOFYEAR(birth_date) BETWEEN DAYOFYEAR(NOW()) AND DAYOFYEAR(DATE_ADD(NOW(), INTERVAL 7 DAY))')
                ->count();
            $cards[] = [
                'title' => 'Upcoming Birthdays',
                'value' => $upcomingBirthdays,
                'trend' => 'Next 7 days',
                'icon' => 'Cake',
                'color' => 'pink',
                'link' => route('employees.index'),
            ];
        }

        // Active Trainings
        $activeTrainings = Training::where('date_from', '<=', Carbon::now())
            ->where('date_to', '>=', Carbon::now())
            ->count();
        $cards[] = [
            'title' => 'Active Trainings',
            'value' => $activeTrainings,
            'trend' => null,
            'icon' => 'GraduationCap',
            'color' => 'indigo',
            'link' => route('trainings.index'),
        ];

        // Pending Approvals (for current user)
        $roleIds = $user->roles->pluck('id');
        $myPendingApprovals = RequestSubmission::whereHas('approvalActions', function ($query) use ($user, $roleIds) {
            $query->where('status', 'pending')
                ->whereColumn('request_approval_actions.step_index', 'request_submissions.current_step_index')
                ->where(function ($q) use ($user, $roleIds) {
                    $q->where('approver_id', $user->id);
                    if ($roleIds->isNotEmpty()) {
                        $q->orWhereIn('approver_role_id', $roleIds);
                    }
                });
        })->count();

        $cards[] = [
            'title' => 'Pending Approvals',
            'value' => $myPendingApprovals,
            'trend' => $myPendingApprovals > 0 ? 'Requires action' : null,
            'icon' => 'AlertCircle',
            'color' => 'red',
            'link' => route('requests.index', ['scope' => 'assigned']),
        ];

        return $cards;
    }

    private function getRecentRequests($user): array
    {
        $query = RequestSubmission::with(['requestType', 'user.employee'])
            ->orderByDesc('submitted_at')
            ->limit(5);

        if (!$user->can('access-request-types-module')) {
            $query->where('user_id', $user->id);
        }

        return $query->get()->map(function ($submission) {
            return [
                'id' => $submission->id,
                'reference_code' => $submission->reference_code,
                'request_type' => $submission->requestType->name ?? 'Unknown',
                'requester' => $submission->user->employee 
                    ? trim("{$submission->user->employee->first_name} {$submission->user->employee->surname}")
                    : $submission->user->name,
                'requester_employee_id' => $submission->user->employee_id ?? null,
                'status' => $submission->status,
                'submitted_at' => $submission->submitted_at?->diffForHumans(),
                'submitted_at_raw' => $submission->submitted_at?->toDateTimeString(),
            ];
        })->toArray();
    }

    private function getFulfillmentQueue($user): array
    {
        $query = RequestSubmission::with(['requestType', 'user.employee'])
            ->where('status', 'fulfillment')
            ->orderBy('submitted_at')
            ->limit(10);

        // If user doesn't have full access, only show requests they can fulfill
        if (!$user->can('access-request-types-module')) {
            $query->whereHas('approvalActions', function ($q) use ($user) {
                $q->where('status', 'approved')
                    ->where('approver_id', $user->id)
                    ->whereRaw('request_approval_actions.step_index = (
                        select max(ria_max.step_index)
                        from request_approval_actions as ria_max
                        where ria_max.submission_id = request_approval_actions.submission_id
                    )');
            });
        }

        return $query->get()->map(function ($submission) {
            $daysPending = $submission->submitted_at 
                ? Carbon::parse($submission->submitted_at)->diffInDays(Carbon::now())
                : 0;

            return [
                'id' => $submission->id,
                'reference_code' => $submission->reference_code,
                'request_type' => $submission->requestType->name ?? 'Unknown',
                'requester' => $submission->user->employee 
                    ? trim("{$submission->user->employee->first_name} {$submission->user->employee->surname}")
                    : $submission->user->name,
                'requester_employee_id' => $submission->user->employee_id ?? null,
                'days_pending' => $daysPending,
                'is_urgent' => $daysPending >= 3,
                'submitted_at' => $submission->submitted_at?->toDateString(),
                'fulfillment_url' => route('requests.show', $submission->id),
            ];
        })->toArray();
    }

    private function getEmployeeInsights(): array
    {
        // Top 5 departments
        $topDepartments = Department::withCount('employees')
            ->orderByDesc('employees_count')
            ->limit(5)
            ->get()
            ->map(fn ($dept) => [
                'name' => $dept->faculty_name,
                'count' => $dept->employees_count,
            ]);

        // Employees on leave today
        $onLeaveToday = Employee::where('status', 'on-leave')->count();

        // Status summary
        $statusSummary = Employee::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status')
            ->toArray();

        return [
            'top_departments' => $topDepartments,
            'on_leave_today' => $onLeaveToday,
            'status_summary' => $statusSummary,
            'total_active' => $statusSummary['active'] ?? 0,
            'total_inactive' => $statusSummary['inactive'] ?? 0,
        ];
    }

    private function getQuickActions($user): array
    {
        $actions = [];

        if ($user->can('access-request-types-module')) {
            $actions[] = [
                'label' => 'Dynamic Builder',
                'icon' => 'Wand2',
                'link' => route('request-types.index'),
                'color' => 'purple',
            ];
        }

        $actions[] = [
            'label' => 'New Request',
            'icon' => 'Plus',
            'link' => route('requests.index'),
            'color' => 'blue',
        ];

        if ($user->can('access-employees-module')) {
            $actions[] = [
                'label' => 'Add Employee',
                'icon' => 'UserPlus',
                'link' => route('employees.create'),
                'color' => 'emerald',
            ];
        }

        if ($user->can('access-request-types-module')) {
            $actions[] = [
                'label' => 'Approve Requests',
                'icon' => 'CheckCircle',
                'link' => route('requests.index', ['scope' => 'assigned']),
                'color' => 'amber',
            ];
        }

        if ($user->can('access-request-types-module') || $this->userCanFulfill($user)) {
            $actions[] = [
                'label' => 'Fulfillment Queue',
                'icon' => 'FileCheck',
                'link' => route('requests.index', ['status' => 'fulfillment']),
                'color' => 'sky',
            ];
        }

        if ($user->can('access-employees-module')) {
            $actions[] = [
                'label' => 'Add Training',
                'icon' => 'GraduationCap',
                'link' => route('trainings.index'),
                'color' => 'indigo',
            ];
        }

        return $actions;
    }

    private function getAnalytics($user): array
    {
        $analytics = [];

        // Monthly HR Requests (last 6 months) - only for users with request module access
        if ($user->can('access-request-types-module')) {
            $monthlyRequests = RequestSubmission::select(
                DB::raw('DATE_FORMAT(submitted_at, "%Y-%m") as month'),
                DB::raw('COUNT(*) as count')
            )
                ->where('submitted_at', '>=', Carbon::now()->subMonths(5)->startOfMonth())
                ->whereNotNull('submitted_at')
                ->groupBy('month')
                ->orderBy('month')
                ->get()
                ->keyBy('month');

            // Generate all 6 months with 0 for missing months
            $allMonths = [];
            for ($i = 5; $i >= 0; $i--) {
                $month = Carbon::now()->subMonths($i)->startOfMonth();
                $monthKey = $month->format('Y-m');
                $allMonths[] = [
                    'month' => $month->format('M Y'),
                    'count' => $monthlyRequests->has($monthKey) ? (int) $monthlyRequests[$monthKey]->count : 0,
                ];
            }

            $analytics['monthly_requests'] = $allMonths;
        } else {
            // For regular users, show only their own requests
            $monthlyRequests = RequestSubmission::where('user_id', $user->id)
                ->select(
                    DB::raw('DATE_FORMAT(submitted_at, "%Y-%m") as month'),
                    DB::raw('COUNT(*) as count')
                )
                ->where('submitted_at', '>=', Carbon::now()->subMonths(5)->startOfMonth())
                ->whereNotNull('submitted_at')
                ->groupBy('month')
                ->orderBy('month')
                ->get()
                ->keyBy('month');

            // Generate all 6 months with 0 for missing months
            $allMonths = [];
            for ($i = 5; $i >= 0; $i--) {
                $month = Carbon::now()->subMonths($i)->startOfMonth();
                $monthKey = $month->format('Y-m');
                $allMonths[] = [
                    'month' => $month->format('M Y'),
                    'count' => $monthlyRequests->has($monthKey) ? (int) $monthlyRequests[$monthKey]->count : 0,
                ];
            }

            $analytics['monthly_requests'] = $allMonths;
        }

        // Most common request types
        if ($user->can('access-request-types-module')) {
            $requestTypes = RequestType::withCount('submissions')
                ->orderByDesc('submissions_count')
                ->limit(5)
                ->get()
                ->map(fn ($type) => [
                    'name' => $type->name,
                    'count' => $type->submissions_count,
                ]);

            $analytics['request_types'] = $requestTypes;
        }

        // Employee growth (last 5 years)
        if ($user->can('access-employees-module')) {
            $employeeGrowth = Employee::select(
                DB::raw('YEAR(created_at) as year'),
                DB::raw('COUNT(*) as count')
            )
                ->where('created_at', '>=', Carbon::now()->subYears(5))
                ->groupBy('year')
                ->orderBy('year')
                ->get()
                ->map(fn ($item) => [
                    'year' => (string) $item->year,
                    'count' => $item->count,
                ]);

            $analytics['employee_growth'] = $employeeGrowth;
        }

        return $analytics;
    }

    private function getNotifications($user): array
    {
        $notifications = [];

        // Requests pending for more than 3 days
        $oldPendingRequests = RequestSubmission::where('status', 'pending')
            ->where('submitted_at', '<=', Carbon::now()->subDays(3))
            ->count();

        if ($oldPendingRequests > 0) {
            $notifications[] = [
                'type' => 'warning',
                'title' => "{$oldPendingRequests} requests pending for more than 3 days",
                'message' => 'These requests require immediate attention.',
                'link' => route('requests.index', ['status' => 'pending']),
                'icon' => 'Clock',
            ];
        }

        // Urgent fulfillment requests
        $urgentFulfillments = RequestSubmission::where('status', 'fulfillment')
            ->where('submitted_at', '<=', Carbon::now()->subDays(3))
            ->count();

        if ($urgentFulfillments > 0) {
            $notifications[] = [
                'type' => 'urgent',
                'title' => "{$urgentFulfillments} urgent certificate/document requests",
                'message' => 'These require immediate fulfillment.',
                'link' => route('requests.index', ['status' => 'fulfillment']),
                'icon' => 'FileWarning',
            ];
        }

        // Trainings happening this week
        $upcomingTrainings = Training::whereBetween('date_from', [
            Carbon::now()->startOfWeek(),
            Carbon::now()->endOfWeek(),
        ])->count();

        if ($upcomingTrainings > 0) {
            $notifications[] = [
                'type' => 'info',
                'title' => "{$upcomingTrainings} training(s) happening this week",
                'message' => 'Check the training schedule.',
                'link' => route('trainings.index'),
                'icon' => 'GraduationCap',
            ];
        }

        return $notifications;
    }

    private function getRequestTypeStats(): array
    {
        return RequestType::withCount('submissions')
            ->orderByDesc('submissions_count')
            ->limit(10)
            ->get()
            ->map(fn ($type) => [
                'id' => $type->id,
                'name' => $type->name,
                'is_published' => $type->is_published,
                'submissions_count' => $type->submissions_count,
                'created_at' => $type->created_at?->diffForHumans(),
            ])
            ->toArray();
    }

    private function userCanFulfill($user): bool
    {
        return RequestSubmission::where('status', 'fulfillment')
            ->whereHas('approvalActions', function ($q) use ($user) {
                $q->where('status', 'approved')
                    ->where('approver_id', $user->id)
                    ->whereRaw('request_approval_actions.step_index = (
                        select max(ria_max.step_index)
                        from request_approval_actions as ria_max
                        where ria_max.submission_id = request_approval_actions.submission_id
                    )');
            })
            ->exists();
    }
}

