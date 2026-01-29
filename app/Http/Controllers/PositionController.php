<?php

namespace App\Http\Controllers;

use App\Http\Requests\PositionRequest;
// Legacy Department and Faculty models removed - use new org structure (Sector/Unit) instead
use App\Models\Sector;
use App\Services\AuditLogService;
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
        $searchMode = $request->input('search_mode', 'any');
        $showDeleted = $request->boolean('show_deleted', false);
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'asc');

        // Validate sort_by to prevent SQL injection
        $allowedSortColumns = ['pos_name', 'pos_code', 'created_at', 'updated_at', 'authority_level'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Validate sort_order
        $sortOrder = strtolower($sortOrder) === 'desc' ? 'desc' : 'asc';

        $sectorId = $request->input('sector_id');

        $positions = Position::with(['sector:id,name,code'])
            ->when($showDeleted, function ($query) {
                $query->onlyTrashed();
            })
            ->when($search, function ($query) use ($search, $searchMode) {
                $query->where(function ($q) use ($search, $searchMode) {
                    switch ($searchMode) {
                        case 'pos_name':
                            $q->where('pos_name', 'like', "%{$search}%");
                            break;
                        case 'code':
                            $q->where('pos_code', 'like', "%{$search}%");
                            break;
                        case 'description':
                            $q->where('description', 'like', "%{$search}%");
                            break;
                        case 'sector':
                            $q->whereHas('sector', function ($sectorQuery) use ($search) {
                                $sectorQuery->where('name', 'like', "%{$search}%")
                                    ->orWhere('code', 'like', "%{$search}%");
                            });
                            break;
                        default:
                            $q->where('pos_name', 'like', "%{$search}%")
                              ->orWhere('pos_code', 'like', "%{$search}%")
                              ->orWhere('description', 'like', "%{$search}%")
                              ->orWhereHas('sector', function ($sectorQuery) use ($search) {
                                  $sectorQuery->where('name', 'like', "%{$search}%")
                                        ->orWhere('code', 'like', "%{$search}%");
                              });
                    }
                });
            })
            ->when($sectorId, function ($query) use ($sectorId) {
                $query->where('sector_id', $sectorId);
            })
            ->orderBy($sortBy, $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        $sectors = Sector::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return Inertia::render('positions/index', [
            'positions' => $positions,
            'sectors' => $sectors,
            'filters' => [
                'search' => $search,
                'search_mode' => $searchMode,
                'perPage' => $perPage,
                'sector_id' => $sectorId,
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
            'description' => $request->description,
            'creation_type' => 'manual',
            'sector_id' => $request->sector_id,
            'authority_level' => $request->authority_level ?? 1,
        ]);

        if ($position) {
            // Log position creation
            app(AuditLogService::class)->logCreated(
                'positions',
                'Position',
                (string)$position->id,
                "Created a New Position: {$position->pos_name}",
                null,
                $position
            );

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
                'description' => $request->description,
                'sector_id' => $request->sector_id,
                'authority_level' => $request->authority_level ?? 1,
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
                        $positionCode = $position->pos_code ?? '';
                        $positionId = (string)$position->id;
                        $descriptionWithCode = $description . ($positionCode ? " (ID: {$positionId}, {$positionCode})" : " (ID: {$positionId})");
                        app(AuditLogService::class)->logUpdated(
                            'positions',
                            'Position',
                            $positionId,
                            $descriptionWithCode,
                            $oldValues,
                            $newValues,
                            $position
                        );
                    } catch (\Exception $e) {
                        \Log::error('Failed to create audit log: ' . $e->getMessage(), [
                            'position_id' => $position->id,
                            'error' => $e->getTraceAsString()
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
            $positionCode = $position->pos_code ?? '';
            
            // Log position deletion before deleting
            app(AuditLogService::class)->logDeleted(
                'positions',
                'Position',
                (string)$positionId,
                "Record was marked inactive and hidden from normal views." . ($positionCode ? " (ID: {$positionId}, {$positionCode})" : " (ID: {$positionId})"),
                null,
                $position
            );

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
        $positionCode = $position->pos_code ?? '';
        $deletedAt = $position->deleted_at;
        
        DB::transaction(function () use ($position, $positionId, $positionCode) {
            // Log the restoration BEFORE restoring
            app(AuditLogService::class)->logRestored(
                'positions',
                'Position',
                (string)$positionId,
                "Record was restored and returned to active use." . ($positionCode ? " (ID: {$positionId}, {$positionCode})" : " (ID: {$positionId})"),
                $position
            );
            
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
        $positionCode = $position->pos_code ?? '';
        
        DB::transaction(function () use ($position, $positionId, $positionName, $positionCode) {
            // Log permanent deletion
            app(AuditLogService::class)->logPermanentlyDeleted(
                'positions',
                'Position',
                (string)$positionId,
                "Record was permanently removed and cannot be recovered." . ($positionCode ? " (ID: {$positionId}, {$positionCode})" : " (ID: {$positionId})"),
                null,
                $position
            );
            
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
