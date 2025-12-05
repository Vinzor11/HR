<?php

namespace App\Http\Controllers;

use App\Http\Requests\FacultyRequest;
use App\Models\Faculty;
use App\Models\OrganizationalAuditLog;
use App\Services\PositionAutoCreationService;
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
            ->when($search, function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
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
            OrganizationalAuditLog::create([
                'unit_type' => 'faculty',
                'unit_id' => $faculty->id,
                'action_type' => 'CREATE',
                'field_changed' => null,
                'old_value' => null,
                'new_value' => 'Created a New Faculty Record',
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);

            // Automatically create faculty-level positions (Dean, Associate Dean)
            try {
                $positionService = new PositionAutoCreationService();
                $positionService->createPositionsForFaculty($faculty);
            } catch (\Exception $e) {
                // Log error with full details for debugging
                \Log::error('Failed to auto-create positions for faculty', [
                    'faculty_id' => $faculty->id,
                    'faculty_name' => $faculty->name,
                    'faculty_code' => $faculty->code,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                // Don't fail the faculty creation, but log the error
            }

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
                
                // Log each field change
                foreach ($changes as $field => $change) {
                    try {
                        OrganizationalAuditLog::create([
                            'unit_type' => 'faculty',
                            'unit_id' => $faculty->id,
                            'action_type' => 'UPDATE',
                            'field_changed' => $field,
                            'old_value' => $change['old'],
                            'new_value' => $change['new'],
                            'action_date' => now(),
                            'performed_by' => auth()->user()?->name ?? 'System',
                        ]);
                    } catch (\Exception $e) {
                        \Log::error('Failed to create audit log: ' . $e->getMessage(), [
                            'faculty_id' => $faculty->id,
                            'field' => $field,
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
            // Check if faculty has departments
            if ($faculty->departments()->count() > 0) {
                return redirect()
                    ->route('faculties.index')
                    ->with('error', 'Cannot delete faculty. It has associated departments. Please remove or reassign departments first.');
            }

            $facultyId = $faculty->id;
            
            // Log faculty deletion before deleting
            OrganizationalAuditLog::create([
                'unit_type' => 'faculty',
                'unit_id' => $facultyId,
                'action_type' => 'DELETE',
                'field_changed' => null,
                'old_value' => null,
                'new_value' => 'Faculty Record Deleted',
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);

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
        $deletedAt = $faculty->deleted_at;
        
        DB::transaction(function () use ($faculty, $facultyId, $deletedAt) {
            // Log the restoration BEFORE restoring
            OrganizationalAuditLog::create([
                'unit_type' => 'faculty',
                'unit_id' => $facultyId,
                'action_type' => 'UPDATE',
                'field_changed' => 'restored',
                'old_value' => ['deleted_at' => $deletedAt ? $deletedAt->toDateTimeString() : null],
                'new_value' => ['deleted_at' => null],
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);
            
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
        
        $facultyId = $faculty->id;
        
        DB::transaction(function () use ($faculty, $facultyId) {
            // Log permanent deletion
            OrganizationalAuditLog::create([
                'unit_type' => 'faculty',
                'unit_id' => $facultyId,
                'action_type' => 'DELETE',
                'field_changed' => null,
                'old_value' => null,
                'new_value' => 'Faculty Record Permanently Deleted',
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);
            
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

