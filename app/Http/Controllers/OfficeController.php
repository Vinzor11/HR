<?php

namespace App\Http\Controllers;

use App\Http\Requests\OfficeRequest;
use App\Models\Department;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OfficeController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('access-office'), 403, 'Unauthorized action.');

        $perPage = $request->integer('perPage', 10);
        $search = (string) $request->input('search', '');
        $searchMode = $request->input('search_mode', 'any');
        $showDeleted = $request->boolean('show_deleted', false);
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');

        // Validate sort_by to prevent SQL injection
        $allowedSortColumns = ['name', 'code', 'faculty_name', 'created_at', 'updated_at'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'name';
        }

        // Validate sort_order
        $sortOrder = strtolower($sortOrder) === 'desc' ? 'desc' : 'asc';

        $offices = Department::query()
            ->where('type', 'administrative')
            ->when($showDeleted, function ($query) {
                $query->onlyTrashed();
            })
            ->when($search, function ($query) use ($search, $searchMode) {
                $query->where(function ($innerQuery) use ($search, $searchMode) {
                    switch ($searchMode) {
                        case 'name':
                            $innerQuery->where('name', 'like', "%{$search}%");
                            break;
                        case 'code':
                            $innerQuery->where('code', 'like', "%{$search}%");
                            break;
                        case 'faculty':
                            $innerQuery->where('faculty_name', 'like', "%{$search}%");
                            break;
                        case 'description':
                            $innerQuery->where('description', 'like', "%{$search}%");
                            break;
                        default:
                            $innerQuery
                                ->where('name', 'like', "%{$search}%")
                                ->orWhere('code', 'like', "%{$search}%")
                                ->orWhere('faculty_name', 'like', "%{$search}%")
                                ->orWhere('description', 'like', "%{$search}%");
                    }
                });
            })
            ->orderBy($sortBy, $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('offices/index', [
            'offices' => $offices,
            'filters' => [
                'search' => $search,
                'search_mode' => $searchMode,
                'perPage' => $perPage,
                'show_deleted' => $showDeleted,
            ],
        ]);
    }

    public function store(OfficeRequest $request): RedirectResponse
    {
        abort_unless($request->user()->can('create-office'), 403, 'Unauthorized action.');

        $office = Department::create(array_merge($request->validated(), [
            'type' => 'administrative',
            'faculty_id' => null, // Offices don't belong to faculties
        ]));

        if ($office) {
            // Log office creation
            app(AuditLogService::class)->logCreated(
                'offices',
                'Office',
                (string)$office->id,
                "Created a New Office: {$office->name}",
                null,
                $office
            );

            return redirect()
                ->route('offices.index')
                ->with('success', 'Office created successfully!');
        }

        return redirect()
            ->back()
            ->with('error', 'Unable to create office. Please try again!')
            ->withInput();
    }

    public function update(OfficeRequest $request, $office): RedirectResponse
    {
        abort_unless($request->user()->can('edit-office'), 403, 'Unauthorized action.');

        $office = Department::findOrFail($office);
        
        // Ensure this is an administrative department (office)
        if ($office->type !== 'administrative') {
            return redirect()
                ->back()
                ->with('error', 'Invalid office record.');
        }

        if ($office) {
            // Get original values before update
            $office->refresh();
            $original = $office->getOriginal();
            $validated = $request->validated();
            $validated['faculty_id'] = null; // Offices don't belong to faculties
            $changes = [];

            DB::transaction(function () use ($office, $validated, $original, &$changes) {
                // Track changes BEFORE updating
                foreach ($validated as $key => $newValue) {
                    $oldValue = $original[$key] ?? null;
                    
                    // Normalize values for comparison
                    $normalizedOld = $this->normalizeValue($oldValue);
                    $normalizedNew = $this->normalizeValue($newValue);
                    
                    // Compare normalized values
                    if ($normalizedOld != $normalizedNew) {
                        $changes[$key] = [
                            'old' => $oldValue,
                            'new' => $newValue,
                        ];
                    }
                }
                
                // Update the office
                $office->update($validated);
                
                // Collect all changes for a single audit log entry
                $oldValues = [];
                $newValues = [];
                $changeDescriptions = [];
                
                foreach ($changes as $field => $change) {
                    $fieldName = str_replace('_', ' ', $field);
                    $fieldName = ucwords($fieldName);
                    
                    // Format old and new values for display
                    $oldValueFormatted = is_array($change['old']) ? implode(', ', $change['old']) : (string)($change['old'] ?? '');
                    $newValueFormatted = is_array($change['new']) ? implode(', ', $change['new']) : (string)($change['new'] ?? '');
                    
                    $oldValues[$field] = $change['old'];
                    $newValues[$field] = $change['new'];
                    $changeDescriptions[] = "{$fieldName}: {$oldValueFormatted} > {$newValueFormatted}";
                }
                
                // Create a single audit log entry if there are any changes
                if (!empty($oldValues) && !empty($newValues)) {
                    try {
                        $description = implode('; ', $changeDescriptions);
                        app(AuditLogService::class)->logUpdated(
                            'offices',
                            'Office',
                            (string)$office->id,
                            $description,
                            $oldValues,
                            $newValues,
                            $office
                        );
                    } catch (\Exception $e) {
                        \Log::error('Failed to create audit log: ' . $e->getMessage(), [
                            'office_id' => $office->id,
                            'error' => $e->getTraceAsString()
                        ]);
                    }
                }
            });

            return redirect()
                ->route('offices.index')
                ->with('success', 'Office updated successfully!');
        }

        return redirect()
            ->back()
            ->with('error', 'Unable to update office. Please try again!')
            ->withInput();
    }

    public function destroy($office): RedirectResponse
    {
        abort_unless(request()->user()->can('delete-office'), 403, 'Unauthorized action.');

        $office = Department::findOrFail($office);
        $office->refresh();
        
        // Ensure this is an administrative department (office)
        if ($office->type !== 'administrative') {
            return redirect()
                ->back()
                ->with('error', 'Invalid office record.');
        }

        if ($office) {
            // Check if office has employees
            if ($office->employees()->count() > 0) {
                return redirect()
                    ->route('offices.index')
                    ->with('error', 'Cannot delete office. It has associated employees. Please reassign employees first.');
            }

            // Check if office has positions
            if ($office->positions()->count() > 0) {
                return redirect()
                    ->route('offices.index')
                    ->with('error', 'Cannot delete office. It has associated positions. Please remove or reassign positions first.');
            }

            $officeId = $office->id;
            $officeName = $office->name ?? 'Unknown';
            
            // Log office deletion before deleting
            app(AuditLogService::class)->logDeleted(
                'offices',
                'Office',
                (string)$officeId,
                "Record was marked inactive and hidden from normal views.",
                null,
                $office
            );

            $office->delete();
            return redirect()
                ->route('offices.index')
                ->with('success', 'Office deleted successfully!');
        }

        return redirect()
            ->back()
            ->with('error', 'Unable to delete office. Please try again!');
    }

    /**
     * Restore a soft-deleted office
     */
    public function restore($id): RedirectResponse
    {
        abort_unless(request()->user()->can('restore-office'), 403, 'Unauthorized action.');

        $office = Department::withTrashed()->findOrFail($id);
        
        // Ensure this is an administrative department (office)
        if ($office->type !== 'administrative') {
            return redirect()->route('offices.index')->with('error', 'Invalid office record.');
        }
        
        if (!$office->trashed()) {
            return redirect()->route('offices.index')->with('error', 'Office is not deleted.');
        }

        $officeId = $office->id;
        $deletedAt = $office->deleted_at;
        
        DB::transaction(function () use ($office, $officeId) {
            // Log the restoration BEFORE restoring
            app(AuditLogService::class)->logRestored(
                'offices',
                'Office',
                (string)$officeId,
                "Record was restored and returned to active use.",
                $office
            );
            
            // Restore the office
            $office->restore();
        });

        return redirect()->route('offices.index')->with('success', 'Office has been restored successfully.');
    }

    /**
     * Permanently delete an office
     */
    public function forceDelete($id): RedirectResponse
    {
        abort_unless(request()->user()->can('force-delete-office'), 403, 'Unauthorized action.');

        $office = Department::withTrashed()->findOrFail($id);
        $office->refresh();
        
        // Ensure this is an administrative department (office)
        if ($office->type !== 'administrative') {
            return redirect()->route('offices.index')->with('error', 'Invalid office record.');
        }
        
        $officeId = $office->id;
        $officeName = $office->name ?? 'Unknown';
        
        DB::transaction(function () use ($office, $officeId, $officeName) {
            // Log permanent deletion
            app(AuditLogService::class)->logPermanentlyDeleted(
                'offices',
                'Office',
                (string)$officeId,
                "Record was permanently removed and cannot be recovered.",
                null,
                $office
            );
            
            // Permanently delete the office
            $office->forceDelete();
        });

        return redirect()->route('offices.index')->with('success', 'Office has been permanently deleted.');
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
        
        return (string) $value;
    }
}
