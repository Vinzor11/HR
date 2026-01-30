<?php

namespace App\Http\Controllers;

use App\Models\StaffGrade;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\AuditLogService;

class StaffGradeController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->can('access-staff-grade'), 403, 'Unauthorized action.');

        $query = StaffGrade::query();

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
        $staffGrades = $query->paginate($perPage)->withQueryString();

        return Inertia::render('staff-grades/index', [
            'staffGrades' => $staffGrades,
            'filters' => $request->only(['search', 'perPage', 'show_deleted', 'sort_by', 'sort_order']),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->can('create-staff-grade'), 403, 'Unauthorized action.');

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:staff_grades,name',
            'code' => 'nullable|string|max:20|unique:staff_grades,code',
            'level' => 'required|integer|min:1|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        // Auto-set sort_order if not provided
        if (!isset($validated['sort_order'])) {
            $validated['sort_order'] = StaffGrade::max('sort_order') + 1;
        }

        $staffGrade = StaffGrade::create($validated);

        app(AuditLogService::class)->logCreated(
            'staff-grades',
            'StaffGrade',
            (string)$staffGrade->id,
            "Created a New Staff Grade: {$staffGrade->name}" . ($staffGrade->code ? " ({$staffGrade->code})" : ''),
            null,
            $staffGrade
        );

        return redirect()->route('staff-grades.index')->with('success', 'Staff grade created successfully!');
    }

    public function update(Request $request, StaffGrade $staffGrade)
    {
        abort_unless($request->user()->can('edit-staff-grade'), 403, 'Unauthorized action.');

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:staff_grades,name,' . $staffGrade->id,
            'code' => 'nullable|string|max:20|unique:staff_grades,code,' . $staffGrade->id,
            'level' => 'required|integer|min:1|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        // Refresh to ensure we have the latest data
        $staffGrade->refresh();
        $original = $staffGrade->getOriginal();
        
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
        
        // Update the staff grade
        $staffGrade->update($validated);
        
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
            $gradeCode = $staffGrade->code ?? '';
            $description .= " (Staff Grade ID: {$staffGrade->id}" . ($gradeCode ? ", {$gradeCode}" : '') . ")";
            
            app(AuditLogService::class)->logUpdated(
                'staff-grades',
                'StaffGrade',
                (string)$staffGrade->id,
                $description,
                $oldValues,
                $newValues,
                $staffGrade
            );
        }

        return redirect()->route('staff-grades.index')->with('success', 'Staff grade updated successfully!');
    }

    public function destroy(Request $request, StaffGrade $staffGrade)
    {
        abort_unless($request->user()->can('delete-staff-grade'), 403, 'Unauthorized action.');

        // Check if grade is in use
        $usageCount = $staffGrade->assignments()->count();
        if ($usageCount > 0) {
            return redirect()->route('staff-grades.index')
                ->with('error', "Cannot delete: This staff grade is assigned to {$usageCount} employee designation(s).");
        }

        $gradeId = $staffGrade->id;
        $gradeName = $staffGrade->name;
        $gradeCode = $staffGrade->code ?? '';
        
        app(AuditLogService::class)->logDeleted(
            'staff-grades',
            'StaffGrade',
            (string)$gradeId,
            "Record was marked inactive and hidden from normal views. (Staff Grade: {$gradeName}" . ($gradeCode ? ", {$gradeCode}" : '') . ")",
            null,
            $staffGrade
        );
        
        $staffGrade->delete();

        return redirect()->route('staff-grades.index')->with('success', 'Staff grade deleted successfully!');
    }

    public function restore(Request $request, $id)
    {
        abort_unless($request->user()->can('restore-staff-grade'), 403, 'Unauthorized action.');

        $staffGrade = StaffGrade::onlyTrashed()->findOrFail($id);
        $gradeName = $staffGrade->name;
        $gradeCode = $staffGrade->code ?? '';
        
        app(AuditLogService::class)->logRestored(
            'staff-grades',
            'StaffGrade',
            (string)$staffGrade->id,
            "Record was restored and returned to active use. (Staff Grade: {$gradeName}" . ($gradeCode ? ", {$gradeCode}" : '') . ")",
            $staffGrade
        );

        $staffGrade->restore();

        return redirect()->route('staff-grades.index')->with('success', 'Staff grade restored successfully!');
    }

    public function forceDelete(Request $request, $id)
    {
        abort_unless($request->user()->can('force-delete-staff-grade'), 403, 'Unauthorized action.');

        app(\App\Services\TwoFactorVerificationService::class)->validateForSensitiveAction($request);

        $staffGrade = StaffGrade::onlyTrashed()->findOrFail($id);
        $gradeName = $staffGrade->name;
        $gradeCode = $staffGrade->code ?? '';
        
        app(AuditLogService::class)->logPermanentlyDeleted(
            'staff-grades',
            'StaffGrade',
            (string)$staffGrade->id,
            "Record was permanently removed and cannot be recovered. (Staff Grade: {$gradeName}" . ($gradeCode ? ", {$gradeCode}" : '') . ")",
            null,
            $staffGrade
        );
        
        $staffGrade->forceDelete();

        return redirect()->route('staff-grades.index')->with('success', 'Staff grade permanently deleted!');
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
