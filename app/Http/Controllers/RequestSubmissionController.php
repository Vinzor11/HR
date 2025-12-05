<?php

namespace App\Http\Controllers;

use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\RequestAnswer;
use App\Models\RequestApprovalAction;
use App\Models\RequestField;
use App\Models\RequestSubmission;
use App\Models\RequestType;
use App\Models\Employee;
use App\Models\TrainingApplication;
use App\Models\Department;
use App\Models\Position;
use App\Models\User;
use App\Notifications\RequestFulfilledNotification;
use App\Services\LeaveService;
use App\Services\HierarchicalApproverService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RequestSubmissionController extends Controller
{
    protected LeaveService $leaveService;

    public function __construct(LeaveService $leaveService)
    {
        $this->leaveService = $leaveService;
    }

    public function index(Request $request): Response
    {
        [$submissionsQuery, $filters] = $this->buildSubmissionsQuery($request);
        $submissions = $submissionsQuery->paginate($filters['perPage'])->withQueryString();

        return Inertia::render('requests/index', [
            'submissions' => $submissions,
            'filters' => $filters,
            'requestTypes' => RequestType::orderBy('name')->get(['id', 'name', 'description', 'is_published']),
            'statusOptions' => [
                RequestSubmission::STATUS_PENDING,
                RequestSubmission::STATUS_APPROVED,
                RequestSubmission::STATUS_FULFILLMENT,
                RequestSubmission::STATUS_COMPLETED,
                RequestSubmission::STATUS_REJECTED,
            ],
            'scopeOptions' => [
                ['value' => 'mine', 'label' => 'My Requests'],
                ['value' => 'assigned', 'label' => 'Assigned Approvals'],
                ['value' => 'all', 'label' => 'All Requests'],
            ],
            'canManage' => ($filters['user'] ?? $request->user())->can('access-request-types-module'),
        ]);
    }

    public function export(Request $request)
    {
        [$query] = $this->buildSubmissionsQuery($request);
        $filename = 'hr-requests-' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Reference Code',
                'Request Type',
                'Status',
                'Submitted At',
                'Requester',
                'Employee ID',
                'Fulfilled At',
            ]);

            (clone $query)
                ->reorder('id')
                ->lazyById(200, 'id')
                ->each(function (RequestSubmission $submission) use ($handle) {
                    $submittedAt = $submission->submitted_at
                        ? Carbon::parse($submission->submitted_at)->format('Y-m-d H:i')
                        : optional($submission->created_at)->format('Y-m-d H:i');

                    $fulfilledAt = $submission->fulfilled_at
                        ? Carbon::parse($submission->fulfilled_at)->format('Y-m-d H:i')
                        : null;

                    fputcsv($handle, [
                        $submission->reference_code,
                        $submission->requestType->name ?? 'N/A',
                        ucfirst($submission->status),
                        $submittedAt,
                        $submission->user->name ?? 'Unknown',
                        $submission->user->employee_id ?? '—',
                        $fulfilledAt,
                    ]);
                });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function create(RequestType $requestType): Response
    {
        abort_unless($requestType->isPublished(), 404, 'Request type is not available.');

        $requestType->load(['fields' => fn ($query) => $query->orderBy('sort_order')]);

        return Inertia::render('requests/create', [
            'requestType' => [
                'id' => $requestType->id,
                'name' => $requestType->name,
                'description' => $requestType->description,
                'has_fulfillment' => $requestType->has_fulfillment,
                'fields' => $requestType->fields->map(fn (RequestField $field) => [
                    'id' => $field->id,
                    'field_key' => $field->field_key,
                    'label' => $field->label,
                    'field_type' => $field->field_type,
                    'is_required' => $field->is_required,
                    'description' => $field->description,
                    'options' => $field->options,
                ]),
            ],
        ]);
    }

    public function store(Request $request, RequestType $requestType)
    {
        abort_unless($requestType->isPublished(), 404, 'Request type is not available.');

        $requestType->load(['fields' => fn ($query) => $query->orderBy('sort_order')]);

        $rules = $this->buildDynamicRules($requestType);
        $validated = $request->validate($rules);

        if ($requestType->name === 'Leave Request') {
            $this->assertSufficientLeaveBalance($request, $requestType);
        }

        $submission = DB::transaction(function () use ($request, $requestType) {
            $hasApprovalSteps = $requestType->approvalSteps()->isNotEmpty();

            $submission = RequestSubmission::create([
                'request_type_id' => $requestType->id,
                'user_id' => $request->user()->id,
                'status' => $hasApprovalSteps
                    ? RequestSubmission::STATUS_PENDING
                    : ($requestType->requiresFulfillment()
                        ? RequestSubmission::STATUS_FULFILLMENT
                        : RequestSubmission::STATUS_APPROVED),
                'current_step_index' => $hasApprovalSteps ? 0 : null,
                'approval_state' => $this->buildInitialApprovalState($requestType),
            ]);

            $this->storeAnswers($submission, $request, $requestType);

            if ($hasApprovalSteps) {
                $this->initializeApprovalFlow($submission, $requestType);
            }

            return $submission;
        });

        return redirect()
            ->route('requests.show', $submission)
            ->with('success', 'Request submitted successfully.');
    }

    public function show(Request $request, RequestSubmission $submission): Response
    {
        $submission->load([
            'requestType.fields' => fn ($query) => $query->orderBy('sort_order'),
            'answers.field',
            'approvalActions.approver.employee.position',
            'approvalActions.approverRole',
            'approvalActions.approverPosition',
            'fulfillment.fulfiller',
            'user:id,name,email,employee_id',
            'user.employee:id,first_name,middle_name,surname',
        ]);

        $this->authorizeView($submission, $request->user());

        return Inertia::render('requests/show', [
            'submission' => $this->formatSubmissionPayload($submission),
            'can' => [
                'approve' => $this->userCanApprove($submission, $request->user()),
                'reject' => $this->userCanApprove($submission, $request->user()),
                'fulfill' => $submission->requiresFulfillment()
                    && $submission->status === RequestSubmission::STATUS_FULFILLMENT
                    && $this->userCanFulfill($submission, $request->user()),
            ],
            'downloadRoutes' => [
                'fulfillment' => $submission->fulfillment ? route('requests.fulfillment.download', $submission) : null,
            ],
        ]);
    }

    public function approve(Request $request, RequestSubmission $submission)
    {
        $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->authorizeApproval($submission, $request->user());

        DB::transaction(function () use ($request, $submission) {
            $action = $this->currentActionFor($submission, $request->user());

            if (!$action) {
                throw ValidationException::withMessages([
                    'submission' => 'No pending approval step found for you.',
                ]);
            }

            $action->update([
                'status' => RequestApprovalAction::STATUS_APPROVED,
                'notes' => $request->input('notes'),
                'acted_at' => now(),
                'approver_id' => $action->approver_id ?: $request->user()->id,
            ]);

            $this->updateApprovalState($submission, $action);
            $this->advanceOrComplete($submission);
        });

        return back()->with('success', 'Request approved successfully.');
    }

    public function reject(Request $request, RequestSubmission $submission)
    {
        $request->validate([
            'notes' => ['required', 'string', 'max:1000'],
        ]);

        $this->authorizeApproval($submission, $request->user());

        DB::transaction(function () use ($request, $submission) {
            $action = $this->currentActionFor($submission, $request->user());

            if (!$action) {
                throw ValidationException::withMessages([
                    'submission' => 'No pending approval step found for you.',
                ]);
            }

            $action->update([
                'status' => RequestApprovalAction::STATUS_REJECTED,
                'notes' => $request->input('notes'),
                'acted_at' => now(),
                'approver_id' => $action->approver_id ?: $request->user()->id,
            ]);

            $submission->update([
                'status' => RequestSubmission::STATUS_REJECTED,
                'current_step_index' => null,
            ]);

            $this->updateApprovalState($submission, $action);
            
            // Handle training application rejection
            $this->handleTrainingApplicationRejection($submission);
        });

        return back()->with('success', 'Request rejected and requester has been notified.');
    }

    public function fulfill(Request $request, RequestSubmission $submission)
    {
        abort_unless($submission->requiresFulfillment(), 404);
        abort_unless($this->userCanFulfill($submission, $request->user()), 403);

        $request->validate([
            'file' => ['required', 'file', 'max:15360'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($request, $submission) {
            $path = $request->file('file')->store("requests/fulfillments/{$submission->id}", 'public');

            $submission->fulfillment()->updateOrCreate(
                ['submission_id' => $submission->id],
                [
                    'fulfilled_by' => $request->user()->id,
                    'file_path' => $path,
                    'original_filename' => $request->file('file')->getClientOriginalName(),
                    'notes' => $request->input('notes'),
                    'completed_at' => now(),
                ],
            );

            $submission->update([
                'status' => RequestSubmission::STATUS_COMPLETED,
                'fulfilled_at' => now(),
            ]);
        });

        if ($submission->user) {
            $submission->load('user', 'requestType', 'fulfillment');
            $submission->user->notify(new RequestFulfilledNotification($submission));
        }

        return back()->with('success', 'Request marked as completed and requester notified.');
    }

    public function downloadFulfillment(Request $request, RequestSubmission $submission)
    {
        $submission->load(['fulfillment']);
        abort_unless($submission->fulfillment, 404);
        $this->authorizeView($submission, $request->user());

        $filename = $submission->fulfillment->original_filename ?: basename($submission->fulfillment->file_path);

        return Storage::disk('public')->download($submission->fulfillment->file_path, $filename);
    }

    protected function buildSubmissionsQuery(Request $request): array
    {
        $user = $request->user();
        $scope = $request->input('scope', 'mine');
        $search = (string) $request->input('search', '');
        $status = $request->input('status');
        $requestTypeId = $request->integer('request_type_id');
        $perPage = $request->integer('perPage', 10);
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        if ($scope === 'all' && !$user->can('access-request-types-module')) {
            $scope = 'mine';
        }

        $query = RequestSubmission::with([
            'requestType:id,name,has_fulfillment',
            'user:id,name,email,employee_id',
            'user.employee:id,first_name,middle_name,surname',
            'fulfillment',
        ])
            ->when($status, fn ($builder) => $builder->where('status', $status))
            ->when($search, function ($builder) use ($search) {
                $builder->where(function ($subQuery) use ($search) {
                    $subQuery->where('reference_code', 'like', "%{$search}%")
                        ->orWhereHas('requestType', fn ($typeQuery) => $typeQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($requestTypeId, fn ($builder) => $builder->where('request_type_id', $requestTypeId))
            ->when($dateFrom, fn ($builder) => $builder->whereDate('created_at', '>=', $dateFrom))
            ->when($dateTo, fn ($builder) => $builder->whereDate('created_at', '<=', $dateTo))
            ->orderByDesc('created_at');

        if ($scope === 'assigned') {
            $roleIds = $user->roles->pluck('id');
            $userEmployee = $user->employee_id ? Employee::with(['position', 'department.faculty'])->find($user->employee_id) : null;
            $userPositionId = $userEmployee?->position_id;
            
            $query->where(function ($subQuery) use ($user, $roleIds, $userPositionId) {
                $subQuery->whereHas('approvalActions', function ($actionQuery) use ($user, $roleIds, $userPositionId) {
                    $actionQuery
                        ->where('status', RequestApprovalAction::STATUS_PENDING)
                        ->whereColumn('request_approval_actions.step_index', 'request_submissions.current_step_index')
                        ->where(function ($conditionQuery) use ($user, $roleIds, $userPositionId) {
                            $conditionQuery->where('approver_id', $user->id);

                            if ($roleIds->isNotEmpty()) {
                                $conditionQuery->orWhereIn('approver_role_id', $roleIds);
                            }
                            
                            // Check for position-based approvers
                            if ($userPositionId) {
                                $conditionQuery->orWhere('approver_position_id', $userPositionId);
                            }
                        });
                })->orWhere(function ($fulfillmentQuery) use ($user, $roleIds, $userPositionId) {
                    $fulfillmentQuery
                        ->where('status', RequestSubmission::STATUS_FULFILLMENT)
                        ->whereHas('approvalActions', function ($finalQuery) use ($user, $roleIds, $userPositionId) {
                            $finalQuery
                                ->where('status', RequestApprovalAction::STATUS_APPROVED)
                                ->where(function ($conditionQuery) use ($user, $roleIds, $userPositionId) {
                                    $conditionQuery->where('approver_id', $user->id);

                                    if ($roleIds->isNotEmpty()) {
                                        $conditionQuery->orWhereIn('approver_role_id', $roleIds);
                                    }
                                    
                                    // Check for position-based approvers
                                    if ($userPositionId) {
                                        $conditionQuery->orWhere('approver_position_id', $userPositionId);
                                    }
                                })
                                ->whereRaw('request_approval_actions.step_index = (
                                    select max(ria_max.step_index)
                                    from request_approval_actions as ria_max
                                    where ria_max.submission_id = request_approval_actions.submission_id
                                )');
                        });
                });
            });
        } elseif ($scope === 'mine') {
            $query->where('user_id', $user->id);
        }

        $filters = [
            'scope' => $scope,
            'status' => $status,
            'request_type_id' => $requestTypeId,
            'search' => $search,
            'perPage' => $perPage,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
        ];

        return [$query, $filters];
    }

    protected function buildDynamicRules(RequestType $requestType): array
    {
        $rules = [
            'answers' => ['required', 'array'],
        ];

        foreach ($requestType->fields as $field) {
            $key = "answers.{$field->field_key}";
            $fieldRules = $field->is_required ? ['required'] : ['nullable'];

            switch ($field->field_type) {
                case 'number':
                    $fieldRules[] = 'numeric';
                    break;
                case 'date':
                    $fieldRules[] = 'date';
                    break;
                case 'textarea':
                case 'text':
                    $fieldRules[] = 'string';
                    break;
                case 'checkbox':
                    $fieldRules[] = $field->is_required ? 'accepted' : 'boolean';
                    break;
                case 'dropdown':
                case 'radio':
                    $choices = collect($field->options ?? [])->pluck('value')->filter()->all();
                    $fieldRules[] = 'string';
                    if (!empty($choices)) {
                        $fieldRules[] = Rule::in($choices);
                    }
                    break;
                case 'file':
                    $fieldRules[] = 'file';
                    $fieldRules[] = 'max:10240';
                    break;
                default:
                    $fieldRules[] = 'string';
                    break;
            }

            $rules[$key] = $fieldRules;
        }

        return $rules;
    }

    protected function assertSufficientLeaveBalance(Request $request, RequestType $requestType): void
    {
        if ($requestType->name !== 'Leave Request') {
            return;
        }

        $employeeId = $request->user()->employee_id;
        if (!$employeeId) {
            throw ValidationException::withMessages([
                'answers.leave_type' => 'Your account is not linked to an employee record. Please contact HR.',
            ]);
        }

        $answers = $request->input('answers', []);
        $leaveTypeCode = data_get($answers, 'leave_type');
        $startDate = data_get($answers, 'start_date');
        $endDate = data_get($answers, 'end_date');

        if (!$leaveTypeCode || !$startDate || !$endDate) {
            return;
        }

        $leaveType = LeaveType::where('code', $leaveTypeCode)->first();

        if (!$leaveType) {
            throw ValidationException::withMessages([
                'answers.leave_type' => 'Selected leave type is invalid.',
            ]);
        }

        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        if ($end->lt($start)) {
            throw ValidationException::withMessages([
                'answers.end_date' => 'End date must be after the start date.',
            ]);
        }

        $days = $this->leaveService->calculateWorkingDays($start, $end);

        if (!$this->leaveService->hasSufficientBalance($employeeId, $leaveType->id, $days)) {
            $balance = LeaveBalance::getCurrentYearBalance($employeeId, $leaveType->id);
            $available = $balance ? (float) $balance->balance : 0;

            throw ValidationException::withMessages([
                'answers.leave_type' => "Insufficient leave balance. Only {$available} day(s) available.",
            ]);
        }
    }

    protected function storeAnswers(RequestSubmission $submission, Request $request, RequestType $requestType): void
    {
        $payload = [];

        foreach ($requestType->fields as $field) {
            $fieldKey = $field->field_key;
            $value = $request->input("answers.{$fieldKey}");
            $file = $request->file("answers.{$fieldKey}");
            $storedValue = null;
            $valueJson = null;

            if ($field->field_type === 'file' && $file) {
                $storedValue = $file->store("requests/submissions/{$submission->id}/{$fieldKey}", 'public');
                $valueJson = [
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getClientMimeType(),
                ];
            } elseif ($field->field_type === 'checkbox') {
                $storedValue = $request->boolean("answers.{$fieldKey}") ? '1' : '0';
            } elseif (in_array($field->field_type, ['dropdown', 'radio'], true)) {
                $storedValue = $value;
                $selectedOption = collect($field->options ?? [])->firstWhere('value', $value);
                if ($selectedOption) {
                    $valueJson = $selectedOption;
                }
            } else {
                $storedValue = $value;
            }

            $encodedValueJson = is_array($valueJson) || is_object($valueJson)
                ? json_encode($valueJson, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)
                : $valueJson;

            $payload[] = [
                'submission_id' => $submission->id,
                'field_id' => $field->id,
                'value' => $storedValue,
                'value_json' => $encodedValueJson,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        RequestAnswer::insert($payload);
    }

    protected function initializeApprovalFlow(RequestSubmission $submission, RequestType $requestType): void
    {
        $steps = $requestType->approvalSteps();
        $hierarchicalService = new HierarchicalApproverService();
        
        // Get requester employee for hierarchical resolution
        $requesterEmployee = null;
        if ($submission->user && $submission->user->employee_id) {
            $requesterEmployee = Employee::with(['position', 'department.faculty'])->find($submission->user->employee_id);
        }

        foreach ($steps as $index => $step) {
            $approvers = collect(data_get($step, 'approvers', []));

            if ($approvers->isEmpty()) {
                continue;
            }

            // Resolve approvers hierarchically if requester employee exists
            $resolvedApprovers = $requesterEmployee 
                ? $hierarchicalService->resolveApprovers($approvers->toArray(), $requesterEmployee)
                : $approvers->toArray();

            // Filter approvers by requester's department if requester employee exists
            if ($requesterEmployee) {
                $resolvedApprovers = $this->filterApproversByDepartment($resolvedApprovers, $requesterEmployee);
            }

            foreach ($resolvedApprovers as $approver) {
                $type = data_get($approver, 'approver_type');
                $approverId = data_get($approver, 'approver_id');
                $approverRoleId = data_get($approver, 'approver_role_id');
                $approverPositionId = data_get($approver, 'approver_position_id');
                $wasResolvedFromRole = data_get($approver, 'was_resolved_from_role', false);
                $wasResolvedFromPosition = data_get($approver, 'was_resolved_from_position', false);

                // If position/role was resolved to specific users, use approver_id only
                // Otherwise, if it's still a position/role, use approver_position_id/approver_role_id
                $submission->approvalActions()->create([
                    'step_index' => $index,
                    'status' => RequestApprovalAction::STATUS_PENDING,
                    'approver_id' => ($type === 'user' && $approverId) ? $approverId : null,
                    'approver_role_id' => ($type === 'role' && !$wasResolvedFromRole && $approverRoleId) ? $approverRoleId : null,
                    'approver_position_id' => ($type === 'position' && !$wasResolvedFromPosition && $approverPositionId) ? $approverPositionId : null,
                    'meta' => [
                        'step' => $step,
                        'approver' => $approver,
                        'original_approver_id' => data_get($approver, 'original_approver_id'),
                        'was_escalated' => data_get($approver, 'was_escalated', false),
                        'was_resolved_from_role' => $wasResolvedFromRole,
                        'was_resolved_from_position' => $wasResolvedFromPosition,
                        'original_role_id' => $wasResolvedFromRole ? $approverRoleId : null,
                        'original_position_id' => $wasResolvedFromPosition ? $approverPositionId : null,
                    ],
                ]);
            }
        }
    }

    /**
     * Filter approvers to only include those from the requester's department.
     * 
     * When multiple department heads are selected in a single step, only the
     * department head from the requester's department should be included.
     * 
     * @param array $approvers Array of resolved approvers
     * @param Employee $requesterEmployee The requester employee
     * @return array Filtered approvers
     */
    protected function filterApproversByDepartment(array $approvers, Employee $requesterEmployee): array
    {
        // Ensure department is loaded
        if (!$requesterEmployee->relationLoaded('department')) {
            $requesterEmployee->load('department.faculty');
        }

        if (!$requesterEmployee->department_id) {
            return $approvers; // If requester has no department, return all approvers
        }

        $requesterDepartmentId = $requesterEmployee->department_id;

        // Get requester faculty ID once
        $requesterFacultyId = $requesterEmployee->department?->faculty_id ?? null;

        return collect($approvers)->filter(function ($approver) use ($requesterDepartmentId, $requesterEmployee, $requesterFacultyId) {
            $type = data_get($approver, 'approver_type');
            
            // For user-based approvers, check if user's department matches requester's department
            if ($type === 'user') {
                $approverId = data_get($approver, 'approver_id');
                if (!$approverId) {
                    return false;
                }

                // If this is an escalated approver, allow it (don't filter out)
                $wasEscalated = data_get($approver, 'was_escalated', false);
                if ($wasEscalated) {
                    // Escalated approvers are allowed - they're from higher hierarchy levels
                    // Check if they're in the same faculty (for faculty-level escalations)
                    $approverUser = User::with('employee.department.faculty')->find($approverId);
                    if ($approverUser && $approverUser->employee) {
                        $approverFacultyId = $approverUser->employee->department?->faculty_id;
                        
                        // If escalated to faculty level, check if same faculty
                        // Otherwise, check if same department
                        if ($requesterFacultyId && $approverFacultyId === $requesterFacultyId) {
                            return true; // Same faculty (escalated to faculty level)
                        }
                        if ($approverUser->employee->department_id === $requesterDepartmentId) {
                            return true; // Same department (escalated within department)
                        }
                    }
                    // If escalation doesn't match faculty/department, still allow it
                    // as it might be an administrative escalation
                    return true;
                }

                $approverUser = User::with('employee.department')->find($approverId);
                if (!$approverUser || !$approverUser->employee) {
                    return false;
                }

                $approverDepartmentId = $approverUser->employee->department_id;
                
                // Check if user's department matches requester's department
                // This ensures that when multiple department heads (or other approvers) are selected,
                // only the one from the requester's department is included
                return $approverDepartmentId === $requesterDepartmentId;
            }

            // For position-based approvers, check if position is a department head position
            // and if it matches the requester's department
            if ($type === 'position') {
                $approverPositionId = data_get($approver, 'approver_position_id');
                if (!$approverPositionId) {
                    return false;
                }

                $position = Position::find($approverPositionId);
                if (!$position) {
                    return false;
                }

                // If this is an escalated faculty-level position, allow it (don't filter out)
                $wasEscalatedToFaculty = data_get($approver, 'was_escalated_to_faculty', false);
                if ($wasEscalatedToFaculty) {
                    // Check if the faculty position belongs to the requester's faculty
                    if ($requesterFacultyId && $position->faculty_id && $position->faculty_id === $requesterFacultyId) {
                        return true; // Escalated to faculty-level position for same faculty
                    }
                    // If escalated to faculty but can't verify faculty match, still allow it
                    // as it's an escalation and should not be filtered out
                    return true;
                }

                // Check if this position is a department head position for the requester's department
                // This is the key check: if multiple department heads are selected, only the one
                // whose department matches the requester's department should be included
                $department = Department::where('id', $requesterDepartmentId)
                    ->where('head_position_id', $approverPositionId)
                    ->first();

                if ($department) {
                    return true; // This is the department head for requester's department
                }

                // If the position is not a department head position, check if it's in the same department
                // This handles non-department-head positions that should still be filtered by department
                if ($position->department_id === $requesterDepartmentId) {
                    return true;
                }

                // If position is a department head for a different department, exclude it
                return false;
            }

            // For role-based approvers that were resolved to users, they should already be filtered
            // by HierarchicalApproverService, but we can add an extra check if needed
            // For now, we'll keep them as they should already be filtered by department
            if ($type === 'role') {
                // Role-based approvers are already filtered by HierarchicalApproverService
                // to only include users from the same department, so we keep them
                return true;
            }

            // For any other type, keep the approver
            return true;
        })->values()->toArray();
    }

    protected function buildInitialApprovalState(RequestType $requestType): array
    {
        return [
            'steps' => $requestType->approvalSteps()->map(function (array $step, int $index) {
                $approvers = collect(data_get($step, 'approvers', []))->map(function ($approver) {
                    return [
                        'approver_type' => data_get($approver, 'approver_type'),
                        'approver_id' => data_get($approver, 'approver_id'),
                        'approver_role_id' => data_get($approver, 'approver_role_id'),
                        'status' => RequestApprovalAction::STATUS_PENDING,
                    ];
                });

                return [
                    'name' => data_get($step, 'name'),
                    'description' => data_get($step, 'description'),
                    'status' => RequestApprovalAction::STATUS_PENDING,
                    'approvers' => $approvers,
                    'step_index' => $index,
                ];
            })->values(),
        ];
    }

    protected function updateApprovalState(RequestSubmission $submission, RequestApprovalAction $action): void
    {
        $state = $submission->approval_state ?? ['steps' => []];

        $state['steps'] = collect($state['steps'] ?? [])
            ->map(function ($step) use ($action) {
                if (($step['step_index'] ?? null) === $action->step_index) {
                    $step['approvers'] = collect($step['approvers'] ?? [])
                        ->map(function ($approver) use ($action) {
                            $matchesUser = $action->approver_id && $approver['approver_id'] === $action->approver_id;
                            $matchesRole = $action->approver_role_id && $approver['approver_role_id'] === $action->approver_role_id;

                            if ($matchesUser || $matchesRole) {
                                $approver['status'] = $action->status;
                                $approver['acted_at'] = $action->acted_at?->toIso8601String();
                                $approver['acted_by'] = $action->approver_id;
                                $approver['notes'] = $action->notes;
                            }

                            return $approver;
                        })
                        ->values()
                        ->all();

                    $step['status'] = $this->resolveStepStatus($step['approvers']);
                }

                return $step;
            })
            ->values()
            ->all();

        $submission->update([
            'approval_state' => $state,
        ]);
    }

    protected function resolveStepStatus(array $approvers): string
    {
        $statuses = collect($approvers)->pluck('status')->filter();

        if ($statuses->contains(RequestApprovalAction::STATUS_REJECTED)) {
            return RequestApprovalAction::STATUS_REJECTED;
        }

        if ($statuses->isNotEmpty() && $statuses->every(fn ($status) => $status === RequestApprovalAction::STATUS_APPROVED)) {
            return RequestApprovalAction::STATUS_APPROVED;
        }

        return RequestApprovalAction::STATUS_PENDING;
    }

    protected function advanceOrComplete(RequestSubmission $submission): void
    {
        $nextAction = $submission->approvalActions()->pending()->orderBy('step_index')->first();

        if ($nextAction) {
            $submission->update([
                'current_step_index' => $nextAction->step_index,
            ]);
            return;
        }

        $submission->update([
            'current_step_index' => null,
            'status' => $submission->requiresFulfillment()
                ? RequestSubmission::STATUS_FULFILLMENT
                : RequestSubmission::STATUS_APPROVED,
        ]);

        // Handle training application approval
        $this->handleTrainingApplicationApproval($submission);
    }

    protected function authorizeView(RequestSubmission $submission, $user): void
    {
        if ($submission->user_id === $user->id) {
            return;
        }

        if ($user->can('access-request-types-module')) {
            return;
        }

        $roleIds = $user->roles->pluck('id');
        $userEmployee = $user->employee_id ? Employee::with(['position', 'department.faculty'])->find($user->employee_id) : null;
        $userPositionId = $userEmployee?->position_id;

        $isApprover = $submission->approvalActions()
            ->where(function ($query) use ($user, $roleIds, $userPositionId) {
                $query->where('approver_id', $user->id);

                if ($roleIds->isNotEmpty()) {
                    $query->orWhereIn('approver_role_id', $roleIds);
                }
                
                // Check for position-based approvers
                if ($userPositionId) {
                    $query->orWhere('approver_position_id', $userPositionId);
                }
            })
            ->exists();

        abort_unless($isApprover, 403);
    }

    protected function authorizeApproval(RequestSubmission $submission, $user): void
    {
        abort_unless($this->userCanApprove($submission, $user), 403);
    }

    protected function userCanApprove(RequestSubmission $submission, $user): bool
    {
        \Log::info('userCanApprove - Start', [
            'submission_id' => $submission->id,
            'submission_status' => $submission->status,
            'current_step_index' => $submission->current_step_index,
            'user_id' => $user->id,
        ]);

        if ($submission->status !== RequestSubmission::STATUS_PENDING || $submission->current_step_index === null) {
            \Log::warning('userCanApprove - Submission not pending or no current step', [
                'submission_id' => $submission->id,
                'status' => $submission->status,
                'current_step_index' => $submission->current_step_index,
            ]);
            return false;
        }

        $action = $this->currentActionFor($submission, $user);

        $result = (bool) $action;
        \Log::info('userCanApprove - Result', [
            'submission_id' => $submission->id,
            'user_id' => $user->id,
            'action_found' => $action ? $action->id : null,
            'can_approve' => $result,
        ]);

        return $result;
    }

    protected function userCanFulfill(RequestSubmission $submission, $user): bool
    {
        if (!$user) {
            return false;
        }

        if ($user->can('access-request-types-module')) {
            return true;
        }

        $submission->loadMissing('approvalActions', 'requestType');
        $roleIds = $user->roles->pluck('id')->all();
        $finalStepIndex = $submission->approvalActions->max('step_index');

        if ($finalStepIndex === null) {
            return false;
        }

        return $submission->approvalActions
            ->where('step_index', $finalStepIndex)
            ->first(function (RequestApprovalAction $action) use ($user, $roleIds) {
                if ($action->status !== RequestApprovalAction::STATUS_APPROVED) {
                    return false;
                }

                if ($action->approver_id && $action->approver_id === $user->id) {
                    return true;
                }

                if ($action->approver_role_id && in_array($action->approver_role_id, $roleIds, true)) {
                    return true;
                }

                return false;
            }) !== null;
    }

    protected function currentActionFor(RequestSubmission $submission, $user): ?RequestApprovalAction
    {
        $submission->loadMissing('approvalActions.approverRole');

        $currentIndex = $submission->current_step_index;

        \Log::info('currentActionFor - Debug', [
            'submission_id' => $submission->id,
            'user_id' => $user->id,
            'current_step_index' => $currentIndex,
        ]);

        if ($currentIndex === null) {
            \Log::warning('currentActionFor - No current step index', [
                'submission_id' => $submission->id,
            ]);
            return null;
        }

        $pendingActions = $submission->approvalActions
            ->where('status', RequestApprovalAction::STATUS_PENDING)
            ->where('step_index', $currentIndex);
        
        \Log::info('currentActionFor - Pending actions', [
            'submission_id' => $submission->id,
            'pending_actions_count' => $pendingActions->count(),
            'actions' => $pendingActions->map(function ($action) {
                return [
                    'id' => $action->id,
                    'approver_id' => $action->approver_id,
                    'approver_role_id' => $action->approver_role_id,
                    'approver_position_id' => $action->approver_position_id,
                    'status' => $action->status,
                    'step_index' => $action->step_index,
                ];
            })->toArray(),
        ]);

        $roleIds = $user->roles->pluck('id')->all();

        \Log::info('currentActionFor - User info', [
            'user_id' => $user->id,
            'user_employee_id' => $user->employee_id,
            'user_role_ids' => $roleIds,
        ]);

        $result = $pendingActions->first(function (RequestApprovalAction $action) use ($user, $roleIds) {
            \Log::info('currentActionFor - Checking action', [
                'action_id' => $action->id,
                'approver_id' => $action->approver_id,
                'approver_role_id' => $action->approver_role_id,
                'approver_position_id' => $action->approver_position_id,
                'user_id' => $user->id,
                'user_employee_id' => $user->employee_id,
            ]);

            if ($action->approver_id && $action->approver_id === $user->id) {
                \Log::info('currentActionFor - Matched by approver_id', ['action_id' => $action->id]);
                return true;
            }

            if ($action->approver_role_id && in_array($action->approver_role_id, $roleIds, true)) {
                \Log::info('currentActionFor - Matched by approver_role_id', ['action_id' => $action->id]);
                return true;
            }

            // Check position-based approvers
            if ($action->approver_position_id) {
                \Log::info('currentActionFor - Checking position-based approver', [
                    'action_id' => $action->id,
                    'approver_position_id' => $action->approver_position_id,
                ]);
                $canAct = $action->canUserAct($user);
                \Log::info('currentActionFor - canUserAct result', [
                    'action_id' => $action->id,
                    'can_act' => $canAct,
                ]);
                return $canAct;
            }

            \Log::warning('currentActionFor - No match for action', ['action_id' => $action->id]);
            return false;
        });

        \Log::info('currentActionFor - Final result', [
            'submission_id' => $submission->id,
            'found_action' => $result ? $result->id : null,
        ]);

        return $result;
    }

    protected function formatSubmissionPayload(RequestSubmission $submission): array
    {
        $answers = $submission->answers->keyBy('field_id');

        return [
            'id' => $submission->id,
            'reference_code' => $submission->reference_code,
            'status' => $submission->status,
            'submitted_at' => $submission->submitted_at?->toIso8601String(),
            'fulfilled_at' => $submission->fulfilled_at?->toIso8601String(),
            'request_type' => [
                'id' => $submission->requestType->id,
                'name' => $submission->requestType->name,
                'has_fulfillment' => $submission->requestType->has_fulfillment,
            ],
            'requester' => $this->formatRequester($submission),
            'fields' => $submission->requestType->fields->map(function (RequestField $field) use ($answers) {
                $answer = $answers->get($field->id);
                $value = $answer?->value;
                $downloadUrl = null;

                if ($field->field_type === 'file' && $value) {
                    $downloadUrl = Storage::url($value);
                }

                if ($field->field_type === 'checkbox') {
                    $value = $value === '1';
                }

                return [
                    'id' => $field->id,
                    'label' => $field->label,
                    'field_type' => $field->field_type,
                    'description' => $field->description,
                    'value' => $value,
                    'value_json' => $answer?->value_json,
                    'download_url' => $downloadUrl,
                ];
            }),
            'approval' => [
                'actions' => $submission->approvalActions
                    ->sortBy('step_index')
                    ->values()
                    ->map(function (RequestApprovalAction $action) {
                        return [
                            'id' => $action->id,
                            'step_index' => $action->step_index,
                            'status' => $action->status ?? 'pending',
                            'notes' => $action->notes,
                            'acted_at' => $action->acted_at?->toIso8601String(),
                            'approver' => $action->approver ? [
                                'id' => $action->approver->id,
                                'name' => $action->approver->name,
                                'email' => $action->approver->email,
                                'position' => $action->approver->employee?->position ? [
                                    'id' => $action->approver->employee->position->id,
                                    'pos_name' => $action->approver->employee->position->pos_name,
                                ] : null,
                            ] : null,
                            'approver_role' => $action->approverRole ? [
                                'id' => $action->approverRole->id,
                                'name' => $action->approverRole->name,
                                'label' => $action->approverRole->label ?? $action->approverRole->name,
                            ] : (
                                // If role was resolved to a user, check meta for original_role_id
                                (function() use ($action) {
                                    $originalRoleId = data_get($action->meta, 'original_role_id');
                                    if ($originalRoleId) {
                                        $role = \App\Models\Role::find($originalRoleId);
                                        if ($role) {
                                            return [
                                                'id' => $role->id,
                                                'name' => $role->name,
                                                'label' => $role->label ?? $role->name,
                                            ];
                                        }
                                    }
                                    return null;
                                })()
                            ),
                            'approver_position' => $action->approverPosition ? [
                                'id' => $action->approverPosition->id,
                                'pos_name' => $action->approverPosition->pos_name,
                            ] : null,
                            // Include approver name even for position-based approvers (if resolved to a user)
                            'approver_name' => $action->approver ? $action->approver->name : null,
                        ];
                    })
                    ->values()
                    ->toArray(),
                'state' => $submission->approval_state,
            ],
            'fulfillment' => $submission->fulfillment
                ? [
                    'file_url' => $submission->fulfillment->file_url,
                    'original_filename' => $submission->fulfillment->original_filename,
                    'notes' => $submission->fulfillment->notes,
                    'completed_at' => $submission->fulfillment->completed_at?->toIso8601String(),
                    'fulfilled_by' => $submission->fulfillment->fulfiller?->only(['id', 'name', 'email']),
                ]
                : null,
        ];
    }

    protected function formatRequester(RequestSubmission $submission): array
    {
        $user = $submission->user;
        $employee = $user?->employee;

        $fullNameParts = array_filter([
            $employee?->first_name,
            $employee?->middle_name,
            $employee?->surname,
        ]);

        $fullName = $fullNameParts
            ? trim(implode(' ', $fullNameParts))
            : ($user?->name ?? 'Unknown');

        return [
            'id' => $user?->id,
            'full_name' => $fullName,
            'employee_id' => $employee?->id ?? $user?->employee_id,
        ];
    }

    /**
     * Handle training application when request is approved.
     */
    protected function handleTrainingApplicationApproval(RequestSubmission $submission): void
    {
        // Check if this is a training application request
        $trainingApplication = TrainingApplication::where('request_submission_id', $submission->id)->first();
        
        if ($trainingApplication && $submission->status === RequestSubmission::STATUS_APPROVED) {
            $trainingApplication->update([
                'status' => 'Approved',
            ]);
        }
    }

    /**
     * Handle training application when request is rejected.
     */
    protected function handleTrainingApplicationRejection(RequestSubmission $submission): void
    {
        // Check if this is a training application request
        $trainingApplication = TrainingApplication::where('request_submission_id', $submission->id)->first();
        
        if ($trainingApplication && $submission->status === RequestSubmission::STATUS_REJECTED) {
            $trainingApplication->update([
                'status' => 'Rejected',
                're_apply_count' => $trainingApplication->re_apply_count + 1,
            ]);
        }
    }
}
