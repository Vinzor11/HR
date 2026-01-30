<?php

namespace App\Http\Controllers;

use App\Models\UnitPosition;
use App\Models\Position;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UnitPositionController extends Controller
{
    /**
     * Display the unit-position whitelist management page
     */
    public function index(Request $request)
    {
        abort_unless($request->user()->can('access-unit-position'), 403, 'Unauthorized action.');
        $query = UnitPosition::with(['position.sector']);

        // Filter by unit type
        if ($unitType = $request->get('unit_type')) {
            $query->where('unit_type', $unitType);
        }

        // Search
        if ($search = $request->get('search')) {
            $query->whereHas('position', function ($q) use ($search) {
                $q->where('pos_name', 'like', "%{$search}%")
                  ->orWhere('pos_code', 'like', "%{$search}%");
            });
        }

        // Show deleted
        if ($request->boolean('show_deleted')) {
            $query->onlyTrashed();
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'unit_type');
        $sortOrder = $request->get('sort_order', 'asc');
        
        if ($sortBy === 'position_name') {
            $query->join('positions', 'unit_positions.position_id', '=', 'positions.id')
                  ->orderBy('positions.pos_name', $sortOrder)
                  ->select('unit_positions.*');
        } else {
            $query->orderBy($sortBy, $sortOrder);
        }

        // Pagination
        $perPage = $request->get('perPage', 25);
        $unitPositions = $query->paginate($perPage)->withQueryString();

        // Get all positions for dropdown
        $positions = Position::with('sector')
            ->orderBy('pos_name')
            ->get(['id', 'pos_code', 'pos_name', 'sector_id', 'authority_level']);

        return Inertia::render('unit-positions/index', [
            'unitPositions' => $unitPositions,
            'positions' => $positions,
            'filters' => $request->only(['search', 'perPage', 'unit_type', 'show_deleted', 'sort_by', 'sort_order']),
        ]);
    }

    /**
     * Store a new unit-position whitelist entry
     */
    public function store(Request $request)
    {
        abort_unless($request->user()->can('create-unit-position'), 403, 'Unauthorized action.');
        $validated = $request->validate([
            'unit_type' => 'required|in:college,program,office',
            'position_id' => 'required|exists:positions,id',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ]);

        // Check for duplicate
        $exists = UnitPosition::where('unit_type', $validated['unit_type'])
            ->where('position_id', $validated['position_id'])
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'position_id' => 'This position is already whitelisted for this unit type.'
            ]);
        }

        $unitPosition = UnitPosition::create($validated);
        
        // Get position details for better logging
        $position = Position::find($validated['position_id']);
        $positionName = $position ? $position->pos_name : "Position #{$validated['position_id']}";
        $unitType = ucfirst($validated['unit_type']);

        app(AuditLogService::class)->logCreated(
            'unit-positions',
            'UnitPosition',
            (string)$unitPosition->id,
            "Added '{$positionName}' to {$unitType} whitelist",
            null,
            $unitPosition
        );

        return redirect()->route('unit-positions.index')->with('success', 'Position added to whitelist successfully!');
    }

    /**
     * Update a unit-position whitelist entry
     */
    public function update(Request $request, UnitPosition $unitPosition)
    {
        abort_unless($request->user()->can('edit-unit-position'), 403, 'Unauthorized action.');
        $validated = $request->validate([
            'unit_type' => 'required|in:college,program,office',
            'position_id' => 'required|exists:positions,id',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ]);

        // Check for duplicate (excluding current)
        $exists = UnitPosition::where('unit_type', $validated['unit_type'])
            ->where('position_id', $validated['position_id'])
            ->where('id', '!=', $unitPosition->id)
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'position_id' => 'This position is already whitelisted for this unit type.'
            ]);
        }

        // Refresh to ensure we have the latest data
        $unitPosition->refresh();
        $original = $unitPosition->getOriginal();
        
        // Track changes BEFORE updating
        $changes = [];
        foreach ($validated as $key => $newValue) {
            $oldValue = $original[$key] ?? null;
            
            // Normalize values for comparison
            $normalizedOld = $this->normalizeValue($oldValue);
            $normalizedNew = $this->normalizeValue($newValue);
            
            if ($normalizedOld != $normalizedNew) {
                $changes[$key] = [
                    'old' => $oldValue,
                    'new' => $newValue,
                ];
            }
        }
        
        // Update the entry
        $unitPosition->update($validated);
        
        // Log changes if any
        if (!empty($changes)) {
            $oldValues = [];
            $newValues = [];
            $changeDescriptions = [];
            
            foreach ($changes as $field => $change) {
                $fieldName = str_replace('_', ' ', $field);
                $fieldName = ucwords($fieldName);
                
                // Handle foreign key references
                if ($field === 'position_id') {
                    $oldPosition = $change['old'] ? Position::find($change['old']) : null;
                    $newPosition = $change['new'] ? Position::find($change['new']) : null;
                    $oldValueFormatted = $oldPosition ? $oldPosition->pos_name : '(none)';
                    $newValueFormatted = $newPosition ? $newPosition->pos_name : '(none)';
                    $fieldName = 'Position';
                } elseif ($field === 'unit_type') {
                    $oldValueFormatted = ucfirst($change['old'] ?? '(none)');
                    $newValueFormatted = ucfirst($change['new'] ?? '(none)');
                    $fieldName = 'Unit Type';
                } else {
                    $oldValueFormatted = $this->formatValueForDisplay($change['old']);
                    $newValueFormatted = $this->formatValueForDisplay($change['new']);
                }
                
                $oldValues[$field] = $change['old'];
                $newValues[$field] = $change['new'];
                $changeDescriptions[] = "{$fieldName}: {$oldValueFormatted} > {$newValueFormatted}";
            }
            
            $description = implode('; ', $changeDescriptions);
            $description .= " (Whitelist ID: {$unitPosition->id})";
            
            app(AuditLogService::class)->logUpdated(
                'unit-positions',
                'UnitPosition',
                (string)$unitPosition->id,
                $description,
                $oldValues,
                $newValues,
                $unitPosition
            );
        }

        return redirect()->route('unit-positions.index')->with('success', 'Whitelist entry updated successfully!');
    }

    /**
     * Delete a unit-position whitelist entry
     */
    public function destroy(Request $request, UnitPosition $unitPosition)
    {
        abort_unless($request->user()->can('delete-unit-position'), 403, 'Unauthorized action.');
        
        // Get position details for better logging
        $position = Position::find($unitPosition->position_id);
        $positionName = $position ? $position->pos_name : "Position #{$unitPosition->position_id}";
        $unitType = ucfirst($unitPosition->unit_type);
        
        app(AuditLogService::class)->logDeleted(
            'unit-positions',
            'UnitPosition',
            (string)$unitPosition->id,
            "Record was marked inactive and hidden from normal views. ('{$positionName}' from {$unitType} whitelist)",
            null,
            $unitPosition
        );

        $unitPosition->delete();

        return redirect()->route('unit-positions.index')->with('success', 'Whitelist entry removed successfully!');
    }

    /**
     * Restore a soft-deleted entry
     */
    public function restore(Request $request, $id)
    {
        abort_unless($request->user()->can('restore-unit-position'), 403, 'Unauthorized action.');
        $unitPosition = UnitPosition::withTrashed()->findOrFail($id);
        
        if (!$unitPosition->trashed()) {
            return redirect()->route('unit-positions.index')->with('error', 'Entry is not deleted.');
        }
        
        // Get position details for better logging
        $position = Position::find($unitPosition->position_id);
        $positionName = $position ? $position->pos_name : "Position #{$unitPosition->position_id}";
        $unitType = ucfirst($unitPosition->unit_type);
        
        app(AuditLogService::class)->logRestored(
            'unit-positions',
            'UnitPosition',
            (string)$unitPosition->id,
            "Record was restored and returned to active use. ('{$positionName}' for {$unitType} whitelist)",
            $unitPosition
        );

        $unitPosition->restore();

        return redirect()->route('unit-positions.index')->with('success', 'Whitelist entry restored successfully!');
    }

    /**
     * Permanently delete an entry
     */
    public function forceDelete(Request $request, $id)
    {
        abort_unless($request->user()->can('force-delete-unit-position'), 403, 'Unauthorized action.');

        app(\App\Services\TwoFactorVerificationService::class)->validateForSensitiveAction($request);

        $unitPosition = UnitPosition::withTrashed()->findOrFail($id);
        
        if (!$unitPosition->trashed()) {
            return redirect()->route('unit-positions.index')->with('error', 'Entry must be deleted first.');
        }
        
        // Get position details for better logging
        $position = Position::find($unitPosition->position_id);
        $positionName = $position ? $position->pos_name : "Position #{$unitPosition->position_id}";
        $unitType = ucfirst($unitPosition->unit_type);
        
        app(AuditLogService::class)->logPermanentlyDeleted(
            'unit-positions',
            'UnitPosition',
            (string)$unitPosition->id,
            "Record was permanently removed and cannot be recovered. ('{$positionName}' from {$unitType} whitelist)",
            null,
            $unitPosition
        );

        $unitPosition->forceDelete();

        return redirect()->route('unit-positions.index')->with('success', 'Whitelist entry permanently deleted!');
    }

    /**
     * Bulk add positions to a unit type
     */
    public function bulkStore(Request $request)
    {
        abort_unless($request->user()->can('create-unit-position'), 403, 'Unauthorized action.');
        $validated = $request->validate([
            'unit_type' => 'required|in:college,program,office',
            'position_ids' => 'required|array',
            'position_ids.*' => 'exists:positions,id',
        ]);

        $created = 0;
        $unitType = ucfirst($validated['unit_type']);
        $createdPositions = [];
        
        foreach ($validated['position_ids'] as $positionId) {
            $exists = UnitPosition::where('unit_type', $validated['unit_type'])
                ->where('position_id', $positionId)
                ->exists();

            if (!$exists) {
                $unitPosition = UnitPosition::create([
                    'unit_type' => $validated['unit_type'],
                    'position_id' => $positionId,
                    'is_active' => true,
                ]);
                
                $position = Position::find($positionId);
                $createdPositions[] = $position ? $position->pos_name : "Position #{$positionId}";
                $created++;
            }
        }
        
        // Log bulk creation if any were created
        if ($created > 0) {
            app(AuditLogService::class)->logCreated(
                'unit-positions',
                'UnitPosition',
                null,
                "Bulk added {$created} position(s) to {$unitType} whitelist: " . implode(', ', $createdPositions),
                ['unit_type' => $validated['unit_type'], 'positions' => $createdPositions],
                null
            );
        }

        return redirect()->route('unit-positions.index')
            ->with('success', "Added {$created} position(s) to {$validated['unit_type']} whitelist!");
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
    
    /**
     * Format value for display in audit log description
     */
    protected function formatValueForDisplay($value): string
    {
        if ($value === null || $value === '') {
            return '(empty)';
        }
        
        if (is_bool($value)) {
            return $value ? 'Yes' : 'No';
        }
        
        if (is_array($value)) {
            return implode(', ', $value);
        }
        
        return (string) $value;
    }
}
