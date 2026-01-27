<?php

namespace App\Http\Controllers;

use App\Http\Requests\FacultyRequest;
use App\Models\Faculty;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class FacultyController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('access-faculty'), 403, 'Unauthorized action.');

        $perPage = $request->integer('perPage', 10);
        $search = (string) $request->input('search', '');
        $searchMode = $request->input('search_mode', 'any');
        $status = $request->input('status');
        $showDeleted = $request->boolean('show_deleted', false);
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');

        // Validate sort_by to prevent SQL injection
        $allowedSortColumns = ['name', 'code', 'created_at', 'updated_at'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'name';
        }

        // Validate sort_order
        $sortOrder = strtolower($sortOrder) === 'desc' ? 'desc' : 'asc';

        $faculties = Faculty::query()
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
                        case 'description':
                            $innerQuery->where('description', 'like', "%{$search}%");
                            break;
                        default:
                            $innerQuery
                                ->where('name', 'like', "%{$search}%")
                                ->orWhere('code', 'like', "%{$search}%")
                                ->orWhere('description', 'like', "%{$search}%");
                    }
                });
            })
            ->when(in_array($status, ['active', 'inactive']), function ($query) use ($status) {
                $query->where('status', $status);
            })
            ->orderBy($sortBy, $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('faculties/index', [
            'faculties' => $faculties,
            'filters' => [
                'search' => $search,
                'search_mode' => $searchMode,
                'perPage' => $perPage,
                'status' => $status,
                'show_deleted' => $showDeleted,
            ],
        ]);
    }

    public function store(FacultyRequest $request): RedirectResponse
    {
        abort_unless($request->user()->can('create-faculty'), 403, 'Unauthorized action.');

        $faculty = Faculty::create(array_merge($request->validated(), [
            'type' => 'academic',
        ]));

        if ($faculty) {
            // Log faculty creation
            app(AuditLogService::class)->logCreated(
                'faculties',
                'Faculty',
                (string)$faculty->id,
                "Created a New Faculty: {$faculty->name}",
                null,
                $faculty
            );

            return redirect()
                ->route('faculties.index')
                ->with('success', 'Faculty created successfully!');
        }

        return redirect()
            ->back()
            ->with('error', 'Unable to create faculty. Please try again!')
            ->withInput();
    }

    public function update(FacultyRequest $request, Faculty $faculty): RedirectResponse
    {
        abort_unless($request->user()->can('edit-faculty'), 403, 'Unauthorized action.');

        if ($faculty) {
            // Get original values before update
            $faculty->refresh();
            $original = $faculty->getOriginal();
            $validated = $request->validated();
            $changes = [];

            DB::transaction(function () use ($faculty, $validated, $original, &$changes) {
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
                
                // Update the faculty
                $faculty->update($validated);
                
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
                        $facultyCode = $faculty->code ?? '';
                        $facultyId = (string)$faculty->id;
                        $descriptionWithCode = $description . ($facultyCode ? " (ID: {$facultyId}, {$facultyCode})" : " (ID: {$facultyId})");
                        app(AuditLogService::class)->logUpdated(
                            'faculties',
                            'Faculty',
                            $facultyId,
                            $descriptionWithCode,
                            $oldValues,
                            $newValues,
                            $faculty
                        );
                    } catch (\Exception $e) {
                        \Log::error('Failed to create audit log: ' . $e->getMessage(), [
                            'faculty_id' => $faculty->id,
                            'error' => $e->getTraceAsString()
                        ]);
                    }
                }
            });

            return redirect()
                ->route('faculties.index')
                ->with('success', 'Faculty updated successfully!');
        }

        return redirect()
            ->back()
            ->with('error', 'Unable to update faculty. Please try again!')
            ->withInput();
    }

    public function destroy(Faculty $faculty): RedirectResponse
    {
        abort_unless(request()->user()->can('delete-faculty'), 403, 'Unauthorized action.');

        if ($faculty) {
            // Refresh to ensure we have the latest data
            $faculty->refresh();
            
            // Check if faculty has departments
            if ($faculty->departments()->count() > 0) {
                return redirect()
                    ->route('faculties.index')
                    ->with('error', 'Cannot delete faculty. It has associated departments. Please remove or reassign departments first.');
            }

            $facultyId = $faculty->id;
            $facultyName = $faculty->name ?? 'Unknown';
            $facultyCode = $faculty->code ?? '';
            
            // Log faculty deletion before deleting
            app(AuditLogService::class)->logDeleted(
                'faculties',
                'Faculty',
                (string)$facultyId,
                "Record was marked inactive and hidden from normal views." . ($facultyCode ? " (ID: {$facultyId}, {$facultyCode})" : " (ID: {$facultyId})"),
                null,
                $faculty
            );

            $faculty->delete();
            return redirect()
                ->route('faculties.index')
                ->with('success', 'Faculty deleted successfully!');
        }

        return redirect()
            ->back()
            ->with('error', 'Unable to delete faculty. Please try again!');
    }

    /**
     * Restore a soft-deleted faculty
     */
    public function restore($id): RedirectResponse
    {
        abort_unless(request()->user()->can('restore-faculty'), 403, 'Unauthorized action.');

        $faculty = Faculty::withTrashed()->findOrFail($id);
        
        if (!$faculty->trashed()) {
            return redirect()->route('faculties.index')->with('error', 'Faculty is not deleted.');
        }

        $facultyId = $faculty->id;
        $facultyCode = $faculty->code ?? '';
        $deletedAt = $faculty->deleted_at;
        
        DB::transaction(function () use ($faculty, $facultyId, $facultyCode) {
            // Log the restoration BEFORE restoring
            app(AuditLogService::class)->logRestored(
                'faculties',
                'Faculty',
                (string)$facultyId,
                "Record was restored and returned to active use." . ($facultyCode ? " (ID: {$facultyId}, {$facultyCode})" : " (ID: {$facultyId})"),
                $faculty
            );
            
            // Restore the faculty
            $faculty->restore();
        });

        return redirect()->route('faculties.index')->with('success', 'Faculty has been restored successfully.');
    }

    /**
     * Permanently delete a faculty
     */
    public function forceDelete($id): RedirectResponse
    {
        abort_unless(request()->user()->can('force-delete-faculty'), 403, 'Unauthorized action.');

        $faculty = Faculty::withTrashed()->findOrFail($id);
        $faculty->refresh();
        
        $facultyId = $faculty->id;
        $facultyName = $faculty->name ?? 'Unknown';
        $facultyCode = $faculty->code ?? '';
        
        DB::transaction(function () use ($faculty, $facultyId, $facultyName, $facultyCode) {
            // Log permanent deletion
            app(AuditLogService::class)->logPermanentlyDeleted(
                'faculties',
                'Faculty',
                (string)$facultyId,
                "Record was permanently removed and cannot be recovered." . ($facultyCode ? " (ID: {$facultyId}, {$facultyCode})" : " (ID: {$facultyId})"),
                null,
                $faculty
            );
            
            // Permanently delete the faculty
            $faculty->forceDelete();
        });

        return redirect()->route('faculties.index')->with('success', 'Faculty has been permanently deleted.');
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

