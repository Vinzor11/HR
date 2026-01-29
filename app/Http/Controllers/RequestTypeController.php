<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRequestTypeRequest;
use App\Http\Requests\UpdateRequestTypeRequest;
use App\Models\CertificateTemplate;
use App\Models\Sector;
use App\Models\Unit;
use App\Models\Position;
use App\Models\RequestField;
use App\Models\RequestSubmission;
use App\Models\RequestType;
use App\Models\Role;
use App\Models\Training;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\CertificateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RequestTypeController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('access-request-types-module'), 403, 'Unauthorized action.');
        
        $search = (string) $request->input('search', '');
        $statusFilter = $request->input('status', 'all');
        $perPage = $request->integer('perPage', 10);

        $requestTypes = RequestType::with(['creator:id,name', 'fields:id,request_type_id'])
            ->withCount([
                'fields',
                'submissions as pending_submissions_count' => fn ($query) => $query->where('status', RequestSubmission::STATUS_PENDING),
            ])
            ->when($search, fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->when($statusFilter === 'draft', fn ($query) => $query->where('is_published', false))
            ->when($statusFilter === 'published', fn ($query) => $query->where('is_published', true))
            ->orderByDesc('updated_at')
            ->paginate($perPage)
            ->withQueryString();

        $metrics = [
            'total' => RequestType::count(),
            'published' => RequestType::where('is_published', true)->count(),
            'drafts' => RequestType::where('is_published', false)->count(),
        ];

        return Inertia::render('request-types/index', [
            'requestTypes' => $requestTypes,
            'filters' => [
                'search' => $search,
                'status' => $statusFilter,
                'perPage' => $perPage,
            ],
            'metrics' => $metrics,
        ]);
    }

    public function create(Request $request): Response
    {
        abort_unless($request->user()->can('create-request-type'), 403, 'Unauthorized action.');
        
        return Inertia::render('request-types/builder', [
            'mode' => 'create',
            'requestType' => null,
            'formOptions' => $this->formOptions(null),
            'selectedCertificateTemplate' => null,
            'systemFieldKeys' => CertificateService::getSystemFieldKeys(),
        ]);
    }

    public function store(StoreRequestTypeRequest $request)
    {
        abort_unless($request->user()->can('create-request-type'), 403, 'Unauthorized action.');
        
        $validated = $request->validated();

        $requestType = DB::transaction(function () use ($request, $validated) {
            $type = RequestType::create([
                'created_by' => $request->user()->id,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'has_fulfillment' => $validated['has_fulfillment'],
                'approval_steps' => $this->normalizeApprovalSteps($validated['approval_steps'] ?? []),
                'is_published' => (bool) data_get($validated, 'is_published', false),
                'published_at' => data_get($validated, 'is_published', false) ? now() : null,
                'certificate_template_id' => data_get($validated, 'certificate_template_id'),
                'certificate_config' => data_get($validated, 'certificate_config'),
            ]);

            $this->syncFields($type, $validated['fields'] ?? []);

            // Log request type creation
            app(AuditLogService::class)->logCreated(
                'request-types',
                'RequestType',
                (string)$type->id,
                "Created a New Request Type: {$type->name}",
                null,
                $type
            );

            return $type;
        });

        return redirect()
            ->route('request-types.edit', $requestType)
            ->with('success', 'Request type created successfully.');
    }

    public function edit(Request $request, RequestType $requestType): Response
    {
        abort_unless($request->user()->can('edit-request-type'), 403, 'Unauthorized action.');
        
        $requestType->load(['fields' => fn ($query) => $query->orderBy('sort_order')]);

        $selectedCertificateTemplate = null;
        $layerNames = null;
        if ($requestType->certificate_template_id) {
            $template = CertificateTemplate::with('textLayers')
                ->find($requestType->certificate_template_id);
            if ($template) {
                $layerNames = $template->textLayers->pluck('name')->toArray();
                $selectedCertificateTemplate = [
                    'id' => $template->id,
                    'name' => $template->name,
                    'text_layers' => $template->textLayers->map(fn ($layer) => [
                        'id' => $layer->id,
                        'name' => $layer->name,
                    ])->toArray(),
                ];
            }
        }
        $certificateConfig = $this->normalizeCertificateConfigForBuilder($requestType, $layerNames);

        return Inertia::render('request-types/builder', [
            'mode' => 'edit',
            'requestType' => [
                'id' => $requestType->id,
                'name' => $requestType->name,
                'description' => $requestType->description,
                'has_fulfillment' => $requestType->has_fulfillment,
                'is_published' => $requestType->is_published,
                'certificate_template_id' => $requestType->certificate_template_id,
                'certificate_config' => $certificateConfig,
                'approval_steps' => $requestType->approvalSteps(),
                'fields' => $requestType->fields->map(fn (RequestField $field) => [
                    'id' => $field->id,
                    'field_key' => $field->field_key,
                    'label' => $field->label,
                    'field_type' => $field->field_type,
                    'is_required' => $field->is_required,
                    'description' => $field->description,
                    'options' => $field->options,
                    'sort_order' => $field->sort_order,
                ]),
            ],
            'formOptions' => $this->formOptions($requestType),
            'selectedCertificateTemplate' => $selectedCertificateTemplate,
            'systemFieldKeys' => CertificateService::getSystemFieldKeys(),
        ]);
    }

    public function update(UpdateRequestTypeRequest $request, RequestType $requestType)
    {
        abort_unless($request->user()->can('edit-request-type'), 403, 'Unauthorized action.');
        
        $validated = $request->validated();

        DB::transaction(function () use ($requestType, $validated) {
            // Get original values before update
            $original = $requestType->getOriginal();
            
            $requestType->update([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'has_fulfillment' => $validated['has_fulfillment'],
                'approval_steps' => $this->normalizeApprovalSteps($validated['approval_steps'] ?? []),
                'is_published' => (bool) data_get($validated, 'is_published', $requestType->is_published),
                'published_at' => data_get($validated, 'is_published', $requestType->is_published)
                    ? ($requestType->published_at ?? now())
                    : null,
                'certificate_template_id' => data_get($validated, 'certificate_template_id'),
                'certificate_config' => data_get($validated, 'certificate_config'),
            ]);

            $this->syncFields($requestType, $validated['fields'] ?? []);

            // Collect all changes for a single audit log entry
            $oldValues = [];
            $newValues = [];
            $changeDescriptions = [];
            
            foreach (['name', 'description', 'has_fulfillment', 'is_published'] as $field) {
                if (isset($original[$field]) && $original[$field] != $requestType->$field) {
                    $fieldName = str_replace('_', ' ', $field);
                    $fieldName = ucwords($fieldName);
                    
                    $oldValue = $original[$field];
                    $newValue = $requestType->$field;
                    
                    $oldValueFormatted = is_array($oldValue) ? implode(', ', $oldValue) : (string)($oldValue ?? '');
                    $newValueFormatted = is_array($newValue) ? implode(', ', $newValue) : (string)($newValue ?? '');
                    
                    $oldValues[$field] = $oldValue;
                    $newValues[$field] = $newValue;
                    $changeDescriptions[] = "{$fieldName}: {$oldValueFormatted} > {$newValueFormatted}";
                }
            }

            // Create a single audit log entry if there are any changes
            if (!empty($oldValues) && !empty($newValues)) {
                $description = implode('; ', $changeDescriptions);
                app(AuditLogService::class)->logUpdated(
                    'request-types',
                    'RequestType',
                    (string)$requestType->id,
                    $description,
                    $oldValues,
                    $newValues,
                    $requestType
                );
            }
        });

        return redirect()
            ->route('request-types.edit', $requestType)
            ->with('success', 'Request type updated successfully.');
    }

    public function destroy(Request $request, RequestType $requestType)
    {
        abort_unless($request->user()->can('delete-request-type'), 403, 'Unauthorized action.');
        
        // Log request type deletion
        app(AuditLogService::class)->logDeleted(
            'request-types',
            'RequestType',
            (string)$requestType->id,
            "Record was marked inactive and hidden from normal views.",
            null,
            $requestType
        );

        $requestType->delete();

        return redirect()->route('request-types.index')->with('success', 'Request type deleted successfully.');
    }

    public function publish(Request $request, RequestType $requestType)
    {
        abort_unless($request->user()->can('access-request-types-module'), 403, 'Unauthorized action.');
        
        $request->validate([
            'is_published' => ['required', 'boolean'],
        ]);

        $isPublishing = (bool) $request->boolean('is_published');
        $originalPublished = $requestType->is_published;
        
        $requestType->update([
            'is_published' => $isPublishing,
            'published_at' => $isPublishing ? now() : null,
        ]);

        // Log publish/unpublish action
        if ($originalPublished !== $isPublishing) {
            app(AuditLogService::class)->log(
                $isPublishing ? 'published' : 'unpublished',
                'requests',
                'RequestType',
                (string)$requestType->id,
                $isPublishing ? "Published Request Type: {$requestType->name}" : "Unpublished Request Type: {$requestType->name}",
                ['is_published' => $originalPublished],
                ['is_published' => $isPublishing]
            );
        }

        return back()->with('success', $isPublishing ? 'Request type published.' : 'Request type unpublished.');
    }

    protected function syncFields(RequestType $requestType, array $fields): void
    {
        $existingFields = $requestType->fields()->get()->keyBy('id');
        $preserveIds = [];
        $reservedKeys = $existingFields->pluck('field_key')->toArray();

        foreach ($fields as $index => $field) {
            $fieldId = data_get($field, 'id');
            $existingField = $fieldId ? $existingFields->get($fieldId) : null;
            $payload = [
                'field_key' => $this->determineFieldKey($field, $reservedKeys, $existingField?->field_key),
                'label' => $field['label'],
                'field_type' => $field['field_type'],
                'is_required' => (bool) data_get($field, 'is_required', false),
                'description' => data_get($field, 'description'),
                'options' => data_get($field, 'options'),
                'sort_order' => data_get($field, 'sort_order', $index),
            ];

            if ($fieldId && $existingFields->has($fieldId)) {
                $existingFields[$fieldId]->update($payload);
                $preserveIds[] = $fieldId;
            } else {
                $newField = $requestType->fields()->create($payload);
                $preserveIds[] = $newField->id;
            }
        }

        $requestType->fields()->whereNotIn('id', $preserveIds)->delete();
    }

    protected function determineFieldKey(array $field, array &$reservedKeys, ?string $currentKey = null): string
    {
        $provided = trim((string) data_get($field, 'field_key', ''));

        if ($currentKey && $provided === $currentKey) {
            $reservedKeys[] = $currentKey;
            return $currentKey;
        }

        if ($provided !== '') {
            return $this->makeUniqueKey($provided, $reservedKeys);
        }

        if ($currentKey && $provided === '') {
            $reservedKeys[] = $currentKey;
            return $currentKey;
        }

        $base = Str::slug((string) data_get($field, 'label', 'field')) ?: 'field';
        return $this->makeUniqueKey($base, $reservedKeys);
    }

    protected function makeUniqueKey(string $base, array &$reservedKeys): string
    {
        $base = Str::slug($base) ?: 'field';
        $candidate = $base;
        $suffix = 1;

        while (in_array($candidate, $reservedKeys, true)) {
            $candidate = "{$base}-{$suffix}";
            $suffix++;
        }

        $reservedKeys[] = $candidate;

        return $candidate;
    }

    /**
     * Normalize certificate_config.field_mappings to "layer name → data key" for the builder.
     * Converts legacy "data key → layer name" format so the UI and backend stay consistent.
     */
    protected function normalizeCertificateConfigForBuilder(RequestType $requestType, ?array $layerNames = null): array
    {
        $config = $requestType->certificate_config ?? [];
        $mappings = $config['field_mappings'] ?? [];

        if (empty($mappings)) {
            return $config;
        }

        if ($layerNames === null && $requestType->certificate_template_id) {
            $template = CertificateTemplate::with('textLayers')->find($requestType->certificate_template_id);
            $layerNames = $template ? $template->textLayers->pluck('name')->toArray() : [];
        }

        $layerNames = $layerNames ?? [];
        $firstKey = array_key_first($mappings);
        $firstValue = $mappings[$firstKey] ?? null;

        // New format: keys are layer names
        $isNewFormat = $firstKey !== null && in_array($firstKey, $layerNames, true);
        // Old format: values are layer names (data_key → layer_name)
        $isOldFormat = $firstValue !== null && in_array($firstValue, $layerNames, true);

        if ($isNewFormat || ! $isOldFormat) {
            return $config;
        }

        $inverted = [];
        foreach ($mappings as $dataKey => $layerName) {
            if ($layerName !== '' && $layerName !== null) {
                $inverted[$layerName] = $dataKey;
            }
        }
        $config['field_mappings'] = $inverted;

        return $config;
    }

    protected function normalizeApprovalSteps(array $steps): array
    {
        return collect($steps)
            ->values()
            ->map(function (array $step, int $index) {
                $approverList = collect(data_get($step, 'approvers', []));

                if ($approverList->isEmpty() && data_get($step, 'approver_type')) {
                    $approverList = collect([[
                        'approver_type' => data_get($step, 'approver_type'),
                        'approver_id' => data_get($step, 'approver_id'),
                        'approver_role_id' => data_get($step, 'approver_role_id'),
                        'approver_position_id' => data_get($step, 'approver_position_id'),
                    ]]);
                }

                $normalizedApprovers = $approverList
                    ->map(function ($approver) {
                        $type = data_get($approver, 'approver_type');

                        return [
                            'id' => data_get($approver, 'id', (string) Str::ulid()),
                            'approver_type' => $type,
                            'approver_id' => $type === 'user' ? data_get($approver, 'approver_id') : null,
                            'approver_role_id' => $type === 'role' ? data_get($approver, 'approver_role_id') : null,
                            'approver_position_id' => $type === 'position' ? data_get($approver, 'approver_position_id') : null,
                            'min_authority_level' => $type === 'hierarchical' ? data_get($approver, 'min_authority_level') : null,
                        ];
                    })
                    ->filter(fn ($approver) => $approver['approver_type'] && (
                        $approver['approver_id'] || 
                        $approver['approver_role_id'] || 
                        $approver['approver_position_id'] ||
                        $approver['approver_type'] === 'hierarchical'
                    ))
                    ->values();

                return [
                    'id' => data_get($step, 'id', (string) Str::ulid()),
                    'name' => data_get($step, 'name'),
                    'description' => data_get($step, 'description'),
                    'approvers' => $normalizedApprovers->all(),
                    'sort_order' => $index,
                ];
            })
            ->all();
    }

    protected function formOptions(?RequestType $requestType = null): array
    {
        $fieldTypes = collect([
            ['value' => 'text', 'label' => 'Text Input', 'description' => 'Single line text field'],
            ['value' => 'number', 'label' => 'Number', 'description' => 'Numeric values only'],
            ['value' => 'date', 'label' => 'Date Picker', 'description' => 'Calendar date selection'],
            ['value' => 'textarea', 'label' => 'Textarea', 'description' => 'Multi-line text input'],
            ['value' => 'checkbox', 'label' => 'Checkbox', 'description' => 'Single boolean checkbox'],
            ['value' => 'dropdown', 'label' => 'Dropdown', 'description' => 'Single select dropdown'],
            ['value' => 'radio', 'label' => 'Radio Buttons', 'description' => 'Single select radio group'],
            ['value' => 'file', 'label' => 'File Upload', 'description' => 'Upload supporting files'],
        ]);

        $roles = Role::orderBy('name')->get(['id', 'name', 'label']);
        $users = User::orderBy('name')->get(['id', 'name', 'email']);
        
        // Filter positions based on trainings that use this request type
        $positionsQuery = Position::orderBy('pos_name');
        
        if ($requestType) {
            // Get all trainings that use this request type (using new org structure)
            $trainings = Training::where('request_type_id', $requestType->id)
                ->with(['allowedSectors:id', 'allowedUnits:id'])
                ->get();
            
            if ($trainings->isNotEmpty()) {
                // Collect all unique sector IDs from all trainings
                $allSectorIds = $trainings->flatMap(function ($training) {
                    return method_exists($training, 'allowedSectors') ? $training->allowedSectors->pluck('id') : collect();
                })->unique()->values()->toArray();
                
                // Filter positions to only those associated with these sectors
                if (!empty($allSectorIds)) {
                    $positionsQuery->whereIn('sector_id', $allSectorIds);
                }
            }
        }
        
        $positions = $positionsQuery->with(['sector:id,name'])->get(['id', 'pos_name as name', 'sector_id', 'authority_level']);
        
        // Get all sectors and units for filtering (new org structure)
        $sectors = Sector::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
        $units = Unit::where('is_active', true)
            ->orderBy('name')
            ->with('sector:id,name')
            ->get(['id', 'name', 'code', 'unit_type', 'sector_id']);
        $certificateTemplates = CertificateTemplate::active()->with('textLayers')->orderBy('name')->get(['id', 'name', 'description']);
        
        return [
            'fieldTypes' => $fieldTypes,
            'approvalModes' => [
                ['value' => 'user', 'label' => 'Specific User', 'description' => 'Route approval to a specific user'],
                ['value' => 'position', 'label' => 'Position Based', 'description' => 'Route approval to anyone holding this position'],
                ['value' => 'hierarchical', 'label' => 'Hierarchical (Authority Level)', 'description' => 'Auto-route based on requester hierarchy using authority_level'],
            ],
            'roles' => $roles,
            'users' => $users,
            'positions' => $positions->map(function ($position) {
                return [
                    'id' => $position->id,
                    'name' => $position->name,
                    'sector_id' => $position->sector_id,
                    'authority_level' => $position->authority_level,
                    'sector' => $position->sector ? ['id' => $position->sector->id, 'name' => $position->sector->name] : null,
                ];
            })->toArray(),
            'sectors' => $sectors->toArray(),
            'units' => $units->map(function ($unit) {
                return [
                    'id' => $unit->id,
                    'name' => $unit->name,
                    'code' => $unit->code,
                    'unit_type' => $unit->unit_type,
                    'sector_id' => $unit->sector_id,
                    'sector' => $unit->sector ? ['id' => $unit->sector->id, 'name' => $unit->sector->name] : null,
                ];
            })->toArray(),
            'certificateTemplates' => $certificateTemplates->map(function ($template) {
                return [
                    'id' => $template->id,
                    'name' => $template->name,
                    'description' => $template->description,
                    'text_layers' => $template->textLayers->map(fn ($layer) => [
                        'id' => $layer->id,
                        'name' => $layer->name,
                    ])->toArray(),
                ];
            })->toArray(),
        ];
    }
}
