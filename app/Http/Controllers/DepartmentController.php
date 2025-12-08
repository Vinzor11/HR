<?php

namespace App\Http\Controllers;

use App\Http\Requests\DepartmentRequest;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\OrganizationalAuditLog;
use App\Services\PositionAutoCreationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DepartmentController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('access-department'), 403, 'Unauthorized action.');

        $perPage = $request->integer('perPage', 10);
        $search = (string) $request->input('search', '');
        $type = $request->input('type');
        $facultyId = $request->input('faculty_id');
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

        $departments = Department::query()
            ->with(['faculty' => function ($query) {
                // Only load faculty for academic departments
                $query->select('id', 'name');
            }])
            ->when($showDeleted, function ($query) {
                $query->onlyTrashed();
            })
            ->when($search, function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('faculty_name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($type, function ($query) use ($type) {
                $query->where('type', $type);
            })
            ->when($facultyId, function ($query) use ($facultyId) {
                $query->where('faculty_id', $facultyId);
            })
            ->orderBy($sortBy, $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        $faculties = Faculty::active()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('departments/index', [
            'departments' => $departments,
            'faculties' => $faculties,
            'filters' => [
                'search' => $search,
                'perPage' => $perPage,
                'type' => $type,
                'faculty_id' => $facultyId,
                'show_deleted' => $showDeleted,
            ],
        ]);
    }

    public function store(DepartmentRequest $request): RedirectResponse
    {
        abort_unless($request->user()->can('create-department'), 403, 'Unauthorized action.');

        $validated = $request->validated();
        
        // Double-check: ensure faculty_id is null for administrative departments
        if (($validated['type'] ?? null) === 'administrative') {
            $validated['faculty_id'] = null;
        }
        
        $payload = $this->buildDepartmentPayload($validated);

        $department = Department::create($payload);

        if ($department) {
            // Determine unit type based on department type
            $unitType = $department->type === 'administrative' ? 'office' : 'department';
            $unitLabel = $department->type === 'administrative' ? 'Office' : 'Department';
            
            // Log creation
            OrganizationalAuditLog::create([
                'unit_type' => $unitType,
                'unit_id' => $department->id,
                'action_type' => 'CREATE',
                'field_changed' => null,
                'old_value' => null,
                'new_value' => "Created a New {$unitLabel} Record: {$department->name}",
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);

            // Automatically create positions for academic departments under a faculty
            if ($department->type === 'academic' && $department->faculty_id) {
                try {
                    $positionService = new PositionAutoCreationService();
                    $positionService->createPositionsForDepartment($department);
                } catch (\Exception $e) {
                    // Log error but don't fail the department creation
                    \Log::warning('Failed to auto-create positions for department: ' . $e->getMessage());
                }
            }

            return redirect()
                ->route('departments.index')
                ->with('success', 'Department created successfully!');
        }

        return redirect()
            ->back()
            ->with('error', 'Unable to create department. Please try again!')
            ->withInput();
    }

    public function update(DepartmentRequest $request, Department $department): RedirectResponse
    {
        abort_unless($request->user()->can('edit-department'), 403, 'Unauthorized action.');

        if ($department) {
            // Get original values before update
            $department->refresh();
            $original = $department->getOriginal();
            
            $validated = $request->validated();
            
            // Double-check: ensure faculty_id is null for administrative departments
            if (($validated['type'] ?? null) === 'administrative') {
                $validated['faculty_id'] = null;
            }
            
            $payload = $this->buildDepartmentPayload($validated);
            $changes = [];

            DB::transaction(function () use ($department, $payload, $original, &$changes) {
                // Track changes BEFORE updating
                foreach ($payload as $key => $newValue) {
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
                
                // Update the department
                $department->update($payload);
                
                // Determine unit type based on department type
                $unitType = $department->type === 'administrative' ? 'office' : 'department';
                
                // Log each field change
                foreach ($changes as $field => $change) {
                    try {
                        OrganizationalAuditLog::create([
                            'unit_type' => $unitType,
                            'unit_id' => $department->id,
                            'action_type' => 'UPDATE',
                            'field_changed' => $field,
                            'old_value' => $change['old'],
                            'new_value' => $change['new'],
                            'action_date' => now(),
                            'performed_by' => auth()->user()?->name ?? 'System',
                        ]);
                    } catch (\Exception $e) {
                        \Log::error('Failed to create audit log: ' . $e->getMessage(), [
                            'department_id' => $department->id,
                            'field' => $field,
                        ]);
                    }
                }
            });

            return redirect()
                ->route('departments.index')
                ->with('success', 'Department updated successfully!');
        }

        return redirect()
            ->back()
            ->with('error', 'Unable to update department. Please try again!')
            ->withInput();
    }

    public function destroy(Department $department): RedirectResponse
    {
        abort_unless(request()->user()->can('delete-department'), 403, 'Unauthorized action.');

        if ($department) {
            // Refresh to ensure we have the latest data
            $department->refresh();
            
            // Check if department has employees
            if ($department->employees()->count() > 0) {
                return redirect()
                    ->route('departments.index')
                    ->with('error', 'Cannot delete department. It has associated employees. Please reassign employees first.');
            }

            $departmentId = $department->id;
            $departmentName = $department->name ?? 'Unknown';
            $unitType = $department->type === 'administrative' ? 'office' : 'department';
            $unitLabel = $department->type === 'administrative' ? 'Office' : 'Department';
            
            // Log deletion before deleting
            OrganizationalAuditLog::create([
                'unit_type' => $unitType,
                'unit_id' => $departmentId,
                'action_type' => 'DELETE',
                'field_changed' => null,
                'old_value' => null,
                'new_value' => "{$unitLabel} Record Deleted: {$departmentName}",
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);

            $department->delete();
            return redirect()
                ->route('departments.index')
                ->with('success', 'Department deleted successfully!');
        }

        return redirect()
            ->back()
            ->with('error', 'Unable to delete department. Please try again!');
    }

    private function buildDepartmentPayload(array $validated): array
    {
        $isAcademic = $validated['type'] === 'academic';

        // Ensure faculty_id is null for administrative departments or if empty
        $facultyId = null;
        if ($isAcademic && isset($validated['faculty_id'])) {
            $facultyId = $validated['faculty_id'] === '' || $validated['faculty_id'] === null 
                ? null 
                : (int) $validated['faculty_id'];
        }

        return [
            'code' => $validated['code'],
            'name' => $validated['name'],
            'type' => $validated['type'],
            'description' => $validated['description'] ?? null,
            'faculty_id' => $facultyId,
            'faculty_code' => $validated['code'],
            'faculty_name' => $validated['name'],
        ];
    }

    /**
     * Restore a soft-deleted department
     */
    public function restore($id): RedirectResponse
    {
        abort_unless(request()->user()->can('restore-department'), 403, 'Unauthorized action.');

        $department = Department::withTrashed()->findOrFail($id);
        
        if (!$department->trashed()) {
            return redirect()->route('departments.index')->with('error', 'Department is not deleted.');
        }

        $departmentId = $department->id;
        $deletedAt = $department->deleted_at;
        
        $unitType = $department->type === 'administrative' ? 'office' : 'department';
        
        DB::transaction(function () use ($department, $departmentId, $deletedAt, $unitType) {
            // Log the restoration BEFORE restoring
            OrganizationalAuditLog::create([
                'unit_type' => $unitType,
                'unit_id' => $departmentId,
                'action_type' => 'UPDATE',
                'field_changed' => 'restored',
                'old_value' => ['deleted_at' => $deletedAt ? $deletedAt->toDateTimeString() : null],
                'new_value' => ['deleted_at' => null],
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);
            
            // Restore the department
            $department->restore();
        });

        return redirect()->route('departments.index')->with('success', 'Department has been restored successfully.');
    }

    /**
     * Permanently delete a department
     */
    public function forceDelete($id): RedirectResponse
    {
        abort_unless(request()->user()->can('force-delete-department'), 403, 'Unauthorized action.');

        $department = Department::withTrashed()->findOrFail($id);
        $department->refresh();
        
        $departmentId = $department->id;
        $departmentName = $department->name ?? 'Unknown';
        $unitType = $department->type === 'administrative' ? 'office' : 'department';
        $unitLabel = $department->type === 'administrative' ? 'Office' : 'Department';
        
        DB::transaction(function () use ($department, $departmentId, $departmentName, $unitType, $unitLabel) {
            // Log permanent deletion
            OrganizationalAuditLog::create([
                'unit_type' => $unitType,
                'unit_id' => $departmentId,
                'action_type' => 'DELETE',
                'field_changed' => null,
                'old_value' => null,
                'new_value' => "{$unitLabel} Record Permanently Deleted: {$departmentName}",
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);
            
            // Permanently delete the department
            $department->forceDelete();
        });

        return redirect()->route('departments.index')->with('success', 'Department has been permanently deleted.');
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
