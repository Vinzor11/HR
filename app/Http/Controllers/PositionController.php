<?php

namespace App\Http\Controllers;

use App\Http\Requests\PositionRequest;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\OrganizationalAuditLog;
use App\Models\Position;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PositionController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->can('access-position'), 403, 'Unauthorized action.');

        $perPage = $request->integer('perPage', 10);
        $search = (string) $request->input('search', '');
        $departmentId = $request->input('department_id');
        $positionCategory = $request->input('position_category');
        $showDeleted = $request->boolean('show_deleted', false);
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'asc');

        // Validate sort_by to prevent SQL injection
        $allowedSortColumns = ['pos_name', 'pos_code', 'created_at', 'updated_at'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Validate sort_order
        $sortOrder = strtolower($sortOrder) === 'desc' ? 'desc' : 'asc';

        $positions = Position::with(['department:id,name,code', 'faculty:id,name,code'])
            ->when($showDeleted, function ($query) {
                $query->onlyTrashed();
            })
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('pos_name', 'like', "%{$search}%")
                      ->orWhere('pos_code', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhereHas('department', function ($deptQuery) use ($search) {
                          $deptQuery->where('name', 'like', "%{$search}%")
                                    ->orWhere('code', 'like', "%{$search}%");
                      })
                      ->orWhereHas('faculty', function ($facultyQuery) use ($search) {
                          $facultyQuery->where('name', 'like', "%{$search}%")
                                      ->orWhere('code', 'like', "%{$search}%");
                      });
                });
            })
            ->when($departmentId, function ($query) use ($departmentId) {
                $query->where('department_id', $departmentId);
            })
            ->when($positionCategory, function ($query) use ($positionCategory) {
                $query->where('position_category', $positionCategory);
            })
            ->orderBy($sortBy, $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        $departments = Department::orderBy('name')
            ->get(['id', 'name', 'code', 'type', 'faculty_id']);

        $faculties = Faculty::orderBy('name')
            ->get(['id', 'name', 'code']);

        return Inertia::render('positions/index', [
            'positions' => $positions,
            'departments' => $departments,
            'faculties' => $faculties,
            'filters' => [
                'search' => $search,
                'perPage' => $perPage,
                'department_id' => $departmentId,
                'position_category' => $positionCategory,
                'show_deleted' => $showDeleted,
            ],
        ]);
    }

    public function store(PositionRequest $request)
    {
        abort_unless($request->user()->can('create-position'), 403, 'Unauthorized action.');

        $position = Position::create([
            'pos_code' => $request->pos_code,
            'pos_name' => $request->pos_name,
            'faculty_id' => $request->faculty_id,
            'department_id' => $request->department_id,
            'position_category' => $request->position_category,
            'hierarchy_level' => $request->hierarchy_level,
            'capacity' => $request->capacity,
            'description' => $request->description,
            'creation_type' => 'manual',
        ]);

        if ($position) {
            // Log position creation
            OrganizationalAuditLog::create([
                'unit_type' => 'position',
                'unit_id' => $position->id,
                'action_type' => 'CREATE',
                'field_changed' => null,
                'old_value' => null,
                'new_value' => "Created a New Position Record: {$position->pos_name}",
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);

            return redirect()
                ->route('positions.index')
                ->with('success', 'Position created successfully!');
        }

        return redirect()
            ->back()
            ->with('error', 'Unable to create position. Please try again!')
            ->withInput();
    }

    public function update(PositionRequest $request, Position $position)
    {
        abort_unless($request->user()->can('edit-position'), 403, 'Unauthorized action.');

        if ($position) {
            // Get original values before update
            $position->refresh();
            $original = $position->getOriginal();
            $validated = [
                'pos_code' => $request->pos_code,
                'pos_name' => $request->pos_name,
                'faculty_id' => $request->faculty_id,
                'department_id' => $request->department_id,
                'position_category' => $request->position_category,
                'hierarchy_level' => $request->hierarchy_level,
                'capacity' => $request->capacity,
                'description' => $request->description,
            ];
            $changes = [];

            DB::transaction(function () use ($position, $validated, $original, &$changes) {
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
                
                // Update the position
                $position->update($validated);
                
                // Log each field change
                foreach ($changes as $field => $change) {
                    try {
                        OrganizationalAuditLog::create([
                            'unit_type' => 'position',
                            'unit_id' => $position->id,
                            'action_type' => 'UPDATE',
                            'field_changed' => $field,
                            'old_value' => $change['old'],
                            'new_value' => $change['new'],
                            'action_date' => now(),
                            'performed_by' => auth()->user()?->name ?? 'System',
                        ]);
                    } catch (\Exception $e) {
                        \Log::error('Failed to create audit log: ' . $e->getMessage(), [
                            'position_id' => $position->id,
                            'field' => $field,
                        ]);
                    }
                }
            });

            return redirect()
                ->route('positions.index')
                ->with('success', 'Position updated successfully!');
        }

        return redirect()
            ->back()
            ->with('error', 'Unable to update position. Please try again!')
            ->withInput();
    }

    public function destroy(Position $position)
    {
        abort_unless(request()->user()->can('delete-position'), 403, 'Unauthorized action.');

        if ($position) {
            // Refresh to ensure we have the latest data
            $position->refresh();
            
            // Check if position has employees
            if ($position->employees()->count() > 0) {
                return redirect()
                    ->route('positions.index')
                    ->with('error', 'Cannot delete position. It has associated employees. Please reassign employees first.');
            }

            $positionId = $position->id;
            $positionName = $position->pos_name ?? 'Unknown';
            
            // Log position deletion before deleting
            OrganizationalAuditLog::create([
                'unit_type' => 'position',
                'unit_id' => $positionId,
                'action_type' => 'DELETE',
                'field_changed' => null,
                'old_value' => null,
                'new_value' => "Position Record Deleted: {$positionName}",
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);

            $position->delete();
            return redirect()
                ->route('positions.index')
                ->with('success', 'Position deleted successfully!');
        }

        return redirect()
            ->back()
            ->with('error', 'Unable to delete position. Please try again!');
    }

    /**
     * Restore a soft-deleted position
     */
    public function restore($id)
    {
        abort_unless(request()->user()->can('restore-position'), 403, 'Unauthorized action.');

        $position = Position::withTrashed()->findOrFail($id);
        
        if (!$position->trashed()) {
            return redirect()->route('positions.index')->with('error', 'Position is not deleted.');
        }

        $positionId = $position->id;
        $deletedAt = $position->deleted_at;
        
        DB::transaction(function () use ($position, $positionId, $deletedAt) {
            // Log the restoration BEFORE restoring
            OrganizationalAuditLog::create([
                'unit_type' => 'position',
                'unit_id' => $positionId,
                'action_type' => 'UPDATE',
                'field_changed' => 'restored',
                'old_value' => ['deleted_at' => $deletedAt ? $deletedAt->toDateTimeString() : null],
                'new_value' => ['deleted_at' => null],
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);
            
            // Restore the position
            $position->restore();
        });

        return redirect()->route('positions.index')->with('success', 'Position has been restored successfully.');
    }

    /**
     * Permanently delete a position
     */
    public function forceDelete($id)
    {
        abort_unless(request()->user()->can('force-delete-position'), 403, 'Unauthorized action.');

        $position = Position::withTrashed()->findOrFail($id);
        $position->refresh();
        
        $positionId = $position->id;
        $positionName = $position->pos_name ?? 'Unknown';
        
        DB::transaction(function () use ($position, $positionId, $positionName) {
            // Log permanent deletion
            OrganizationalAuditLog::create([
                'unit_type' => 'position',
                'unit_id' => $positionId,
                'action_type' => 'DELETE',
                'field_changed' => null,
                'old_value' => null,
                'new_value' => "Position Record Permanently Deleted: {$positionName}",
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);
            
            // Permanently delete the position
            $position->forceDelete();
        });

        return redirect()->route('positions.index')->with('success', 'Position has been permanently deleted.');
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
