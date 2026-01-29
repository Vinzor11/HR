<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeePromotion;
use App\Models\EmployeeAssignment;
use App\Models\StaffGrade;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class EmployeePromotionController extends Controller
{
    /**
     * Get promotion history for an employee
     */
    public function index(Request $request, Employee $employee)
    {
        $promotions = $employee->promotions()
            ->with(['fromStaffGrade', 'toStaffGrade', 'promotedBy'])
            ->orderBy('effective_date', 'desc')
            ->get();

        return response()->json([
            'promotions' => $promotions,
        ]);
    }

    /**
     * Record a new promotion
     */
    public function store(Request $request, Employee $employee)
    {
        abort_unless($request->user()->can('promote-employee'), 403, 'Unauthorized action.');
        $validated = $request->validate([
            'to_staff_grade_id' => 'required|exists:staff_grades,id',
            'effective_date' => 'required|date',
            'remarks' => 'nullable|string|max:500',
            'document_ref' => 'nullable|string|max:255',
        ]);

        // Get current staff grade from primary assignment
        $primaryAssignment = $employee->primaryAssignment;
        $fromStaffGradeId = $primaryAssignment?->staff_grade_id;

        // Validate promotion direction (to higher level)
        if ($fromStaffGradeId) {
            $fromGrade = StaffGrade::find($fromStaffGradeId);
            $toGrade = StaffGrade::find($validated['to_staff_grade_id']);
            
            if ($toGrade && $fromGrade && $toGrade->level <= $fromGrade->level) {
                return back()->withErrors([
                    'to_staff_grade_id' => 'Promotion must be to a higher grade level.'
                ]);
            }
        }

        DB::transaction(function () use ($validated, $employee, $fromStaffGradeId, $primaryAssignment) {
            $promotedBy = auth()->user()->employee?->id;

            $promotion = EmployeePromotion::create([
                'employee_id' => $employee->id,
                'from_staff_grade_id' => $fromStaffGradeId,
                'to_staff_grade_id' => $validated['to_staff_grade_id'],
                'effective_date' => $validated['effective_date'],
                'promoted_by' => $promotedBy,
                'remarks' => $validated['remarks'] ?? null,
                'document_ref' => $validated['document_ref'] ?? null,
            ]);

            // Update primary assignment with new staff grade
            if ($primaryAssignment) {
                $primaryAssignment->update([
                    'staff_grade_id' => $validated['to_staff_grade_id'],
                ]);
            }

            app(AuditLogService::class)->logCreated(
                'employees',
                'EmployeePromotion',
                (string)$promotion->id,
                "Recorded promotion for employee {$employee->id}: Staff Grade changed from #{$fromStaffGradeId} to #{$validated['to_staff_grade_id']}",
                null,
                $promotion
            );
        });

        return back()->with('success', 'Promotion recorded successfully!');
    }

    /**
     * Get form options for creating promotions
     */
    public function getFormOptions(Employee $employee)
    {
        $staffGrades = StaffGrade::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'code', 'level']);

        // Get current staff grade
        $currentGrade = $employee->primaryAssignment?->staffGrade;
        $currentGradeLevel = $currentGrade?->level ?? 0;

        // Filter to only show higher grades
        $availableGrades = $staffGrades->filter(fn($grade) => $grade->level > $currentGradeLevel);

        return response()->json([
            'staffGrades' => $availableGrades->values(),
            'currentGrade' => $currentGrade,
        ]);
    }
}
