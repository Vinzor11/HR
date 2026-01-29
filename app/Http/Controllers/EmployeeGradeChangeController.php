<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeDesignation;
use App\Models\AcademicRank;
use App\Models\StaffGrade;
use App\Services\GradeChangeService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EmployeeGradeChangeController extends Controller
{
    protected $gradeChangeService;

    public function __construct(GradeChangeService $gradeChangeService)
    {
        $this->gradeChangeService = $gradeChangeService;
    }

    /**
     * Get grade change history for an assignment
     */
    public function history(Request $request, Employee $employee, EmployeeDesignation $designation)
    {
        abort_unless($request->user()->can('access-employees-module'), 403, 'Unauthorized action.');
        
        // Verify designation belongs to employee
        if ($designation->employee_id !== $employee->id) {
            abort(404, 'Designation not found.');
        }

        $history = $this->gradeChangeService->getHistory($designation);

        return response()->json([
            'history' => $history,
        ]);
    }

    /**
     * Promote an employee (upward career progression)
     */
    public function promote(Request $request, Employee $employee, EmployeeDesignation $designation)
    {
        abort_unless($request->user()->can('promote-grade'), 403, 'Unauthorized action.');
        
        // Verify designation belongs to employee
        if ($designation->employee_id !== $employee->id) {
            abort(404, 'Designation not found.');
        }

        $validated = $request->validate([
            'to_grade_id' => 'required|integer',
            'grade_type' => 'required|in:academic_rank,staff_grade',
            'effective_date' => 'required|date',
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            $performedBy = auth()->user()->employee?->id;
            
            $gradeChange = $this->gradeChangeService->promote(
                $designation,
                $validated['to_grade_id'],
                $validated['grade_type'],
                $validated['effective_date'],
                $validated['reason'] ?? null,
                $performedBy
            );

            if ($request->expectsJson() || $request->ajax()) {
                // Load relationships (fromGrade and toGrade are accessors, not relationships)
                $gradeChange->load(['performedBy']);
                return response()->json([
                    'success' => true,
                    'message' => 'Promotion recorded successfully!',
                    'grade_change' => $gradeChange,
                ]);
            }

            return back()->with('success', 'Promotion recorded successfully!');
        } catch (ValidationException $e) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors(),
                ], 422);
            }
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            // Log the full error for debugging
            \Log::error('Grade promotion error', [
                'employee_id' => $employee->id,
                'designation_id' => $designation->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'error_details' => config('app.debug') ? [
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                    ] : null,
                ], 500);
            }
            return back()->withErrors(['error' => $e->getMessage()])->withInput();
        }
    }

    /**
     * Correct/adjust an employee's grade (fixing errors)
     */
    public function correct(Request $request, Employee $employee, EmployeeDesignation $designation)
    {
        abort_unless($request->user()->can('correct-grade'), 403, 'Unauthorized action.');
        
        // Verify designation belongs to employee
        if ($designation->employee_id !== $employee->id) {
            abort(404, 'Designation not found.');
        }

        $validated = $request->validate([
            'to_grade_id' => 'required|integer',
            'grade_type' => 'required|in:academic_rank,staff_grade',
            'effective_date' => 'required|date',
            'reason' => 'required|string|min:10|max:500', // Reason is REQUIRED for corrections
        ]);

        try {
            $performedBy = auth()->user()->employee?->id;
            
            $gradeChange = $this->gradeChangeService->correct(
                $designation,
                $validated['to_grade_id'],
                $validated['grade_type'],
                $validated['effective_date'],
                $validated['reason'],
                $performedBy
            );

            if ($request->expectsJson() || $request->ajax()) {
                // Load relationships (fromGrade and toGrade are accessors, not relationships)
                $gradeChange->load(['performedBy']);
                return response()->json([
                    'success' => true,
                    'message' => 'Correction recorded successfully!',
                    'grade_change' => $gradeChange,
                ]);
            }

            return back()->with('success', 'Correction recorded successfully!');
        } catch (ValidationException $e) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors(),
                ], 422);
            }
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            // Log the full error for debugging
            \Log::error('Grade correction error', [
                'employee_id' => $employee->id,
                'designation_id' => $designation->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'error_details' => config('app.debug') ? [
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                    ] : null,
                ], 500);
            }
            return back()->withErrors(['error' => $e->getMessage()])->withInput();
        }
    }

    /**
     * Get form options for promotion/correction
     */
    public function getFormOptions(Employee $employee, EmployeeDesignation $designation)
    {
        // Verify designation belongs to employee
        if ($designation->employee_id !== $employee->id) {
            abort(404, 'Designation not found.');
        }

        // Determine grade type
        $gradeType = $designation->academic_rank_id ? 'academic_rank' : 'staff_grade';
        $currentGradeId = $designation->academic_rank_id ?? $designation->staff_grade_id;

        if ($gradeType === 'academic_rank') {
            $allGrades = AcademicRank::where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'name', 'code', 'level']);
            
            $currentGrade = AcademicRank::find($currentGradeId);
            $currentLevel = $currentGrade?->level ?? 0;
            
            // For promotion: only higher levels
            $availableForPromotion = $allGrades->filter(fn($rank) => $rank->level > $currentLevel);
            
            // For correction: all levels
            $availableForCorrection = $allGrades;
        } else {
            $allGrades = StaffGrade::where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'name', 'code', 'level']);
            
            $currentGrade = StaffGrade::find($currentGradeId);
            $currentLevel = $currentGrade?->level ?? 0;
            
            // For promotion: only higher levels
            $availableForPromotion = $allGrades->filter(fn($grade) => $grade->level > $currentLevel);
            
            // For correction: all levels
            $availableForCorrection = $allGrades;
        }

        return response()->json([
            'grade_type' => $gradeType,
            'current_grade' => $currentGrade,
            'available_for_promotion' => $availableForPromotion->values(),
            'available_for_correction' => $availableForCorrection->values(),
        ]);
    }
}
