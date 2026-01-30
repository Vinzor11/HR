<?php

namespace App\Http\Controllers;

use App\Models\Sector;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\AuditLogService;

class SectorController extends Controller
{
    public function index(Request $request)
    {
        $query = Sector::query();

        // Search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
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
        $sectors = $query->paginate($perPage)->withQueryString();

        return Inertia::render('sectors/index', [
            'sectors' => $sectors,
            'filters' => $request->only(['search', 'perPage', 'show_deleted', 'sort_by', 'sort_order']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:sectors,name',
            'code' => 'nullable|string|max:10|unique:sectors,code',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $sector = Sector::create($validated);

        app(AuditLogService::class)->logCreated(
            'sectors',
            'Sector',
            (string)$sector->id,
            "Created a New Sector: {$sector->name}" . ($sector->code ? " ({$sector->code})" : ''),
            null,
            $sector
        );

        return redirect()->route('sectors.index')->with('success', 'Sector created successfully!');
    }

    public function update(Request $request, Sector $sector)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:sectors,name,' . $sector->id,
            'code' => 'nullable|string|max:10|unique:sectors,code,' . $sector->id,
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        // Refresh to ensure we have the latest data
        $sector->refresh();
        $original = $sector->getOriginal();
        
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
        
        // Update the sector
        $sector->update($validated);
        
        // Log changes if any
        if (!empty($changes)) {
            $oldValues = [];
            $newValues = [];
            $changeDescriptions = [];
            
            foreach ($changes as $field => $change) {
                $fieldName = str_replace('_', ' ', $field);
                $fieldName = ucwords($fieldName);
                
                // Format old and new values for display
                $oldValueFormatted = $this->formatValueForDisplay($change['old']);
                $newValueFormatted = $this->formatValueForDisplay($change['new']);
                
                $oldValues[$field] = $change['old'];
                $newValues[$field] = $change['new'];
                $changeDescriptions[] = "{$fieldName}: {$oldValueFormatted} > {$newValueFormatted}";
            }
            
            $description = implode('; ', $changeDescriptions);
            $sectorCode = $sector->code ?? '';
            $description .= " (Sector ID: {$sector->id}" . ($sectorCode ? ", {$sectorCode}" : '') . ")";
            
            app(AuditLogService::class)->logUpdated(
                'sectors',
                'Sector',
                (string)$sector->id,
                $description,
                $oldValues,
                $newValues,
                $sector
            );
        }

        return redirect()->route('sectors.index')->with('success', 'Sector updated successfully!');
    }

    public function destroy(Sector $sector)
    {
        $sectorId = $sector->id;
        $sectorName = $sector->name;
        $sectorCode = $sector->code ?? '';
        
        app(AuditLogService::class)->logDeleted(
            'sectors',
            'Sector',
            (string)$sectorId,
            "Record was marked inactive and hidden from normal views. (Sector: {$sectorName}" . ($sectorCode ? ", {$sectorCode}" : '') . ")",
            null,
            $sector
        );
        
        $sector->delete();

        return redirect()->route('sectors.index')->with('success', 'Sector deleted successfully!');
    }

    public function restore($id)
    {
        $sector = Sector::onlyTrashed()->findOrFail($id);
        $sectorName = $sector->name;
        $sectorCode = $sector->code ?? '';
        
        app(AuditLogService::class)->logRestored(
            'sectors',
            'Sector',
            (string)$sector->id,
            "Record was restored and returned to active use. (Sector: {$sectorName}" . ($sectorCode ? ", {$sectorCode}" : '') . ")",
            $sector
        );

        $sector->restore();

        return redirect()->route('sectors.index')->with('success', 'Sector restored successfully!');
    }

    public function forceDelete($id)
    {
        app(\App\Services\TwoFactorVerificationService::class)->validateForSensitiveAction(request());

        $sector = Sector::onlyTrashed()->findOrFail($id);
        $sectorName = $sector->name;
        $sectorCode = $sector->code ?? '';
        
        app(AuditLogService::class)->logPermanentlyDeleted(
            'sectors',
            'Sector',
            (string)$sector->id,
            "Record was permanently removed and cannot be recovered. (Sector: {$sectorName}" . ($sectorCode ? ", {$sectorCode}" : '') . ")",
            null,
            $sector
        );
        
        $sector->forceDelete();

        return redirect()->route('sectors.index')->with('success', 'Sector permanently deleted!');
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
