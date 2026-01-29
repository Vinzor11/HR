<?php

namespace App\Http\Controllers;

use App\Http\Requests\TrainingRequest;
use App\Models\Employee;
use App\Models\Position;
use App\Models\RequestSubmission;
use App\Models\RequestType;
use App\Models\Sector;
use App\Models\Training;
use App\Models\TrainingApplication;
use App\Models\Unit;
use App\Services\AuditLogService;
use App\Services\TrainingRequestBuilderService;
use App\Services\TrainingEligibilityService;
use App\Services\EmployeeScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TrainingController extends Controller
{
    protected TrainingRequestBuilderService $requestBuilderService;
    protected TrainingEligibilityService $eligibilityService;
    protected EmployeeScopeService $scopeService;

    public function __construct(
        TrainingRequestBuilderService $requestBuilderService,
        TrainingEligibilityService $eligibilityService,
        EmployeeScopeService $scopeService
    ) {
        $this->requestBuilderService = $requestBuilderService;
        $this->eligibilityService = $eligibilityService;
        $this->scopeService = $scopeService;
    }

    /**
     * Generate a unique reference number for a training
     */
    private function generateReferenceNumber(Training $training): string
    {
        // date_from is already a Carbon instance due to 'date' cast in model
        /** @var \Carbon\Carbon|null $dateFrom */
        $dateFrom = $training->date_from;
        $dateStr = $dateFrom ? $dateFrom->format('Ymd') : date('Ymd');
        $baseRef = 'TRG-' . str_pad($training->training_id, 6, '0', STR_PAD_LEFT) . '-' . $dateStr;
        
        // Check if reference number already exists (shouldn't happen, but just in case)
        $counter = 1;
        $referenceNumber = $baseRef;
        while (Training::where('reference_number', $referenceNumber)
            ->where('training_id', '!=', $training->training_id)
            ->exists()) {
            $referenceNumber = $baseRef . '-' . $counter;
            $counter++;
        }
        
        return $referenceNumber;
    }

    public function index(Request $request)
    {
        abort_unless($request->user()->can('access-trainings-module'), 403, 'Unauthorized action.');
        
        $perPage = $request->integer('perPage', 10);
        $search = (string) $request->input('search', '');
        $searchMode = $request->input('search_mode', 'any');
        $showDeleted = $request->boolean('show_deleted', false);
        $sortBy = $request->input('sort_by', 'training_title');
        $sortOrder = $request->input('sort_order', 'asc');

        // Validate sort_by to prevent SQL injection
        $allowedSortColumns = ['training_title', 'date_from', 'date_to', 'created_at', 'updated_at'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'training_title';
        }

        // Validate sort_order
        $sortOrder = strtolower($sortOrder) === 'desc' ? 'desc' : 'asc';

        $trainings = Training::with([
            'allowedSectors:id,name',
            'allowedUnits:id,name',
            'allowedPositions:id,pos_name',
        ])
            ->when($showDeleted, function ($query) {
                // Show only soft-deleted trainings
                $query->onlyTrashed();
            })
            ->when($search, function ($query) use ($search, $searchMode) {
                $query->where(function ($subQuery) use ($search, $searchMode) {
                    switch ($searchMode) {
                        case 'title':
                            $subQuery->where('training_title', 'like', "%{$search}%");
                            break;
                        case 'remarks':
                            $subQuery->where('remarks', 'like', "%{$search}%");
                            break;
                        default:
                            $subQuery
                                ->where('training_title', 'like', "%{$search}%")
                                ->orWhere('remarks', 'like', "%{$search}%");
                    }
                });
            })
            ->orderBy($sortBy, $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        $sectors = Sector::orderBy('name')
            ->get(['id', 'name', 'code'])
            ->map(fn ($sector) => [
                'id' => $sector->id,
                'label' => $sector->name,
                'name' => $sector->name,
                'value' => (string) $sector->id,
                'code' => $sector->code,
            ]);

        $units = Unit::with('sector:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'sector_id', 'unit_type'])
            ->map(fn ($unit) => [
                'id' => $unit->id,
                'label' => $unit->name,
                'name' => $unit->name,
                'value' => (string) $unit->id,
                'sector_id' => $unit->sector_id,
                'unit_type' => $unit->unit_type ?? 'office',
            ]);

        // Get scoped positions based on user's access
        // Note: This may need to be updated based on new scope service methods
        $positionsQuery = Position::with('sector:id,name')
            ->orderBy('pos_name');
        
        $positions = $positionsQuery->get(['id', 'pos_name', 'sector_id'])
            ->map(fn ($position) => [
                'id' => $position->id,
                'label' => $position->pos_name,
                'name' => $position->pos_name,
                'value' => (string) $position->id,
                'sector_id' => $position->sector_id,
            ]);

        $requestTypes = RequestType::where('is_published', true)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($type) => [
                'id' => $type->id,
                'label' => $type->name,
                'name' => $type->name,
                'value' => (string) $type->id,
            ]);

        return Inertia::render('trainings/index', [
            'trainings' => $trainings,
            'formOptions' => [
                'sectors' => $sectors->values(),
                'units' => $units->values(),
                'positions' => $positions->values(),
                'requestTypes' => $requestTypes->values(),
            ],
            'filters' => [
                'search' => $search,
                'search_mode' => $searchMode,
                'perPage' => $perPage,
                'show_deleted' => $showDeleted,
            ],
        ]);
    }

    public function store(TrainingRequest $request)
    {
        abort_unless($request->user()->can('create-training'), 403, 'Unauthorized action.');
        
        $validated = $request->validated();
        $sectorIds = $validated['sector_ids'] ?? [];
        $unitIds = $validated['unit_ids'] ?? [];
        $positionIds = $validated['position_ids'] ?? [];

        $trainingData = collect($validated)->except(['sector_ids', 'unit_ids', 'position_ids'])->toArray();

        $trainingData['requires_approval'] = $request->boolean('requires_approval', false);
        $trainingData['request_type_id'] = $request->input('request_type_id');
        
        $training = Training::create($trainingData);
        
        // Generate and save reference number after training is created (so we have training_id)
        if (!$training->reference_number) {
            $training->reference_number = $this->generateReferenceNumber($training);
            $training->save();
        }
        $training->allowedSectors()->sync($sectorIds);
        $training->allowedUnits()->sync($unitIds);
        $training->allowedPositions()->sync($positionIds);

        // Log training creation
        app(AuditLogService::class)->logCreated(
            'trainings',
            'Training',
            (string)$training->training_id,
            "Created a New Training: {$training->training_title}",
            null,
            $training
        );

        if ($training->requires_approval && !$training->request_type_id && $request->user()) {
            $this->requestBuilderService->createRequestTypeForTraining($training, $request->user());
        }

        return redirect()->route('trainings.index')->with('success', 'Training created successfully!');
    }

    public function update(TrainingRequest $request, Training $training)
    {
        abort_unless($request->user()->can('edit-training'), 403, 'Unauthorized action.');
        
        $validated = $request->validated();
        $sectorIds = $validated['sector_ids'] ?? [];
        $unitIds = $validated['unit_ids'] ?? [];
        $positionIds = $validated['position_ids'] ?? [];

        $trainingData = collect($validated)->except(['sector_ids', 'unit_ids', 'position_ids'])->toArray();

        $trainingData['requires_approval'] = $request->boolean('requires_approval', false) ?? false;
        $trainingData['request_type_id'] = $request->input('request_type_id');
        
        // Generate reference number if it doesn't exist
        if (!$training->reference_number) {
            $trainingData['reference_number'] = $this->generateReferenceNumber($training);
        }
        
        // Get original values before update - refresh to ensure we have latest data
        $training->refresh();
        $original = $training->getOriginal();
        
        // Get current relationships BEFORE sync
        $oldSectorIds = $training->allowedSectors()->pluck('sectors.id')->toArray();
        $oldUnitIds = $training->allowedUnits()->pluck('units.id')->toArray();
        $oldPositionIds = $training->allowedPositions()->pluck('positions.id')->toArray();
        
        $training->update($trainingData);
        $training->refresh(); // Refresh to get updated request_type_id value
        $training->allowedSectors()->sync($sectorIds);
        $training->allowedUnits()->sync($unitIds);
        $training->allowedPositions()->sync($positionIds);
        
        // Refresh to get updated relationships
        $training->refresh();
        $training->load(['allowedSectors', 'allowedUnits', 'allowedPositions']);

        // Collect all changes for a single audit log entry
        $oldValues = [];
        $newValues = [];
        $changeDescriptions = [];
        
        // Track all fields that should be logged (from fillable + request data)
        $fieldsToTrack = [
            'training_title',
            'training_category_id',
            'date_from',
            'date_to',
            'hours',
            'facilitator',
            'venue',
            'capacity',
            'remarks',
            'requires_approval',
            'request_type_id',
            'reference_number',
        ];
        
        foreach ($fieldsToTrack as $field) {
            // Skip if field is not being updated
            if (!array_key_exists($field, $trainingData)) {
                continue;
            }
            
            $newValue = $trainingData[$field];
            $oldValue = $original[$field] ?? null;
            
            // Normalize values for comparison
            $normalizedOld = $this->normalizeValue($oldValue);
            $normalizedNew = $this->normalizeValue($newValue);
            
            // Only log if values actually changed
            if ($normalizedOld !== $normalizedNew) {
                $fieldName = str_replace('_', ' ', $field);
                $fieldName = ucwords($fieldName);
                
                // Format date fields to YYYY-MM-DD format for audit logs
                $formattedOldValue = $this->formatDateForAudit($field, $oldValue);
                $formattedNewValue = $this->formatDateForAudit($field, $newValue);
                
                // Format old and new values for display
                $oldValueFormatted = is_array($formattedOldValue) ? implode(', ', $formattedOldValue) : (string)($formattedOldValue ?? '');
                $newValueFormatted = is_array($formattedNewValue) ? implode(', ', $formattedNewValue) : (string)($formattedNewValue ?? '');
                
                $oldValues[$field] = $formattedOldValue;
                $newValues[$field] = $formattedNewValue;
                $changeDescriptions[] = "{$fieldName}: {$oldValueFormatted} > {$newValueFormatted}";
            }
        }
        
        // Also track changes to relationships (sectors, units, positions)
        $newSectorIds = $training->allowedSectors->pluck('id')->toArray();
        $newUnitIds = $training->allowedUnits->pluck('id')->toArray();
        $newPositionIds = $training->allowedPositions->pluck('id')->toArray();
        
        // Log sector changes - show added/removed
        if ($oldSectorIds !== $newSectorIds) {
            try {
                $oldSectorNames = !empty($oldSectorIds) 
                    ? Sector::whereIn('id', $oldSectorIds)->pluck('name')->toArray()
                    : [];
                $newSectorNames = !empty($newSectorIds)
                    ? Sector::whereIn('id', $newSectorIds)->pluck('name')->toArray()
                    : [];
                
                // Calculate added and removed
                $added = array_diff($newSectorNames, $oldSectorNames);
                $removed = array_diff($oldSectorNames, $newSectorNames);
                
                $changeParts = [];
                if (!empty($added)) {
                    $changeParts[] = "Added: " . implode(', ', $added);
                }
                if (!empty($removed)) {
                    $changeParts[] = "Removed: " . implode(', ', $removed);
                }
                
                if (!empty($changeParts)) {
                    $oldValues['allowed_sectors'] = ['_change_type' => 'array_diff', '_added' => array_values($added), '_removed' => array_values($removed)];
                    $newValues['allowed_sectors'] = ['_change_type' => 'array_diff', '_added' => array_values($added), '_removed' => array_values($removed)];
                    $changeDescriptions[] = "Allowed Sectors: " . implode('; ', $changeParts);
                }
            } catch (\Exception $e) {
                \Log::error('Failed to process sector changes: ' . $e->getMessage());
            }
        }
        
        // Log unit changes - show added/removed
        if ($oldUnitIds !== $newUnitIds) {
            try {
                $oldUnitNames = !empty($oldUnitIds) 
                    ? Unit::whereIn('id', $oldUnitIds)->pluck('name')->toArray()
                    : [];
                $newUnitNames = !empty($newUnitIds)
                    ? Unit::whereIn('id', $newUnitIds)->pluck('name')->toArray()
                    : [];
                
                // Calculate added and removed
                $added = array_diff($newUnitNames, $oldUnitNames);
                $removed = array_diff($oldUnitNames, $newUnitNames);
                
                $changeParts = [];
                if (!empty($added)) {
                    $changeParts[] = "Added: " . implode(', ', $added);
                }
                if (!empty($removed)) {
                    $changeParts[] = "Removed: " . implode(', ', $removed);
                }
                
                if (!empty($changeParts)) {
                    $oldValues['allowed_units'] = ['_change_type' => 'array_diff', '_added' => array_values($added), '_removed' => array_values($removed)];
                    $newValues['allowed_units'] = ['_change_type' => 'array_diff', '_added' => array_values($added), '_removed' => array_values($removed)];
                    $changeDescriptions[] = "Allowed Units: " . implode('; ', $changeParts);
                }
            } catch (\Exception $e) {
                \Log::error('Failed to process unit changes: ' . $e->getMessage());
            }
        }
        
        // Log position changes - show added/removed
        if ($oldPositionIds !== $newPositionIds) {
            try {
                // Get position names
                $oldPositionNames = !empty($oldPositionIds)
                    ? Position::whereIn('id', $oldPositionIds)->pluck('pos_name')->toArray()
                    : [];
                $newPositionNames = !empty($newPositionIds)
                    ? Position::whereIn('id', $newPositionIds)->pluck('pos_name')->toArray()
                    : [];
                
                // Calculate added and removed
                $added = array_diff($newPositionNames, $oldPositionNames);
                $removed = array_diff($oldPositionNames, $newPositionNames);
                
                $changeParts = [];
                if (!empty($added)) {
                    $changeParts[] = "Added: " . implode(', ', $added);
                }
                if (!empty($removed)) {
                    $changeParts[] = "Removed: " . implode(', ', $removed);
                }
                
                if (!empty($changeParts)) {
                    $oldValues['allowed_positions'] = ['_change_type' => 'array_diff', '_added' => array_values($added), '_removed' => array_values($removed)];
                    $newValues['allowed_positions'] = ['_change_type' => 'array_diff', '_added' => array_values($added), '_removed' => array_values($removed)];
                    $changeDescriptions[] = "Allowed Positions: " . implode('; ', $changeParts);
                }
            } catch (\Exception $e) {
                \Log::error('Failed to process position changes: ' . $e->getMessage());
            }
        }
        
        // Create a single audit log entry if there are any changes
        if (!empty($oldValues) && !empty($newValues)) {
            try {
                $description = implode('; ', $changeDescriptions);
                app(AuditLogService::class)->logUpdated(
                    'trainings',
                    'Training',
                    (string)$training->training_id,
                    $description,
                    $oldValues,
                    $newValues,
                    $training
                );
            } catch (\Exception $e) {
                // Log error but don't fail the transaction
                \Log::error('Failed to create audit log: ' . $e->getMessage(), [
                    'training_id' => $training->training_id,
                    'error' => $e->getTraceAsString()
                ]);
            }
        }

        if ($training->requires_approval && !$training->request_type_id && $request->user()) {
            $this->requestBuilderService->createRequestTypeForTraining($training, $request->user());
        }

        return redirect()->route('trainings.index')->with('success', 'Training updated successfully!');
    }

    public function destroy(Request $request, Training $training)
    {
        abort_unless($request->user()->can('delete-training'), 403, 'Unauthorized action.');
        
        // Log training soft deletion
        app(AuditLogService::class)->logDeleted(
            'trainings',
            'Training',
            (string)$training->training_id,
            "Record was marked inactive and hidden from normal views.",
            null,
            $training
        );

        $training->delete();

        return redirect()->route('trainings.index')->with('success', 'Training deleted successfully!');
    }

    /**
     * Restore a soft-deleted training
     */
    public function restore($id)
    {
        abort_unless(request()->user()->can('restore-training'), 403, 'Unauthorized action.');
        
        $training = Training::withTrashed()->findOrFail($id);
        
        if (!$training->trashed()) {
            return redirect()->route('trainings.index')->with('error', 'Training is not deleted.');
        }
        
        // Log training restoration
        app(AuditLogService::class)->logRestored(
            'trainings',
            'Training',
            (string)$training->training_id,
            "Record was restored and returned to active use.",
            $training
        );

        $training->restore();

        return redirect()->route('trainings.index')->with('success', 'Training has been restored successfully.');
    }

    /**
     * Permanently delete a training
     */
    public function forceDelete($id)
    {
        abort_unless(request()->user()->can('force-delete-training'), 403, 'Unauthorized action.');

        $training = Training::withTrashed()->findOrFail($id);
        $trainingTitle = $training->training_title ?? 'Training';
        
        // Log permanent deletion before force delete
        app(AuditLogService::class)->logPermanentlyDeleted(
            'trainings',
            'Training',
            (string)$training->training_id,
            "Record was permanently removed and cannot be recovered.",
            null,
            $training
        );
        
        $training->forceDelete();

        return redirect()->route('trainings.index')->with('success', 'Training has been permanently deleted.');
    }

    public function join(Request $request)
    {
        $user = $request->user();
        $employee = null;

        if ($user && $user->employee_id) {
            $employee = Employee::with(['primaryDesignation.unit', 'primaryDesignation.position'])
                ->find($user->employee_id);
        }

        $applications = $employee
            ? TrainingApplication::where('employee_id', $employee->id)->pluck('training_id')->toArray()
            : [];

        $trainings = Training::with([
            'allowedSectors:id,name',
            'allowedUnits:id,name',
            'allowedPositions:id,pos_name',
            'applications' => function ($query) {
                $query->whereIn('status', ['Signed Up', 'Approved']);
            },
        ])
            ->whereDate('date_to', '>=', now()->toDateString())
            ->orderBy('date_from')
            ->get()
            ->map(function (Training $training) use ($employee, $applications) {
                $isEligible = $this->eligibilityService->isEligible($training, $employee);
                $availableSpots = $this->eligibilityService->getAvailableSpots($training);
                $hasCapacity = $this->eligibilityService->hasCapacity($training);

                $dateFromFormatted = $training->date_from ? ($training->date_from instanceof \Carbon\Carbon ? $training->date_from->toDateString() : \Carbon\Carbon::parse($training->date_from)->toDateString()) : null;
                $dateToFormatted = $training->date_to ? ($training->date_to instanceof \Carbon\Carbon ? $training->date_to->toDateString() : \Carbon\Carbon::parse($training->date_to)->toDateString()) : null;

                return [
                    'training_id' => $training->training_id,
                    'training_title' => $training->training_title,
                    'date_from' => $dateFromFormatted,
                    'date_to' => $dateToFormatted,
                    'hours' => $training->hours,
                    'facilitator' => $training->facilitator,
                    'venue' => $training->venue,
                    'remarks' => $training->remarks,
                    'capacity' => $training->capacity,
                    'available_spots' => $availableSpots,
                    'has_capacity' => $hasCapacity,
                    'allowed_sectors' => $training->allowedSectors->map(fn ($sector) => [
                        'id' => $sector->id,
                        'name' => $sector->name,
                    ]),
                    'allowed_units' => $training->allowedUnits->map(fn ($unit) => [
                        'id' => $unit->id,
                        'name' => $unit->name,
                    ]),
                    'allowed_positions' => $training->allowedPositions->map(fn ($pos) => [
                        'id' => $pos->id,
                        'pos_name' => $pos->pos_name,
                    ]),
                    'is_eligible' => $isEligible,
                    'already_applied' => in_array($training->training_id, $applications, true),
                ];
            })
            ->filter(fn (array $training) => $training['is_eligible'] && !$training['already_applied'])
            ->values();

        return Inertia::render('trainings/join', [
            'trainings' => $trainings,
            'employee' => $employee
                ? [
                    'id' => $employee->id,
                    'name' => trim("{$employee->first_name} {$employee->surname}"),
                    'unit' => $employee->primaryDesignation?->unit?->name,
                    'position' => $employee->primaryDesignation?->position?->pos_name,
                    'unit_id' => $employee->primaryDesignation?->unit_id,
                    'position_id' => $employee->primaryDesignation?->position_id,
                ]
                : null,
        ]);
    }

    public function apply(Request $request)
    {
        $request->validate([
            'training_id' => 'required|exists:trainings,training_id',
        ]);

        $user = $request->user();
        $employee = null;

        if ($user) {
            if ($user->employee_id) {
                $employee = Employee::with(['primaryDesignation.unit', 'primaryDesignation.position'])->find($user->employee_id);
            }

            if (!$employee) {
                $employee = Employee::with(['primaryDesignation.unit', 'primaryDesignation.position'])
                    ->where('email_address', $user->email)->first();

                if ($employee && !$user->employee_id) {
                    $user->employee_id = $employee->id;
                    $user->save();
                }
            }
        }

        if (!$employee) {
            return redirect()->back()->with('error', 'Employee profile not found. Please contact HR.');
        }

        $training = Training::with([
            'allowedSectors:id',
            'allowedUnits:id',
            'allowedPositions:id',
            'applications' => function ($query) {
                $query->whereIn('status', ['Signed Up', 'Approved']);
            },
        ])->findOrFail($request->input('training_id'));

        // Check eligibility using service
        if (!$this->eligibilityService->isEligible($training, $employee)) {
            return redirect()->back()->with('error', 'You are not eligible to join this training.');
        }

        // Check capacity
        if (!$this->eligibilityService->hasCapacity($training)) {
            return redirect()->back()->with('error', 'This training is full. No available spots remaining.');
        }

        // Check if training requires approval
        $training->load('requestType');
        
        if ($training->requires_approval && !$training->request_type_id) {
            return redirect()->back()->with('error', 'This training requires approval but no request workflow was configured. Please contact HR to fix the training setup.');
        }
        
        if ($training->requires_approval && $training->request_type_id) {
            // Check re-apply limit
            $maxReapplyAttempts = config('training.max_reapply_attempts', 3);
            $existingApplication = TrainingApplication::where('employee_id', $employee->id)
                ->where('training_id', $training->training_id)
                ->first();
            
            if ($existingApplication && $existingApplication->re_apply_count >= $maxReapplyAttempts) {
                return redirect()->back()->with('error', "You have reached the maximum number of re-application attempts ({$maxReapplyAttempts}). Please contact HR for assistance.");
            }

            // Create request submission for approval
            $requestType = RequestType::findOrFail($training->request_type_id);
            
            if (!$requestType->isPublished()) {
                return redirect()->back()->with('error', 'Training approval workflow is not available. Please contact HR.');
            }

            DB::transaction(function () use ($request, $employee, $training, $requestType) {
                // Create request submission
                $hasApprovalSteps = $requestType->approvalSteps()->isNotEmpty();
                
                $submission = RequestSubmission::create([
                    'request_type_id' => $requestType->id,
                    'user_id' => $request->user()->id,
                    'status' => $hasApprovalSteps
                        ? RequestSubmission::STATUS_PENDING
                        : RequestSubmission::STATUS_APPROVED,
                    'current_step_index' => $hasApprovalSteps ? 0 : null,
                    'approval_state' => $this->buildInitialApprovalState($requestType),
                ]);

                // Store training application data as answers
                $this->storeTrainingApplicationAnswers($submission, $training, $employee, $requestType);

                // Initialize approval flow if needed
                if ($hasApprovalSteps) {
                    $this->initializeApprovalFlow($submission, $requestType, $training);
                }

                // Create or update training application
                $trainingApplication = TrainingApplication::updateOrCreate(
                    [
                        'employee_id' => $employee->id,
                        'training_id' => $training->training_id,
                    ],
                    [
                        'status' => $hasApprovalSteps ? 'Signed Up' : 'Approved',
                        'request_submission_id' => $submission->id,
                    ],
                );

                // If no approval needed, immediately approve
                if (!$hasApprovalSteps) {
                    $trainingApplication->update(['status' => 'Approved']);
                }
            });

            return redirect()->back()->with('success', 'Training application submitted for approval. You will be notified once it is reviewed.');
        } else {
            // No approval required - direct sign up
            TrainingApplication::updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'training_id' => $training->training_id,
                ],
                [
                    'status' => 'Signed Up',
                ],
            );

            return redirect()->back()->with('success', 'You have successfully joined the training.');
        }
    }

    /**
     * Store training application data as request answers.
     */
    protected function storeTrainingApplicationAnswers(RequestSubmission $submission, Training $training, Employee $employee, RequestType $requestType): void
    {
        $payload = [];
        
        foreach ($requestType->fields as $field) {
            $value = null;
            
            // Map training data to request fields
            switch ($field->field_key) {
                case 'training_title':
                    $value = $training->training_title;
                    break;
                case 'training_id':
                    $value = $training->training_id;
                    break;
                case 'employee_id':
                    $value = $employee->id;
                    break;
                case 'employee_name':
                    $value = trim("{$employee->first_name} {$employee->surname}");
                    break;
                case 'date_from':
                    // date_from is already a Carbon instance due to 'date' cast in model
                    /** @var \Carbon\Carbon|null $dateFrom */
                    $dateFrom = $training->date_from;
                    $value = $dateFrom ? $dateFrom->toDateString() : null;
                    break;
                case 'date_to':
                    // date_to is already a Carbon instance due to 'date' cast in model
                    /** @var \Carbon\Carbon|null $dateTo */
                    $dateTo = $training->date_to;
                    $value = $dateTo ? $dateTo->toDateString() : null;
                    break;
                case 'hours':
                    $value = $training->hours;
                    break;
                case 'venue':
                    $value = $training->venue;
                    break;
                case 'facilitator':
                    $value = $training->facilitator;
                    break;
                default:
                    $value = null;
            }

            if ($value !== null) {
                $payload[] = [
                    'submission_id' => $submission->id,
                    'field_id' => $field->id,
                    'value' => $value,
                    'value_json' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        if (!empty($payload)) {
            \DB::table('request_answers')->insert($payload);
        }
    }

    /**
     * Build initial approval state (copied from RequestSubmissionController).
     */
    protected function buildInitialApprovalState(RequestType $requestType): array
    {
        return [
            'steps' => $requestType->approvalSteps()->map(function (array $step, int $index) {
                $approvers = collect(data_get($step, 'approvers', []))->map(function ($approver) {
                    return [
                        'approver_type' => data_get($approver, 'approver_type'),
                        'approver_id' => data_get($approver, 'approver_id'),
                        'approver_role_id' => data_get($approver, 'approver_role_id'),
                        'status' => \App\Models\RequestApprovalAction::STATUS_PENDING,
                    ];
                });

                return [
                    'name' => data_get($step, 'name'),
                    'description' => data_get($step, 'description'),
                    'status' => \App\Models\RequestApprovalAction::STATUS_PENDING,
                    'approvers' => $approvers,
                    'step_index' => $index,
                ];
            })->values(),
        ];
    }

    /**
     * Initialize approval flow (copied from RequestSubmissionController with hierarchical resolution).
     * Uses training's faculty/department restrictions for position-based approvers.
     */
    protected function initializeApprovalFlow(RequestSubmission $submission, RequestType $requestType, Training $training): void
    {
        $steps = $requestType->approvalSteps();
        $hierarchicalService = app(\App\Services\HierarchicalApproverService::class);
        
        // Get requester employee for hierarchical resolution
        $requesterEmployee = null;
        if ($submission->user && $submission->user->employee_id) {
            $requesterEmployee = Employee::with(['position', 'department.faculty'])->find($submission->user->employee_id);
        }

        // Get training's allowed sectors and units for position filtering
        $training->load(['allowedSectors:id', 'allowedUnits:id']);
        $allowedSectorIds = $training->allowedSectors->pluck('id')->toArray();
        $allowedUnitIds = $training->allowedUnits->pluck('id')->toArray();

        foreach ($steps as $index => $step) {
            $approvers = collect(data_get($step, 'approvers', []));

            if ($approvers->isEmpty()) {
                continue;
            }

            // Resolve approvers hierarchically if requester employee exists
            // Pass training's restrictions for position-based approver filtering
            $resolvedApprovers = $requesterEmployee 
                ? $hierarchicalService->resolveApprovers(
                    $approvers->toArray(), 
                    $requesterEmployee,
                    !empty($allowedSectorIds) ? $allowedSectorIds : null,
                    !empty($allowedUnitIds) ? $allowedUnitIds : null
                )
                : $approvers->toArray();

            // Deduplicate approvers to prevent creating multiple approval actions for the same approver
            $seenApprovers = [];
            $uniqueApprovers = [];
            
            foreach ($resolvedApprovers as $approver) {
                $type = data_get($approver, 'approver_type');
                $approverId = data_get($approver, 'approver_id');
                $approverRoleId = data_get($approver, 'approver_role_id');
                $approverPositionId = data_get($approver, 'approver_position_id');
                
                // Create a unique key for this approver
                $key = $type . '_' . ($approverId ?? '') . '_' . ($approverRoleId ?? '') . '_' . ($approverPositionId ?? '');
                
                // Skip if we've already seen this approver in this step
                if (isset($seenApprovers[$key])) {
                    continue;
                }
                
                $seenApprovers[$key] = true;
                $uniqueApprovers[] = $approver;
            }

            foreach ($uniqueApprovers as $approver) {
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
                    'status' => \App\Models\RequestApprovalAction::STATUS_PENDING,
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

    public function logs(Request $request)
    {
        $user = $request->user();
        $employee = null;
        $statusFilter = $request->input('status', '');
        $searchFilter = $request->input('search', '');
        $dateFrom = $request->input('date_from', '');
        $dateTo = $request->input('date_to', '');
        
        // Handle 'all' as empty string for filtering
        if ($statusFilter === 'all') {
            $statusFilter = '';
        }

        if ($user) {
            if ($user->employee_id) {
                $employee = Employee::find($user->employee_id);
            }

            if (!$employee) {
                $employee = Employee::where('email_address', $user->email)->first();

                if ($employee && !$user->employee_id) {
                    $user->employee_id = $employee->id;
                    $user->save();
                }
            }
        }

        $history = $employee
            ? TrainingApplication::with(['training' => fn ($q) => $q->withTrashed()])
                ->where('employee_id', $employee->id)
                ->when($statusFilter, function ($query) use ($statusFilter) {
                    // Filter by status, but handle dynamic statuses
                    $validStatuses = ['Signed Up', 'Approved', 'Completed', 'Cancelled', 'Rejected', 'No Show', 'Ongoing'];
                    if (in_array($statusFilter, $validStatuses)) {
                        if ($statusFilter === 'Ongoing') {
                            // For Ongoing, we need to filter by date range and status
                            $query->where('status', 'Signed Up')
                                ->whereHas('training', function ($q) {
                                    $q->whereDate('date_from', '<=', now())
                                      ->whereDate('date_to', '>=', now());
                                });
                        } elseif ($statusFilter === 'Completed') {
                            // For Completed, check if training ended and status is Signed Up or Approved
                            $query->where(function ($q) {
                                $q->whereIn('status', ['Signed Up', 'Approved'])
                                  ->whereHas('training', function ($q2) {
                                      $q2->whereDate('date_to', '<', now());
                                  });
                            })->orWhere('status', 'Completed');
                        } else {
                            $query->where('status', $statusFilter);
                        }
                    }
                })
                ->orderByDesc('updated_at')
                ->get()
                ->map(function (TrainingApplication $application) {
                    $training = $application->training;
                    $trainingStarts = $training?->date_from;
                    $trainingEnds = $training?->date_to;
                    $dynamicStatus = $application->status;
                    $now = now();

                    // Check if training is currently ongoing
                    if ($trainingStarts && $trainingEnds) {
                        $isOngoing = $now->greaterThanOrEqualTo($trainingStarts) && $now->lessThanOrEqualTo($trainingEnds);
                        
                        if ($isOngoing && $application->status === 'Signed Up') {
                            $dynamicStatus = 'Ongoing';
                        } elseif ($trainingEnds->isPast()) {
                            // Training has ended
                            $dynamicStatus = $application->status === 'Signed Up' ? 'Completed' : $application->status;
                        }
                    } elseif ($trainingEnds && $trainingEnds->isPast()) {
                        // Training has ended (no start date check)
                        $dynamicStatus = $application->status === 'Signed Up' ? 'Completed' : $application->status;
                    }

                    $trainingTitle = $training?->training_title ?? ($application->training_id ? "Training #{$application->training_id} (record permanently deleted)" : 'Training (record permanently deleted)');
                    $venue = $training?->venue ?? '(record permanently deleted)';
                    $facilitator = $training?->facilitator ?? '(record permanently deleted)';
                    $remarks = $training?->remarks ?? '(record permanently deleted)';

                    return [
                        'id' => $application->apply_id,
                        'training_title' => $trainingTitle,
                        'status' => $dynamicStatus,
                        'original_status' => $application->status,
                        'attendance' => $application->attendance,
                        'date_from' => $training?->date_from?->toDateString(),
                        'date_to' => $training?->date_to?->toDateString(),
                        'hours' => $training?->hours,
                        'venue' => $venue,
                        'facilitator' => $facilitator,
                        'remarks' => $remarks,
                        'capacity' => $training?->capacity,
                        'certificate_path' => $application->certificate_path,
                        'sign_up_date' => optional($application->sign_up_date)->toDateTimeString(),
                        'updated_at' => optional($application->updated_at)->toDateTimeString(),
                        'created_at' => optional($application->created_at)->toDateTimeString(),
                    ];
                })
                ->when($statusFilter === 'Ongoing' || $statusFilter === 'Completed', function ($collection) use ($statusFilter) {
                    // Filter by dynamic status after mapping
                    return $collection->filter(function ($entry) use ($statusFilter) {
                        $status = is_array($entry) ? ($entry['status'] ?? null) : ($entry->status ?? null);
                        return $status === $statusFilter;
                    });
                })
            : collect();

        return Inertia::render('trainings/logs', [
            'entries' => $history,
            'filters' => [
                'status' => $statusFilter,
                'search' => $searchFilter,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }

    /**
     * Format date values for audit logs (ensures YYYY-MM-DD format)
     */
    protected function formatDateForAudit(string $field, $value)
    {
        // Check if this is a date field
        $dateFields = ['date_from', 'date_to'];
        if (!in_array($field, $dateFields)) {
            return $value;
        }

        if ($value === null) {
            return null;
        }

        try {
            // If it's already a Carbon instance
            if ($value instanceof \Carbon\Carbon) {
                return $value->toDateString();
            }

            // If it's a DateTimeInterface
            if ($value instanceof \DateTimeInterface) {
                return \Carbon\Carbon::instance($value)->toDateString();
            }

            // If it's a string, try to parse it
            if (is_string($value)) {
                // If already in YYYY-MM-DD format, return as is
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                    return $value;
                }

                // Try to parse and format (handles ISO format strings)
                $carbon = \Carbon\Carbon::parse($value);
                return $carbon->toDateString();
            }
        } catch (\Exception $e) {
            // If parsing fails, return original value
            return $value;
        }

        return $value;
    }

    /**
     * Normalize value for comparison (handles dates, booleans, nulls, etc.)
     */
    protected function normalizeValue($value)
    {
        if ($value === null || $value === '') {
            return null;
        }
        
        if ($value instanceof \DateTime || $value instanceof \Carbon\Carbon) {
            return $value->format('Y-m-d');
        }
        
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        
        // Convert to string for comparison to handle numeric differences
        return (string) $value;
    }

    public function overview(Request $request)
    {
        $scopeQuery = $this->scopeService->getEmployeeScope($request->user());
        $statusFilter = $request->input('status', '');
        $searchFilter = $request->input('search', '');
        $dateFrom = $request->input('date_from', '');
        $dateTo = $request->input('date_to', '');
        
        // Handle 'all' as empty string for filtering
        if ($statusFilter === 'all') {
            $statusFilter = '';
        }

        // Get overview data (trainings with participants)
        $trainings = Training::with([
            'applications.employee.primaryDesignation.unit',
            'applications.employee.primaryDesignation.position',
        ])
            ->orderByDesc('date_from')
            ->get()
            ->map(function (Training $training) use ($scopeQuery) {
                // Filter participants based on scope
                $participants = $training->applications
                    ->filter(function (TrainingApplication $application) use ($scopeQuery) {
                        if ($scopeQuery === null) {
                            return true; // Super admin/admin - show all
                        }
                        $employee = $application->employee;
                        if (!$employee) {
                            return false;
                        }
                        // Check if employee is in scope by cloning the query and checking
                        $employeeIds = (clone $scopeQuery)->pluck('id')->toArray();
                        return in_array($employee->id, $employeeIds);
                    })
                    ->map(function (TrainingApplication $application) {
                    $employee = $application->employee;
                    return [
                        'name' => $employee ? trim("{$employee->first_name} {$employee->surname}") : 'Unknown',
                        'unit' => $employee?->primaryDesignation?->unit?->name ?? '-',
                        'position' => $employee?->primaryDesignation?->position?->pos_name ?? '-',
                    ];
                });

                // Determine training status based on dates and applications
                $now = now();
                $dateFrom = $training->date_from;
                $dateTo = $training->date_to;
                
                $status = 'Upcoming';
                if ($dateFrom && $dateTo) {
                    // date_from and date_to are already Carbon instances due to 'date' cast in model
                    /** @var \Carbon\Carbon $dateFrom */
                    /** @var \Carbon\Carbon $dateTo */
                    if ($now->isBefore($dateFrom)) {
                        $status = 'Upcoming';
                    } elseif ($now->isAfter($dateTo)) {
                        // Check if any participants completed
                        $hasCompleted = $training->applications->contains(function ($app) {
                            return in_array($app->status, ['Completed', 'Approved']);
                        });
                        $status = $hasCompleted ? 'Completed' : 'Ended';
                    } else {
                        $status = 'Ongoing';
                    }
                }
                
                // Use saved reference number or generate if missing
                $referenceNumber = $training->reference_number;
                if (!$referenceNumber) {
                    // date_from is already a Carbon instance due to 'date' cast in model
                    /** @var \Carbon\Carbon|null $dateFrom */
                    $dateStr = $dateFrom ? $dateFrom->format('Ymd') : date('Ymd');
                    $referenceNumber = 'TRG-' . str_pad($training->training_id, 6, '0', STR_PAD_LEFT) . '-' . $dateStr;
                    // Save it for future use
                    $training->reference_number = $referenceNumber;
                    $training->save();
                }

                // date_from and date_to are already Carbon instances due to 'date' cast in model
                // Use getRawOriginal to get the raw value, then parse it
                $dateFromRaw = $training->getRawOriginal('date_from');
                $dateToRaw = $training->getRawOriginal('date_to');
                $dateFromFormatted = $dateFromRaw ? (\Carbon\Carbon::parse($dateFromRaw)->toDateString()) : null;
                $dateToFormatted = $dateToRaw ? (\Carbon\Carbon::parse($dateToRaw)->toDateString()) : null;

                return [
                    'training_id' => $training->training_id,
                    'training_title' => $training->training_title,
                    'date_from' => $dateFromFormatted,
                    'date_to' => $dateToFormatted,
                    'venue' => $training->venue,
                    'total_participants' => $participants->count(),
                    'participants' => $participants,
                    'status' => $status,
                    'reference_number' => $referenceNumber,
                ];
            })
            // Filter out trainings with no participants in scope
            ->filter(function ($training) {
                return $training['total_participants'] > 0;
            })
            ->values();

        // Get logs data (all training applications)
        $logsQuery = TrainingApplication::with(['training', 'employee.primaryDesignation.unit', 'employee.primaryDesignation.position']);
        
        // Apply scope filter for logs
        if ($scopeQuery !== null) {
            $employeeIds = (clone $scopeQuery)->pluck('id')->toArray();
            $logsQuery->whereIn('employee_id', $employeeIds);
        }
        
        $logs = $logsQuery
            ->when($statusFilter, function ($query) use ($statusFilter) {
                $validStatuses = ['Signed Up', 'Approved', 'Completed', 'Cancelled', 'Rejected', 'No Show', 'Ongoing'];
                if (in_array($statusFilter, $validStatuses)) {
                    if ($statusFilter === 'Ongoing') {
                        $query->where('status', 'Signed Up')
                            ->whereHas('training', function ($q) {
                                $q->whereDate('date_from', '<=', now())
                                  ->whereDate('date_to', '>=', now());
                            });
                    } elseif ($statusFilter === 'Completed') {
                        $query->where(function ($q) {
                            $q->whereIn('status', ['Signed Up', 'Approved'])
                              ->whereHas('training', function ($q2) {
                                  $q2->whereDate('date_to', '<', now());
                              });
                        })->orWhere('status', 'Completed');
                    } else {
                        $query->where('status', $statusFilter);
                    }
                }
            })
            ->orderByDesc('updated_at')
            ->get()
            ->map(function (TrainingApplication $application) {
                $training = $application->training;
                $employee = $application->employee;
                $trainingStarts = $training?->date_from;
                $trainingEnds = $training?->date_to;
                $dynamicStatus = $application->status;
                $now = now();

                // Check if training is currently ongoing
                if ($trainingStarts && $trainingEnds) {
                    $isOngoing = $now->greaterThanOrEqualTo($trainingStarts) && $now->lessThanOrEqualTo($trainingEnds);
                    
                    if ($isOngoing && $application->status === 'Signed Up') {
                        $dynamicStatus = 'Ongoing';
                    } elseif ($trainingEnds->isPast()) {
                        $dynamicStatus = $application->status === 'Signed Up' ? 'Completed' : $application->status;
                    }
                } elseif ($trainingEnds && $trainingEnds->isPast()) {
                    $dynamicStatus = $application->status === 'Signed Up' ? 'Completed' : $application->status;
                }

                return [
                    'id' => $application->apply_id,
                    'training_title' => $training?->training_title,
                    'status' => $dynamicStatus,
                    'original_status' => $application->status,
                    'attendance' => $application->attendance,
                    'date_from' => $training?->date_from?->toDateString(),
                    'date_to' => $training?->date_to?->toDateString(),
                    'hours' => $training?->hours,
                    'venue' => $training?->venue,
                    'facilitator' => $training?->facilitator,
                    'remarks' => $training?->remarks,
                    'capacity' => $training?->capacity,
                    'certificate_path' => $application->certificate_path,
                    'sign_up_date' => optional($application->sign_up_date)->toDateTimeString(),
                    'updated_at' => optional($application->updated_at)->toDateTimeString(),
                    'created_at' => optional($application->created_at)->toDateTimeString(),
                    'employee_name' => $employee ? trim("{$employee->first_name} {$employee->surname}") : 'Unknown',
                    'employee_unit' => $employee?->primaryDesignation?->unit?->name ?? '-',
                    'employee_position' => $employee?->primaryDesignation?->position?->pos_name ?? '-',
                ];
            })
            ->when($statusFilter === 'Ongoing' || $statusFilter === 'Completed', function ($collection) use ($statusFilter) {
                return $collection->filter(function ($entry) use ($statusFilter) {
                    return $entry['status'] === $statusFilter;
                });
            })
            ->values();

        return Inertia::render('trainings/overview', [
            'trainings' => $trainings,
            'logs' => $logs,
            'filters' => [
                'status' => $statusFilter,
                'search' => $searchFilter,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }
}

