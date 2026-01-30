<?php

namespace App\Http\Controllers;

use App\Models\ApprovalComment;
use App\Models\ApprovalDelegation;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\RequestAnswer;
use App\Models\RequestApprovalAction;
use App\Models\RequestField;
use App\Models\RequestSubmission;
use App\Models\RequestType;
use App\Models\Employee;
use App\Models\TrainingApplication;
use App\Models\Unit;
use App\Models\Position;
use App\Models\User;
use App\Notifications\ApprovalRequestedNotification;
use App\Notifications\RequestApprovedNotification;
use App\Notifications\RequestFulfilledNotification;
use App\Notifications\RequestRejectedNotification;
use App\Services\AuditLogService;
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
                RequestSubmission::STATUS_WITHDRAWN,
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

        // Prefill CS Form 6 header fields for Leave Request
        $prefill = [];
        $leaveBalances = [];
        if ($requestType->name === 'Leave Request') {
            $employee = request()->user()?->employee()
                ->with(['primaryDesignation.unit', 'primaryDesignation.position'])
                ->first();

            if ($employee) {
                $fullName = trim("{$employee->first_name} {$employee->middle_name} {$employee->surname}");
                $unitName = $employee->primaryDesignation?->unit?->name ?? null;
                $positionName = $employee->primaryDesignation?->position?->pos_name ?? null;

                $prefill = array_filter([
                    'employee_name' => $fullName ?: null,
                    'unit' => $unitName,
                    'position' => $positionName,
                    'salary' => $employee->salary !== null ? number_format((float) $employee->salary, 2, '.', '') : null,
                    'date_of_filing' => now()->format('Y-m-d'),
                ], fn ($value) => $value !== null);

                // Get leave balances for the employee
                $balances = $this->leaveService->getEmployeeBalance($employee->id, now()->year);
                
                // First pass: Map balances by leave type code
                foreach ($balances as $balanceData) {
                    $leaveType = $balanceData['leave_type'];
                    $code = $leaveType->code;
                    $availableBalance = $balanceData['available'] ?? 0;
                    
                    // Store balance by code
                    $leaveBalances[$code] = [
                        'code' => $code,
                        'balance' => $availableBalance,
                        'entitled' => $balanceData['entitled'] ?? 0,
                        'used' => $balanceData['used'] ?? 0,
                        'pending' => $balanceData['pending'] ?? 0,
                    ];
                }
                
                // Second pass: Map leave types that use credits from another type (e.g., FL uses VL)
                foreach ($balances as $balanceData) {
                    $leaveType = $balanceData['leave_type'];
                    $code = $leaveType->code;
                    
                    if (!empty($leaveType->uses_credits_from)) {
                        $sourceCode = $leaveType->uses_credits_from;
                        // Use the source leave type's balance
                        if (isset($leaveBalances[$sourceCode])) {
                            $leaveBalances[$code] = [
                                'code' => $code,
                                'balance' => $leaveBalances[$sourceCode]['balance'],
                                'entitled' => $leaveBalances[$sourceCode]['entitled'],
                                'used' => $leaveBalances[$sourceCode]['used'],
                                'pending' => $leaveBalances[$sourceCode]['pending'],
                            ];
                        }
                    }
                }
            } else {
                // Even without employee record, provide date of filing
                $prefill['date_of_filing'] = now()->format('Y-m-d');
            }
        }

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
                'prefill_answers' => $prefill,
            ],
            'leaveBalances' => $leaveBalances,
        ]);
    }

    public function store(Request $request, RequestType $requestType)
    {
        abort_unless($requestType->isPublished(), 404, 'Request type is not available.');

        // 2FA is required at "New Request" click on the request center (frontend gate), not at submit
        $requestType->load(['fields' => fn ($query) => $query->orderBy('sort_order')]);

        $rules = $this->buildDynamicRules($requestType);
        
        // Add Leave Request specific validations
        if ($requestType->name === 'Leave Request') {
            $this->addLeaveRequestValidations($rules, $request);
        }
        
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

            // Log request submission
            app(AuditLogService::class)->logCreated(
                'requests',
                'RequestSubmission',
                (string)$submission->id,
                "Submitted Request: {$requestType->name} (Ref: {$submission->reference_code})",
                null,
                $submission
            );

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
            'approvalActions.escalatedFromUser',
            'approvalActions.delegatedFromUser',
            'fulfillment.fulfiller',
            'user:id,name,email,employee_id',
            'user.employee:id,first_name,middle_name,surname',
        ]);

        // Load comments based on user permissions
        $isRequester = $submission->user_id === $request->user()->id;
        $canSeeInternalComments = $request->user()->can('access-request-types-module') 
            || $this->userCanApprove($submission, $request->user());

        if ($canSeeInternalComments) {
            $submission->load(['comments.user']);
        } else {
            $submission->load(['publicComments.user']);
        }

        $this->authorizeView($submission, $request->user());

        return Inertia::render('requests/show', [
            'submission' => $this->formatSubmissionPayload($submission, $canSeeInternalComments),
            'can' => [
                'approve' => $this->userCanApprove($submission, $request->user()),
                'reject' => $this->userCanApprove($submission, $request->user()),
                'fulfill' => $submission->requiresFulfillment()
                    && $submission->status === RequestSubmission::STATUS_FULFILLMENT
                    && $this->userCanFulfill($submission, $request->user()),
                'withdraw' => $isRequester && $submission->canBeWithdrawn(),
                'comment' => true,
                'internal_comment' => $canSeeInternalComments,
            ],
            'downloadRoutes' => [
                'fulfillment' => $submission->fulfillment ? route('requests.fulfillment.download', $submission) : null,
            ],
        ]);
    }

    public function approve(Request $request, RequestSubmission $submission)
    {
        app(\App\Services\TwoFactorVerificationService::class)->validateForSensitiveAction($request);

        $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->authorizeApproval($submission, $request->user());

        $isFinalApproval = false;

        DB::transaction(function () use ($request, $submission, &$isFinalApproval) {
            $action = $this->currentActionFor($submission, $request->user());

            if (!$action) {
                throw ValidationException::withMessages([
                    'submission' => 'No pending approval step found for you.',
                ]);
            }

            // Check if acting as delegate
            $delegatedFromUserId = null;
            if ($action->approver_id && $action->approver_id !== $request->user()->id) {
                if (ApprovalDelegation::canActOnBehalfOf($request->user()->id, $action->approver_id)) {
                    $delegatedFromUserId = $action->approver_id;
                }
            }

            $action->update([
                'status' => RequestApprovalAction::STATUS_APPROVED,
                'notes' => $request->input('notes'),
                'acted_at' => now(),
                'approver_id' => $request->user()->id,
                'delegated_from_user_id' => $delegatedFromUserId,
            ]);

            // Create approval comment for history
            if ($request->input('notes')) {
                ApprovalComment::createApprovalNote(
                    $submission->id,
                    $request->user()->id,
                    $request->input('notes'),
                    $action->id,
                    false
                );
            }

            $this->updateApprovalState($submission, $action);
            $isFinalApproval = $this->advanceOrComplete($submission, $request->user());

            // Log approval action
            app(AuditLogService::class)->logApproved(
                'requests',
                'RequestSubmission',
                (string)$submission->id,
                "Approved Request: {$submission->requestType->name} (Ref: {$submission->reference_code})",
                ['notes' => $request->input('notes')]
            );
        });

        // Send notification to requester
        $submission->load('user', 'requestType');
        if ($submission->user) {
            $submission->user->notify(new RequestApprovedNotification(
                $submission,
                $request->user(),
                $request->input('notes'),
                $isFinalApproval
            ));
        }

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

            // Check if acting as delegate
            $delegatedFromUserId = null;
            if ($action->approver_id && $action->approver_id !== $request->user()->id) {
                if (ApprovalDelegation::canActOnBehalfOf($request->user()->id, $action->approver_id)) {
                    $delegatedFromUserId = $action->approver_id;
                }
            }

            $action->update([
                'status' => RequestApprovalAction::STATUS_REJECTED,
                'notes' => $request->input('notes'),
                'acted_at' => now(),
                'approver_id' => $request->user()->id,
                'delegated_from_user_id' => $delegatedFromUserId,
            ]);

            // Create rejection comment for history
            ApprovalComment::createApprovalNote(
                $submission->id,
                $request->user()->id,
                $request->input('notes'),
                $action->id,
                true
            );

            $submission->update([
                'status' => RequestSubmission::STATUS_REJECTED,
                'current_step_index' => null,
            ]);

            $this->updateApprovalState($submission, $action);
            
            // Handle training application rejection
            $this->handleTrainingApplicationRejection($submission);

            // Log rejection action
            app(AuditLogService::class)->logRejected(
                'requests',
                'RequestSubmission',
                (string)$submission->id,
                "Rejected Request: {$submission->requestType->name} (Ref: {$submission->reference_code})",
                ['notes' => $request->input('notes')]
            );
        });

        // Send notification to requester
        $submission->load('user', 'requestType');
        if ($submission->user) {
            $submission->user->notify(new RequestRejectedNotification(
                $submission,
                $request->user(),
                $request->input('notes')
            ));
        }

        return back()->with('success', 'Request rejected and requester has been notified.');
    }

    /**
     * Withdraw a request (recall by requester).
     */
    public function withdraw(Request $request, RequestSubmission $submission)
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        // Only the requester can withdraw their own request
        if ($submission->user_id !== $request->user()->id) {
            abort(403, 'You can only withdraw your own requests.');
        }

        if (!$submission->canBeWithdrawn()) {
            return back()->with('error', 'This request cannot be withdrawn. Only pending requests can be withdrawn.');
        }

        DB::transaction(function () use ($request, $submission) {
            $submission->withdraw($request->input('reason'));

            // Log withdrawal action
            app(AuditLogService::class)->log(
                'withdrawn',
                'requests',
                'RequestSubmission',
                (string)$submission->id,
                "Withdrew Request: {$submission->requestType->name} (Ref: {$submission->reference_code})",
                null,
                ['reason' => $request->input('reason')]
            );
        });

        return back()->with('success', 'Request has been withdrawn successfully.');
    }

    /**
     * Add a comment to a request.
     */
    public function addComment(Request $request, RequestSubmission $submission)
    {
        $request->validate([
            'content' => ['required', 'string', 'max:2000'],
            'is_internal' => ['nullable', 'boolean'],
        ]);

        $this->authorizeView($submission, $request->user());

        // Only approvers and admins can post internal comments
        $isInternal = $request->boolean('is_internal');
        if ($isInternal && !$request->user()->can('access-request-types-module')) {
            $isInternal = false;
        }

        ApprovalComment::create([
            'submission_id' => $submission->id,
            'user_id' => $request->user()->id,
            'content' => $request->input('content'),
            'type' => ApprovalComment::TYPE_COMMENT,
            'is_internal' => $isInternal,
        ]);

        return back()->with('success', 'Comment added successfully.');
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

            // Log fulfillment action
            $submission->load('requestType');
            app(AuditLogService::class)->log(
                'fulfilled',
                'requests',
                'RequestSubmission',
                (string)$submission->id,
                "Fulfilled Request: {$submission->requestType->name} (Ref: {$submission->reference_code})",
                null,
                ['file' => $request->file('file')->getClientOriginalName(), 'notes' => $request->input('notes')]
            );
        });

        if ($submission->user) {
            $submission->load('user', 'requestType', 'fulfillment');
            $submission->user->notify(new RequestFulfilledNotification($submission));

            // Log fulfillment action
            app(AuditLogService::class)->log(
                'fulfilled',
                'requests',
                'RequestSubmission',
                (string)$submission->id,
                "Fulfilled Request: {$submission->requestType->name} (Ref: {$submission->reference_code})",
                null,
                ['file' => $submission->fulfillment->original_filename, 'notes' => $submission->fulfillment->notes]
            );
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
            $userEmployee = $user->employee_id ? Employee::with(['primaryDesignation.position', 'primaryDesignation.unit.sector'])->find($user->employee_id) : null;
            $userPositionId = $userEmployee?->primaryDesignation?->position_id;
            
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

            // Special validation for leave_type field in Leave Request
            if ($requestType->name === 'Leave Request' && $field->field_key === 'leave_type' && !empty($fieldRules)) {
                // Add validation to ensure leave type exists and is active
                $fieldRules[] = Rule::exists('leave_types', 'code')
                    ->where('is_active', true);
            }

            $rules[$key] = $fieldRules;
        }

        return $rules;
    }

    protected function addLeaveRequestValidations(array &$rules, Request $request): void
    {
        $answers = $request->input('answers', []);
        $leaveType = data_get($answers, 'leave_type');
        $startDate = data_get($answers, 'start_date');
        $endDate = data_get($answers, 'end_date');

        // Validate date range - end_date must be after or equal to start_date
        if ($startDate && $endDate) {
            $rules['answers.end_date'][] = function ($attribute, $value, $fail) use ($startDate) {
                try {
                    $start = Carbon::parse($startDate);
                    $end = Carbon::parse($value);
                    if ($end->lt($start)) {
                        $fail('The end date must be after or equal to the start date.');
                    }
                } catch (\Exception $e) {
                    // Let date validation handle invalid dates
                }
            };
        }

        // Conditional validation: other_leave_specify is required when leave_type is OTHER
        if ($leaveType === 'OTHER') {
            if (isset($rules['answers.other_leave_specify'])) {
                // Replace nullable with required
                $rules['answers.other_leave_specify'] = array_map(function($rule) {
                    return $rule === 'nullable' ? 'required' : $rule;
                }, $rules['answers.other_leave_specify']);
                // Ensure string and length validation
                if (!in_array('string', $rules['answers.other_leave_specify'])) {
                    $rules['answers.other_leave_specify'][] = 'string';
                }
                $rules['answers.other_leave_specify'][] = 'min:3';
                $rules['answers.other_leave_specify'][] = 'max:255';
            } else {
                // Add validation if field exists in form
                $rules['answers.other_leave_specify'] = ['required', 'string', 'min:3', 'max:255'];
            }
        }

        // Validate total_days if provided
        if (isset($rules['answers.total_days'])) {
            if (!in_array('numeric', $rules['answers.total_days'])) {
                $rules['answers.total_days'][] = 'numeric';
            }
            $rules['answers.total_days'][] = 'min:0.5';
        }
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

        // Check if leave type exists and is active
        $leaveType = LeaveType::where('code', $leaveTypeCode)
            ->where('is_active', true)
            ->first();

        if (!$leaveType) {
            throw ValidationException::withMessages([
                'answers.leave_type' => 'Selected leave type is invalid or inactive. Please select a valid leave type.',
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

        // For special leaves that don't use credits, skip balance check
        // But still validate max days per request if set
        if ($leaveType->is_special_leave && !$leaveType->uses_credits_from) {
            // Check max days per request if applicable
            if ($leaveType->max_days_per_request !== null && $days > $leaveType->max_days_per_request) {
                throw ValidationException::withMessages([
                    'answers.total_days' => "Maximum {$leaveType->max_days_per_request} day(s) allowed for {$leaveType->name}.",
                ]);
            }
            return; // Special leaves don't require balance checks
        }

        // For credit-based leaves (VL, SL, FL), check balance
        // FL uses VL credits, so check the source type
        $sourceLeaveType = $leaveType;
        if ($leaveType->uses_credits_from) {
            $sourceLeaveType = LeaveType::where('code', $leaveType->uses_credits_from)->first();
            if (!$sourceLeaveType) {
                throw ValidationException::withMessages([
                    'answers.leave_type' => 'Leave type configuration error. Please contact HR.',
                ]);
            }
        }

        if (!$this->leaveService->hasSufficientBalance($employeeId, $sourceLeaveType->id, $days)) {
            $balance = LeaveBalance::getCurrentYearBalance($employeeId, $sourceLeaveType->id);
            $available = $balance ? (float) $balance->balance : 0;

            throw ValidationException::withMessages([
                'answers.leave_type' => "Insufficient {$sourceLeaveType->name} balance. Only {$available} day(s) available.",
            ]);
        }

        // Check max days per request if applicable
        if ($leaveType->max_days_per_request !== null && $days > $leaveType->max_days_per_request) {
            throw ValidationException::withMessages([
                'answers.total_days' => "Maximum {$leaveType->max_days_per_request} day(s) allowed per request for {$leaveType->name}.",
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
        $hierarchicalService = app(HierarchicalApproverService::class);
        
        // Get requester employee for hierarchical resolution
        $requesterEmployee = null;
        if ($submission->user && $submission->user->employee_id) {
            $requesterEmployee = Employee::with(['primaryDesignation.position', 'primaryDesignation.unit.sector'])->find($submission->user->employee_id);
        }

        $createdActions = [];

        foreach ($steps as $index => $step) {
            $approvers = collect(data_get($step, 'approvers', []));

            if ($approvers->isEmpty()) {
                continue;
            }

            // Get step configuration
            $approvalMode = data_get($step, 'approval_mode', RequestType::APPROVAL_MODE_ANY);
            $slaHours = data_get($step, 'sla_hours');
            $dueAt = $slaHours ? now()->addHours((int) $slaHours) : null;

            // Resolve approvers hierarchically if requester employee exists
            $resolvedApprovers = $requesterEmployee 
                ? $hierarchicalService->resolveApprovers($approvers->toArray(), $requesterEmployee)
                : $approvers->toArray();

            // Filter approvers by requester's unit/sector if requester employee exists
            if ($requesterEmployee) {
                $resolvedApprovers = $this->filterApproversByUnit($resolvedApprovers, $requesterEmployee);
            }

            // Check if we have valid approvers after resolution
            if (empty($resolvedApprovers)) {
                \Log::warning("No valid approvers found for step {$index} in submission {$submission->id}");
                
                // Create a system comment about the issue
                ApprovalComment::createSystemComment(
                    $submission->id,
                    "Warning: No valid approvers could be resolved for step '{$step['name']}'. The request may require manual intervention.",
                    null,
                    null
                );
                continue;
            }

            foreach ($resolvedApprovers as $approver) {
                $type = data_get($approver, 'approver_type');
                $approverId = data_get($approver, 'approver_id');
                $approverRoleId = data_get($approver, 'approver_role_id');
                $approverPositionId = data_get($approver, 'approver_position_id');
                $wasResolvedFromRole = data_get($approver, 'was_resolved_from_role', false);
                $wasResolvedFromPosition = data_get($approver, 'was_resolved_from_position', false);

                $wasResolvedFromHierarchical = data_get($approver, 'was_resolved_from_hierarchical', false);
                $minAuthorityLevel = data_get($approver, 'min_authority_level');

                // If position/role/hierarchical was resolved to specific users, use approver_id only
                // Otherwise, if it's still a position/role, use approver_position_id/approver_role_id
                $action = $submission->approvalActions()->create([
                    'step_index' => $index,
                    'status' => RequestApprovalAction::STATUS_PENDING,
                    'approver_id' => ($type === 'user' && $approverId) ? $approverId : null,
                    'approver_role_id' => ($type === 'role' && !$wasResolvedFromRole && $approverRoleId) ? $approverRoleId : null,
                    'approver_position_id' => ($type === 'position' && !$wasResolvedFromPosition && $approverPositionId) ? $approverPositionId : null,
                    'due_at' => $dueAt,
                    'meta' => [
                        'step' => $step,
                        'approver' => $approver,
                        'approval_mode' => $approvalMode,
                        'original_approver_id' => data_get($approver, 'original_approver_id'),
                        'was_escalated' => data_get($approver, 'was_escalated', false),
                        'was_resolved_from_role' => $wasResolvedFromRole,
                        'was_resolved_from_position' => $wasResolvedFromPosition,
                        'was_resolved_from_hierarchical' => $wasResolvedFromHierarchical,
                        'original_role_id' => $wasResolvedFromRole ? $approverRoleId : null,
                        'original_position_id' => $wasResolvedFromPosition ? $approverPositionId : null,
                        'min_authority_level' => $minAuthorityLevel,
                        'resolved_authority_level' => data_get($approver, 'resolved_authority_level'),
                        'resolved_unit' => data_get($approver, 'resolved_unit'),
                    ],
                ]);

                $createdActions[] = $action;
            }
        }

        // Notify approvers for the first step
        $firstStepActions = collect($createdActions)->where('step_index', 0);
        foreach ($firstStepActions as $action) {
            $this->notifyApprovers($submission, $action);
        }
    }

    /**
     * Filter approvers to only include those from the requester's unit/sector.
     *
     * When multiple unit heads are selected in a single step, only the
     * head from the requester's unit (or sector) should be included.
     *
     * @param array $approvers Array of resolved approvers
     * @param Employee $requesterEmployee The requester employee
     * @return array Filtered approvers
     */
    protected function filterApproversByUnit(array $approvers, Employee $requesterEmployee): array
    {
        // Ensure primary designation is loaded (new org structure)
        if (!$requesterEmployee->relationLoaded('primaryDesignation')) {
            $requesterEmployee->load('primaryDesignation.unit.sector');
        }

        $requesterUnitId = $requesterEmployee->primaryDesignation?->unit_id;
        if (!$requesterUnitId) {
            return $approvers; // If requester has no unit, return all approvers
        }

        // Get requester sector ID once
        $requesterSectorId = $requesterEmployee->primaryDesignation?->unit?->sector_id ?? null;

        return collect($approvers)->filter(function ($approver) use ($requesterUnitId, $requesterEmployee, $requesterSectorId) {
            $type = data_get($approver, 'approver_type');
            
            // For user-based approvers, check if user's unit matches requester's unit
            if ($type === 'user') {
                $approverId = data_get($approver, 'approver_id');
                if (!$approverId) {
                    return false;
                }

                // If this is an escalated approver, allow it (don't filter out)
                $wasEscalated = data_get($approver, 'was_escalated', false);
                if ($wasEscalated) {
                    // Escalated approvers are allowed - they're from higher authority levels
                    $approverUser = User::with('employee.primaryDesignation.unit.sector')->find($approverId);
                    if ($approverUser && $approverUser->employee) {
                        $approverSectorId = $approverUser->employee->primaryDesignation?->unit?->sector_id;
                        
                        // If escalated to sector level, check if same sector
                        if ($requesterSectorId && $approverSectorId === $requesterSectorId) {
                            return true; // Same sector (escalated)
                        }
                        $approverUnitId = $approverUser->employee->primaryDesignation?->unit_id;
                        if ($approverUnitId === $requesterUnitId) {
                            return true; // Same unit (escalated within unit)
                        }
                    }
                    // Allow administrative escalations
                    return true;
                }

                $approverUser = User::with('employee.primaryDesignation.unit')->find($approverId);
                if (!$approverUser || !$approverUser->employee) {
                    return false;
                }

                $approverUnitId = $approverUser->employee->primaryDesignation?->unit_id;
                
                // Check if user's unit matches requester's unit
                return $approverUnitId === $requesterUnitId;
            }

            // For position-based approvers, check if approver is in same unit or sector
            if ($type === 'position') {
                $approverPositionId = data_get($approver, 'approver_position_id');
                if (!$approverPositionId) {
                    return false;
                }

                $position = Position::find($approverPositionId);
                if (!$position) {
                    return false;
                }

                // If this is an escalated position (e.g. escalated to sector level), allow it
                $wasEscalatedToSector = data_get($approver, 'was_escalated_to_faculty', false) || data_get($approver, 'was_escalated_to_sector', false);
                if ($wasEscalatedToSector) {
                    // Check if the position belongs to the requester's sector
                    if ($requesterSectorId && $position->sector_id && $position->sector_id === $requesterSectorId) {
                        return true;
                    }
                    return true;
                }

                // Check if position is in same sector
                if ($position->sector_id === $requesterSectorId) {
                    return true;
                }

                return false;
            }

            // For role-based approvers - already filtered by HierarchicalApproverService
            if ($type === 'role') {
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
                            $matchesRole = $action->approver_role_id && ($approver['approver_role_id'] ?? null) === $action->approver_role_id;
                            $matchesPosition = $action->approver_position_id && ($approver['approver_position_id'] ?? null) === $action->approver_position_id;

                            if ($matchesUser || $matchesRole || $matchesPosition) {
                                $approver['status'] = $action->status;
                                $approver['acted_at'] = $action->acted_at?->toIso8601String();
                                $approver['acted_by'] = $action->approver_id;
                                $approver['notes'] = $action->notes;
                                $approver['delegated_from'] = $action->delegated_from_user_id;
                            }

                            return $approver;
                        })
                        ->values()
                        ->all();

                    // Get approval mode from step config or action meta
                    $approvalMode = data_get($step, 'approval_mode') 
                        ?? data_get($action->meta, 'approval_mode') 
                        ?? RequestType::APPROVAL_MODE_ANY;

                    $step['status'] = $this->resolveStepStatus($step['approvers'], $approvalMode);
                }

                return $step;
            })
            ->values()
            ->all();

        $submission->update([
            'approval_state' => $state,
        ]);
    }

    /**
     * Resolve the status of a step based on its approval mode.
     * 
     * @param array $approvers Array of approver statuses
     * @param string $approvalMode The approval mode (any, all, majority)
     * @return string The resolved step status
     */
    protected function resolveStepStatus(array $approvers, string $approvalMode = RequestType::APPROVAL_MODE_ANY): string
    {
        $statuses = collect($approvers)->pluck('status')->filter();
        $total = $statuses->count();

        if ($total === 0) {
            return RequestApprovalAction::STATUS_PENDING;
        }

        $approvedCount = $statuses->filter(fn ($s) => $s === RequestApprovalAction::STATUS_APPROVED)->count();
        $rejectedCount = $statuses->filter(fn ($s) => $s === RequestApprovalAction::STATUS_REJECTED)->count();

        // Any rejection in 'all' mode means rejected
        if ($approvalMode === RequestType::APPROVAL_MODE_ALL && $rejectedCount > 0) {
            return RequestApprovalAction::STATUS_REJECTED;
        }

        // In 'any' mode, any rejection only matters if all have rejected
        if ($approvalMode === RequestType::APPROVAL_MODE_ANY && $rejectedCount === $total) {
            return RequestApprovalAction::STATUS_REJECTED;
        }

        // In 'majority' mode, check if majority rejected
        if ($approvalMode === RequestType::APPROVAL_MODE_MAJORITY) {
            $majorityThreshold = ceil($total / 2);
            if ($rejectedCount >= $majorityThreshold) {
                return RequestApprovalAction::STATUS_REJECTED;
            }
        }

        // Check for approval based on mode
        switch ($approvalMode) {
            case RequestType::APPROVAL_MODE_ANY:
                // Any one approval is sufficient
                if ($approvedCount > 0) {
                    return RequestApprovalAction::STATUS_APPROVED;
                }
                break;

            case RequestType::APPROVAL_MODE_ALL:
                // All must approve
                if ($approvedCount === $total) {
                    return RequestApprovalAction::STATUS_APPROVED;
                }
                break;

            case RequestType::APPROVAL_MODE_MAJORITY:
                // More than half must approve
                $majorityThreshold = ceil($total / 2);
                if ($approvedCount >= $majorityThreshold) {
                    return RequestApprovalAction::STATUS_APPROVED;
                }
                break;
        }

        return RequestApprovalAction::STATUS_PENDING;
    }

    /**
     * Advance to next step or complete the submission.
     * 
     * @return bool True if this was the final approval (no more steps)
     */
    protected function advanceOrComplete(RequestSubmission $submission, ?User $currentApprover = null): bool
    {
        $nextAction = $submission->approvalActions()->pending()->orderBy('step_index')->first();

        if ($nextAction) {
            $submission->update([
                'current_step_index' => $nextAction->step_index,
            ]);
            
            // Notify the next approver(s)
            $this->notifyApprovers($submission, $nextAction);
            
            return false;
        }

        $submission->update([
            'current_step_index' => null,
            'status' => $submission->requiresFulfillment()
                ? RequestSubmission::STATUS_FULFILLMENT
                : RequestSubmission::STATUS_APPROVED,
        ]);

        // Handle training application approval
        $this->handleTrainingApplicationApproval($submission);
        
        return true;
    }

    /**
     * Notify approvers for a pending action.
     */
    protected function notifyApprovers(RequestSubmission $submission, RequestApprovalAction $action): void
    {
        $approvers = [];

        // Direct approver
        if ($action->approver_id) {
            $approver = User::find($action->approver_id);
            if ($approver) {
                $approvers[] = $approver;
                
                // Also notify delegate if exists
                $delegate = ApprovalDelegation::getActiveDelegateFor($approver->id);
                if ($delegate) {
                    $approvers[] = $delegate;
                }
            }
        }

        // Role-based approvers
        if ($action->approver_role_id) {
            $roleApprovers = User::whereHas('roles', function ($query) use ($action) {
                $query->where('id', $action->approver_role_id);
            })->get();

            foreach ($roleApprovers as $approver) {
                $approvers[] = $approver;
            }
        }

        // Position-based approvers
        if ($action->approver_position_id) {
            $positionApprovers = User::whereHas('employee.designations', function ($query) use ($action) {
                $query->where('position_id', $action->approver_position_id)
                    ->where('is_primary', true);
            })->get();

            foreach ($positionApprovers as $approver) {
                $approvers[] = $approver;
            }
        }

        // Send notifications (deduplicated)
        $notifiedIds = [];
        foreach ($approvers as $approver) {
            if (!in_array($approver->id, $notifiedIds)) {
                $approver->notify(new ApprovalRequestedNotification($submission, $action));
                $notifiedIds[] = $approver->id;
            }
        }
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
        $userEmployee = $user->employee_id ? Employee::with(['primaryDesignation.position', 'primaryDesignation.unit.sector'])->find($user->employee_id) : null;
        $userPositionId = $userEmployee?->primaryDesignation?->position_id;

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
        
        // Get users who have delegated to this user
        $delegatorIds = ApprovalDelegation::getDelegatorsFor($user->id);

        \Log::info('currentActionFor - User info', [
            'user_id' => $user->id,
            'user_employee_id' => $user->employee_id,
            'user_role_ids' => $roleIds,
            'delegator_ids' => $delegatorIds,
        ]);

        $result = $pendingActions->first(function (RequestApprovalAction $action) use ($user, $roleIds, $delegatorIds) {
            \Log::info('currentActionFor - Checking action', [
                'action_id' => $action->id,
                'approver_id' => $action->approver_id,
                'approver_role_id' => $action->approver_role_id,
                'approver_position_id' => $action->approver_position_id,
                'user_id' => $user->id,
                'user_employee_id' => $user->employee_id,
            ]);

            // Direct match
            if ($action->approver_id && $action->approver_id === $user->id) {
                \Log::info('currentActionFor - Matched by approver_id', ['action_id' => $action->id]);
                return true;
            }

            // Check if user is a delegate for the approver
            if ($action->approver_id && in_array($action->approver_id, $delegatorIds)) {
                \Log::info('currentActionFor - Matched by delegation', [
                    'action_id' => $action->id,
                    'delegator_id' => $action->approver_id,
                ]);
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

    protected function formatSubmissionPayload(RequestSubmission $submission, bool $includeInternalComments = false): array
    {
        $answers = $submission->answers->keyBy('field_id');

        // Get comments based on permissions
        $comments = $includeInternalComments 
            ? ($submission->comments ?? collect())
            : ($submission->publicComments ?? collect());

        return [
            'id' => $submission->id,
            'reference_code' => $submission->reference_code,
            'status' => $submission->status,
            'submitted_at' => $submission->submitted_at?->toIso8601String(),
            'fulfilled_at' => $submission->fulfilled_at?->toIso8601String(),
            'withdrawn_at' => $submission->withdrawn_at?->toIso8601String(),
            'withdrawal_reason' => $submission->withdrawal_reason,
            'request_type' => $submission->requestType ? [
                'id' => $submission->requestType->id,
                'name' => $submission->requestType->name,
                'has_fulfillment' => $submission->requestType->has_fulfillment,
            ] : null,
            'requester' => $this->formatRequester($submission),
            'fields' => $submission->requestType?->fields->map(function (RequestField $field) use ($answers) {
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
            }) ?? [],
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
                            'due_at' => $action->due_at?->toIso8601String(),
                            'is_overdue' => $action->isOverdue(),
                            'is_escalated' => $action->is_escalated,
                            'escalated_at' => $action->escalated_at?->toIso8601String(),
                            'escalated_from' => $action->escalatedFromUser ? [
                                'id' => $action->escalatedFromUser->id,
                                'name' => $action->escalatedFromUser->name,
                            ] : null,
                            'delegated_from' => $action->delegatedFromUser ? [
                                'id' => $action->delegatedFromUser->id,
                                'name' => $action->delegatedFromUser->name,
                            ] : null,
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
                            'approval_mode' => data_get($action->meta, 'approval_mode', RequestType::APPROVAL_MODE_ANY),
                        ];
                    })
                    ->values()
                    ->toArray(),
                'state' => $submission->approval_state,
            ],
            'comments' => $comments->map(function (ApprovalComment $comment) {
                return [
                    'id' => $comment->id,
                    'content' => $comment->content,
                    'type' => $comment->type,
                    'is_internal' => $comment->is_internal,
                    'created_at' => $comment->created_at?->toIso8601String(),
                    'user' => $comment->user ? [
                        'id' => $comment->user->id,
                        'name' => $comment->user->name,
                    ] : null,
                ];
            })->values()->toArray(),
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
