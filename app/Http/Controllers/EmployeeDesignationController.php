<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeDesignation;
use App\Models\Unit;
use App\Models\Position;
use App\Models\AcademicRank;
use App\Models\StaffGrade;
use App\Models\UnitPosition;
use App\Models\Sector;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class EmployeeDesignationController extends Controller
{
    /**
     * Display the designations management page for an employee
     */
    public function page(Request $request, Employee $employee)
    {
        abort_unless($request->user()->can('access-employees-module'), 403, 'Unauthorized action.');

        $sectors = Sector::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        $units = Unit::with('sector')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'unit_type', 'sector_id']);

        $positions = Position::with('sector')
            ->orderBy('pos_name')
            ->get(['id', 'pos_name', 'pos_code', 'authority_level', 'sector_id']);

        $academicRanks = AcademicRank::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'code', 'level']);

        $staffGrades = StaffGrade::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'code', 'level']);

        // Build unit-position whitelist
        $unitPositionWhitelist = [];
        $whitelistEntries = UnitPosition::where('is_active', true)->get(['unit_type', 'position_id']);
        foreach ($whitelistEntries as $entry) {
            if (!isset($unitPositionWhitelist[$entry->unit_type])) {
                $unitPositionWhitelist[$entry->unit_type] = [];
            }
            $unitPositionWhitelist[$entry->unit_type][] = $entry->position_id;
        }

        return Inertia::render('employees/Designations', [
            'employee' => [
                'id' => $employee->id,
                'first_name' => $employee->first_name,
                'middle_name' => $employee->middle_name,
                'surname' => $employee->surname,
            ],
            'canEdit' => $request->user()->can('edit-employee'),
            'canPromoteGrade' => $request->user()->can('promote-grade'),
            'canCorrectGrade' => $request->user()->can('correct-grade'),
            'sectors' => $sectors,
            'units' => $units,
            'positions' => $positions,
            'academicRanks' => $academicRanks,
            'staffGrades' => $staffGrades,
            'unitPositionWhitelist' => $unitPositionWhitelist,
        ]);
    }

    /**
     * Get designations for an employee (API)
     */
    public function index(Request $request, Employee $employee)
    {
        $designations = $employee->designations()
            ->with(['unit.sector', 'position.sector', 'academicRank', 'staffGrade'])
            ->orderBy('is_primary', 'desc')
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json([
            'designations' => $designations,
            'primary_designation_id' => $employee->primary_designation_id,
        ]);
    }

    /**
     * Store a new designation for an employee
     */
    public function store(Request $request, Employee $employee)
    {
        abort_unless($request->user()->can('edit-employee'), 403, 'Unauthorized action.');
        $validated = $request->validate([
            'unit_id' => 'nullable|exists:units,id',
            'position_id' => 'required|exists:positions,id',
            'academic_rank_id' => 'nullable|exists:academic_ranks,id',
            'staff_grade_id' => 'nullable|exists:staff_grades,id',
            'is_primary' => 'boolean',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'remarks' => 'nullable|string|max:500',
        ]);

        $position = Position::find($validated['position_id']);
        
        // If unit_id is provided, validate unit-position relationship
        if (!empty($validated['unit_id'])) {
            $unit = Unit::find($validated['unit_id']);
            
            // Validate position-sector compatibility
            if ($position->sector_id && $position->sector_id !== $unit->sector_id) {
                return back()->withErrors([
                    'position_id' => 'This position belongs to a different sector than the selected unit.'
                ]);
            }
            
            // Check whitelist
            $isValidPosition = UnitPosition::where('unit_type', $unit->unit_type)
                ->where('position_id', $validated['position_id'])
                ->where('is_active', true)
                ->exists();

            $strictMode = config('hr.unit_position_whitelist.strict_mode', false);
            $whitelistExists = UnitPosition::where('unit_type', $unit->unit_type)
                ->where('is_active', true)
                ->exists();

            if (!$isValidPosition) {
                if ($strictMode || $whitelistExists) {
                    return back()->withErrors([
                        'position_id' => 'This position is not allowed for ' . $unit->unit_type . ' unit type.'
                    ]);
                }
            }
        } else {
            // System-wide position (no unit) - validate that position has no sector_id
            if ($position->sector_id) {
                return back()->withErrors([
                    'position_id' => 'This position belongs to a sector and requires a unit assignment.'
                ]);
            }
        }

        $designation = DB::transaction(function () use ($validated, $employee) {
            // If this is primary, unset other primary designations
            if ($validated['is_primary'] ?? false) {
                EmployeeDesignation::where('employee_id', $employee->id)
                    ->where('is_primary', true)
                    ->update(['is_primary' => false]);
            }

            $designation = EmployeeDesignation::create([
                'employee_id' => $employee->id,
                ...$validated,
            ]);

            // Update employee's primary_designation_id if this is primary
            if ($validated['is_primary'] ?? false) {
                $employee->update(['primary_designation_id' => $designation->id]);
            }

            app(AuditLogService::class)->logCreated(
                'employees',
                'EmployeeDesignation',
                (string)$designation->id,
                "Created designation for employee {$employee->id}: Unit #{$validated['unit_id']}, Position #{$validated['position_id']}",
                null,
                $designation
            );

            return $designation;
        });

        // Load relationships for response
        $designation->load(['unit', 'position', 'academicRank', 'staffGrade']);

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Designation created successfully!',
                'designation' => $designation
            ]);
        }

        return back()->with('success', 'Designation created successfully!');
    }

    /**
     * Update a designation
     */
    public function update(Request $request, Employee $employee, EmployeeDesignation $designation)
    {
        abort_unless($request->user()->can('edit-employee'), 403, 'Unauthorized action.');
        
        // HARD BLOCK: Detect any attempt to change rank/grade
        $originalRankId = $designation->academic_rank_id;
        $originalGradeId = $designation->staff_grade_id;
        
        $requestedRankId = $request->input('academic_rank_id');
        $requestedGradeId = $request->input('staff_grade_id');
        
        // Normalize null/empty values for comparison
        $requestedRankId = $requestedRankId === '' || $requestedRankId === 'none' ? null : $requestedRankId;
        $requestedGradeId = $requestedGradeId === '' || $requestedGradeId === 'none' ? null : $requestedGradeId;
        
        // Check if rank/grade is being changed
        $rankChanged = (string)$originalRankId !== (string)$requestedRankId;
        $gradeChanged = (string)$originalGradeId !== (string)$requestedGradeId;
        
        if ($rankChanged || $gradeChanged) {
            $errorMessage = 'Rank/Grade changes must be done via Promotion or Correction workflow. ' .
                           'Please use the "Promote" or "Correct/Adjust" buttons instead of editing the designation directly.';
            
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => $errorMessage,
                    'errors' => [
                        'academic_rank_id' => [$errorMessage],
                        'staff_grade_id' => [$errorMessage],
                    ],
                ], 422);
            }
            
            return back()->withErrors([
                'academic_rank_id' => $errorMessage,
                'staff_grade_id' => $errorMessage,
            ])->withInput();
        }
        
        // Remove rank/grade from validation - they cannot be updated here
        $validated = $request->validate([
            'unit_id' => 'nullable|exists:units,id',
            'position_id' => 'required|exists:positions,id',
            // academic_rank_id and staff_grade_id are NOT in validation - they're blocked
            'is_primary' => 'boolean',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'remarks' => 'nullable|string|max:500',
        ]);
        
        // Explicitly preserve current rank/grade (prevent any tampering)
        $validated['academic_rank_id'] = $originalRankId;
        $validated['staff_grade_id'] = $originalGradeId;

        $position = Position::find($validated['position_id']);
        
        // If unit_id is provided, validate unit-position relationship
        if (!empty($validated['unit_id'])) {
            $unit = Unit::find($validated['unit_id']);
            
            // Validate position-sector compatibility
            if ($position->sector_id && $position->sector_id !== $unit->sector_id) {
                return back()->withErrors([
                    'position_id' => 'This position belongs to a different sector than the selected unit.'
                ]);
            }
            
            // Check whitelist
            $isValidPosition = UnitPosition::where('unit_type', $unit->unit_type)
                ->where('position_id', $validated['position_id'])
                ->where('is_active', true)
                ->exists();

            $strictMode = config('hr.unit_position_whitelist.strict_mode', false);
            $whitelistExists = UnitPosition::where('unit_type', $unit->unit_type)
                ->where('is_active', true)
                ->exists();

            if (!$isValidPosition) {
                if ($strictMode || $whitelistExists) {
                    return back()->withErrors([
                        'position_id' => 'This position is not allowed for ' . $unit->unit_type . ' unit type.'
                    ]);
                }
            }
        } else {
            // System-wide position (no unit) - validate that position has no sector_id
            if ($position->sector_id) {
                return back()->withErrors([
                    'position_id' => 'This position belongs to a sector and requires a unit assignment.'
                ]);
            }
        }

        $original = $designation->getOriginal();

        DB::transaction(function () use ($validated, $employee, $designation, $originalRankId, $originalGradeId) {
            // If this is becoming primary, unset other primary designations
            if (($validated['is_primary'] ?? false) && !$designation->is_primary) {
                EmployeeDesignation::where('employee_id', $employee->id)
                    ->where('id', '!=', $designation->id)
                    ->where('is_primary', true)
                    ->update(['is_primary' => false]);
            }

            // Update only allowed fields - explicitly exclude rank/grade
            $designation->update([
                'unit_id' => $validated['unit_id'],
                'position_id' => $validated['position_id'],
                'is_primary' => $validated['is_primary'] ?? false,
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'] ?? null,
                'remarks' => $validated['remarks'] ?? null,
                // Explicitly preserve rank/grade - DO NOT UPDATE
                'academic_rank_id' => $originalRankId,
                'staff_grade_id' => $originalGradeId,
            ]);

            // Update employee's primary_designation_id
            if ($validated['is_primary'] ?? false) {
                $employee->update(['primary_designation_id' => $designation->id]);
            } elseif ($employee->primary_designation_id === $designation->id) {
                // If was primary and no longer is, find another or set null
                $newPrimary = EmployeeDesignation::where('employee_id', $employee->id)
                    ->where('is_primary', true)
                    ->first();
                $employee->update(['primary_designation_id' => $newPrimary?->id]);
            }
        });

        // Refresh designation to get updated data
        $designation->refresh();
        $designation->load(['unit', 'position', 'academicRank', 'staffGrade']);

        app(AuditLogService::class)->logUpdated(
            'employees',
            'EmployeeDesignation',
            (string)$designation->id,
            "Updated designation for employee {$employee->id}",
            $original,
            $designation->toArray(),
            $designation
        );

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Designation updated successfully!',
                'designation' => $designation
            ]);
        }

        return back()->with('success', 'Designation updated successfully!');
    }

    /**
     * Delete a designation
     */
    public function destroy(Request $request, Employee $employee, EmployeeDesignation $designation)
    {
        abort_unless($request->user()->can('edit-employee'), 403, 'Unauthorized action.');
        if ($designation->is_primary) {
            // Find another designation to make primary, or clear the field
            $newPrimary = EmployeeDesignation::where('employee_id', $employee->id)
                ->where('id', '!=', $designation->id)
                ->active()
                ->first();

            if ($newPrimary) {
                $newPrimary->update(['is_primary' => true]);
                $employee->update(['primary_designation_id' => $newPrimary->id]);
            } else {
                $employee->update(['primary_designation_id' => null]);
            }
        }

        app(AuditLogService::class)->logDeleted(
            'employees',
            'EmployeeDesignation',
            (string)$designation->id,
            "Deleted designation for employee {$employee->id}",
            null,
            $designation
        );

        $designation->delete();

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Designation deleted successfully!'
            ]);
        }

        return back()->with('success', 'Designation deleted successfully!');
    }

    /**
     * Set a designation as primary
     */
    public function setPrimary(Request $request, Employee $employee, EmployeeDesignation $designation)
    {
        abort_unless($request->user()->can('edit-employee'), 403, 'Unauthorized action.');
        DB::transaction(function () use ($employee, $designation) {
            // Unset current primary
            EmployeeDesignation::where('employee_id', $employee->id)
                ->where('is_primary', true)
                ->update(['is_primary' => false]);

            // Set new primary
            $designation->update(['is_primary' => true]);
            $employee->update(['primary_designation_id' => $designation->id]);
        });

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Primary designation updated successfully!'
            ]);
        }

        return back()->with('success', 'Primary designation updated successfully!');
    }

    /**
     * Get form options for creating/editing designations
     */
    public function getFormOptions(Employee $employee)
    {
        $units = Unit::with('sector')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'unit_type', 'sector_id', 'parent_unit_id']);

        $positions = Position::with('sector')
            ->orderBy('pos_name')
            ->get(['id', 'pos_code', 'pos_name', 'sector_id', 'authority_level']);

        $academicRanks = AcademicRank::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'code', 'level']);

        $staffGrades = StaffGrade::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'code', 'level']);

        // Get unit-position whitelist
        $unitPositionWhitelist = UnitPosition::where('is_active', true)
            ->get(['unit_type', 'position_id'])
            ->groupBy('unit_type')
            ->map(fn($items) => $items->pluck('position_id')->toArray());

        return response()->json([
            'units' => $units,
            'positions' => $positions,
            'academicRanks' => $academicRanks,
            'staffGrades' => $staffGrades,
            'unitPositionWhitelist' => $unitPositionWhitelist,
        ]);
    }
}
