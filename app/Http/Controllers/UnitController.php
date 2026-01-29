<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use App\Models\Sector;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\AuditLogService;

class UnitController extends Controller
{
    public function index(Request $request)
    {
        $query = Unit::with(['sector', 'parentUnit']);

        // Search
        if ($search = $request->get('search')) {
            $searchMode = $request->get('search_mode', 'any');
            
            if ($searchMode === 'name') {
                $query->where('name', 'like', "%{$search}%");
            } elseif ($searchMode === 'code') {
                $query->where('code', 'like', "%{$search}%");
            } else {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }
        }

        // Filter by unit_type
        if ($unitType = $request->get('unit_type')) {
            $query->where('unit_type', $unitType);
        }

        // Filter by sector
        if ($sectorId = $request->get('sector_id')) {
            $query->where('sector_id', $sectorId);
        }

        // Filter by parent unit
        if ($parentId = $request->get('parent_unit_id')) {
            $query->where('parent_unit_id', $parentId);
        }

        // Show deleted
        if ($request->boolean('show_deleted')) {
            $query->onlyTrashed();
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'name');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('perPage', 10);
        $units = $query->paginate($perPage)->withQueryString();

        // Get sectors for filter dropdown
        $sectors = Sector::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);

        // Get parent units (colleges) for dropdown
        $parentUnits = Unit::where('unit_type', 'college')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return Inertia::render('units/index', [
            'units' => $units,
            'sectors' => $sectors,
            'parentUnits' => $parentUnits,
            'filters' => $request->only(['search', 'search_mode', 'perPage', 'unit_type', 'sector_id', 'parent_unit_id', 'show_deleted', 'sort_by', 'sort_order']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sector_id' => 'required|exists:sectors,id',
            'unit_type' => 'required|in:college,program,office',
            'name' => 'required|string|max:150',
            'code' => 'nullable|string|max:50|unique:units,code',
            'parent_unit_id' => 'nullable|exists:units,id',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        // Validation: programs must have parent_unit_id
        if ($validated['unit_type'] === 'program' && empty($validated['parent_unit_id'])) {
            return back()->withErrors(['parent_unit_id' => 'Programs must have a parent college.']);
        }

        // Validation: colleges must not have parent_unit_id
        if ($validated['unit_type'] === 'college' && !empty($validated['parent_unit_id'])) {
            $validated['parent_unit_id'] = null;
        }

        $unit = Unit::create($validated);

        $unitType = ucfirst($validated['unit_type']);
        app(AuditLogService::class)->logCreated(
            'units',
            'Unit',
            (string)$unit->id,
            "Created a New {$unitType}: {$unit->name}" . ($unit->code ? " ({$unit->code})" : ''),
            null,
            $unit
        );

        return redirect()->route('units.index')->with('success', 'Unit created successfully!');
    }

    public function update(Request $request, Unit $unit)
    {
        $validated = $request->validate([
            'sector_id' => 'required|exists:sectors,id',
            'unit_type' => 'required|in:college,program,office',
            'name' => 'required|string|max:150',
            'code' => 'nullable|string|max:50|unique:units,code,' . $unit->id,
            'parent_unit_id' => 'nullable|exists:units,id',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        // Validation: programs must have parent_unit_id
        if ($validated['unit_type'] === 'program' && empty($validated['parent_unit_id'])) {
            return back()->withErrors(['parent_unit_id' => 'Programs must have a parent college.']);
        }

        // Validation: colleges must not have parent_unit_id
        if ($validated['unit_type'] === 'college' && !empty($validated['parent_unit_id'])) {
            $validated['parent_unit_id'] = null;
        }

        // Refresh to ensure we have the latest data
        $unit->refresh();
        $original = $unit->getOriginal();
        
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
        
        // Update the unit
        $unit->update($validated);
        
        // Log changes if any
        if (!empty($changes)) {
            $oldValues = [];
            $newValues = [];
            $changeDescriptions = [];
            
            foreach ($changes as $field => $change) {
                $fieldName = str_replace('_', ' ', $field);
                $fieldName = ucwords($fieldName);
                
                // Handle foreign key references
                if ($field === 'sector_id') {
                    $oldSector = $change['old'] ? Sector::find($change['old']) : null;
                    $newSector = $change['new'] ? Sector::find($change['new']) : null;
                    $oldValueFormatted = $oldSector ? $oldSector->name : '(none)';
                    $newValueFormatted = $newSector ? $newSector->name : '(none)';
                    $fieldName = 'Sector';
                } elseif ($field === 'parent_unit_id') {
                    $oldParent = $change['old'] ? Unit::find($change['old']) : null;
                    $newParent = $change['new'] ? Unit::find($change['new']) : null;
                    $oldValueFormatted = $oldParent ? $oldParent->name : '(none)';
                    $newValueFormatted = $newParent ? $newParent->name : '(none)';
                    $fieldName = 'Parent Unit';
                } else {
                    $oldValueFormatted = $this->formatValueForDisplay($change['old']);
                    $newValueFormatted = $this->formatValueForDisplay($change['new']);
                }
                
                $oldValues[$field] = $change['old'];
                $newValues[$field] = $change['new'];
                $changeDescriptions[] = "{$fieldName}: {$oldValueFormatted} > {$newValueFormatted}";
            }
            
            $description = implode('; ', $changeDescriptions);
            $unitCode = $unit->code ?? '';
            $unitType = ucfirst($unit->unit_type);
            $description .= " ({$unitType} ID: {$unit->id}" . ($unitCode ? ", {$unitCode}" : '') . ")";
            
            app(AuditLogService::class)->logUpdated(
                'units',
                'Unit',
                (string)$unit->id,
                $description,
                $oldValues,
                $newValues,
                $unit
            );
        }

        return redirect()->route('units.index')->with('success', 'Unit updated successfully!');
    }

    public function destroy(Unit $unit)
    {
        // Check if unit has child units
        if ($unit->childUnits()->count() > 0) {
            return back()->with('error', 'Cannot delete unit with child units. Please remove child units first.');
        }

        $unitId = $unit->id;
        $unitName = $unit->name;
        $unitCode = $unit->code ?? '';
        $unitType = ucfirst($unit->unit_type);
        
        app(AuditLogService::class)->logDeleted(
            'units',
            'Unit',
            (string)$unitId,
            "Record was marked inactive and hidden from normal views. ({$unitType}: {$unitName}" . ($unitCode ? ", {$unitCode}" : '') . ")",
            null,
            $unit
        );
        
        $unit->delete();

        return redirect()->route('units.index')->with('success', 'Unit deleted successfully!');
    }

    public function restore($id)
    {
        $unit = Unit::onlyTrashed()->findOrFail($id);
        $unitName = $unit->name;
        $unitCode = $unit->code ?? '';
        $unitType = ucfirst($unit->unit_type);
        
        app(AuditLogService::class)->logRestored(
            'units',
            'Unit',
            (string)$unit->id,
            "Record was restored and returned to active use. ({$unitType}: {$unitName}" . ($unitCode ? ", {$unitCode}" : '') . ")",
            $unit
        );

        $unit->restore();

        return redirect()->route('units.index')->with('success', 'Unit restored successfully!');
    }

    public function forceDelete($id)
    {
        $unit = Unit::onlyTrashed()->findOrFail($id);
        $unitName = $unit->name;
        $unitCode = $unit->code ?? '';
        $unitType = ucfirst($unit->unit_type);
        
        app(AuditLogService::class)->logPermanentlyDeleted(
            'units',
            'Unit',
            (string)$unit->id,
            "Record was permanently removed and cannot be recovered. ({$unitType}: {$unitName}" . ($unitCode ? ", {$unitCode}" : '') . ")",
            null,
            $unit
        );
        
        $unit->forceDelete();

        return redirect()->route('units.index')->with('success', 'Unit permanently deleted!');
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
