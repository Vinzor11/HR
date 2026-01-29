<?php

namespace App\Http\Controllers;

use App\Models\AcademicRank;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\AuditLogService;

class AcademicRankController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->can('access-academic-rank'), 403, 'Unauthorized action.');

        $query = AcademicRank::query();

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
        $sortBy = $request->get('sort_by', 'sort_order');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('perPage', 10);
        $academicRanks = $query->paginate($perPage)->withQueryString();

        return Inertia::render('academic-ranks/index', [
            'academicRanks' => $academicRanks,
            'filters' => $request->only(['search', 'perPage', 'show_deleted', 'sort_by', 'sort_order']),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->can('create-academic-rank'), 403, 'Unauthorized action.');

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:academic_ranks,name',
            'code' => 'nullable|string|max:20|unique:academic_ranks,code',
            'level' => 'required|integer|min:1|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        // Auto-set sort_order if not provided
        if (!isset($validated['sort_order'])) {
            $validated['sort_order'] = AcademicRank::max('sort_order') + 1;
        }

        $academicRank = AcademicRank::create($validated);

        app(AuditLogService::class)->logCreated(
            'academic-ranks',
            'AcademicRank',
            (string)$academicRank->id,
            "Created a New Academic Rank: {$academicRank->name}" . ($academicRank->code ? " ({$academicRank->code})" : ''),
            null,
            $academicRank
        );

        return redirect()->route('academic-ranks.index')->with('success', 'Academic rank created successfully!');
    }

    public function update(Request $request, AcademicRank $academicRank)
    {
        abort_unless($request->user()->can('edit-academic-rank'), 403, 'Unauthorized action.');

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:academic_ranks,name,' . $academicRank->id,
            'code' => 'nullable|string|max:20|unique:academic_ranks,code,' . $academicRank->id,
            'level' => 'required|integer|min:1|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        // Refresh to ensure we have the latest data
        $academicRank->refresh();
        $original = $academicRank->getOriginal();
        
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
        
        // Update the academic rank
        $academicRank->update($validated);
        
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
            $rankCode = $academicRank->code ?? '';
            $description .= " (Academic Rank ID: {$academicRank->id}" . ($rankCode ? ", {$rankCode}" : '') . ")";
            
            app(AuditLogService::class)->logUpdated(
                'academic-ranks',
                'AcademicRank',
                (string)$academicRank->id,
                $description,
                $oldValues,
                $newValues,
                $academicRank
            );
        }

        return redirect()->route('academic-ranks.index')->with('success', 'Academic rank updated successfully!');
    }

    public function destroy(Request $request, AcademicRank $academicRank)
    {
        abort_unless($request->user()->can('delete-academic-rank'), 403, 'Unauthorized action.');

        // Check if rank is in use
        $usageCount = $academicRank->assignments()->count();
        if ($usageCount > 0) {
            return redirect()->route('academic-ranks.index')
                ->with('error', "Cannot delete: This academic rank is assigned to {$usageCount} employee designation(s).");
        }

        $rankId = $academicRank->id;
        $rankName = $academicRank->name;
        $rankCode = $academicRank->code ?? '';
        
        app(AuditLogService::class)->logDeleted(
            'academic-ranks',
            'AcademicRank',
            (string)$rankId,
            "Record was marked inactive and hidden from normal views. (Academic Rank: {$rankName}" . ($rankCode ? ", {$rankCode}" : '') . ")",
            null,
            $academicRank
        );
        
        $academicRank->delete();

        return redirect()->route('academic-ranks.index')->with('success', 'Academic rank deleted successfully!');
    }

    public function restore(Request $request, $id)
    {
        abort_unless($request->user()->can('restore-academic-rank'), 403, 'Unauthorized action.');

        $academicRank = AcademicRank::onlyTrashed()->findOrFail($id);
        $rankName = $academicRank->name;
        $rankCode = $academicRank->code ?? '';
        
        app(AuditLogService::class)->logRestored(
            'academic-ranks',
            'AcademicRank',
            (string)$academicRank->id,
            "Record was restored and returned to active use. (Academic Rank: {$rankName}" . ($rankCode ? ", {$rankCode}" : '') . ")",
            $academicRank
        );

        $academicRank->restore();

        return redirect()->route('academic-ranks.index')->with('success', 'Academic rank restored successfully!');
    }

    public function forceDelete(Request $request, $id)
    {
        abort_unless($request->user()->can('force-delete-academic-rank'), 403, 'Unauthorized action.');

        $academicRank = AcademicRank::onlyTrashed()->findOrFail($id);
        $rankName = $academicRank->name;
        $rankCode = $academicRank->code ?? '';
        
        app(AuditLogService::class)->logPermanentlyDeleted(
            'academic-ranks',
            'AcademicRank',
            (string)$academicRank->id,
            "Record was permanently removed and cannot be recovered. (Academic Rank: {$rankName}" . ($rankCode ? ", {$rankCode}" : '') . ")",
            null,
            $academicRank
        );
        
        $academicRank->forceDelete();

        return redirect()->route('academic-ranks.index')->with('success', 'Academic rank permanently deleted!');
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
