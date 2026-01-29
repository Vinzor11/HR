<?php

namespace App\Services;

use App\Models\EmployeeDesignation;
use App\Models\EmployeeGradeChange;
use App\Models\AcademicRank;
use App\Models\StaffGrade;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Service for handling grade/rank changes (Promotion and Correction)
 * 
 * Enforces strict rules:
 * - Promotion: Only upward movement, no reason required
 * - Correction: Any direction, reason REQUIRED
 * - All changes create history records
 * - Assignment table stores only current state
 */
class GradeChangeService
{
    /**
     * Promote an employee (upward career progression)
     * 
     * @param EmployeeDesignation $designation
     * @param int $toGradeId
     * @param string $gradeType 'academic_rank' or 'staff_grade'
     * @param string $effectiveDate
     * @param string|null $reason Optional reason for promotion
     * @param string|null $performedByEmployeeId
     * @return EmployeeGradeChange
     * @throws ValidationException
     */
    public function promote(
        EmployeeDesignation $designation,
        int $toGradeId,
        string $gradeType,
        string $effectiveDate,
        ?string $reason = null,
        ?string $performedByEmployeeId = null
    ): EmployeeGradeChange {
        // Validate designation is active
        if ($designation->end_date && $designation->end_date < now()) {
            throw ValidationException::withMessages([
                'designation' => 'Cannot promote on an inactive designation.'
            ]);
        }

        // Get current grade
        $currentGradeId = $gradeType === 'academic_rank' 
            ? $designation->academic_rank_id 
            : $designation->staff_grade_id;

        // For promotion, current grade is required
        if (!$currentGradeId) {
            throw ValidationException::withMessages([
                'designation' => 'Designation must have a current grade/rank before promotion. Use Correction/Adjustment for initial grade assignment.'
            ]);
        }

        // Get grade models
        $currentGrade = $gradeType === 'academic_rank'
            ? AcademicRank::find($currentGradeId)
            : StaffGrade::find($currentGradeId);

        $newGrade = $gradeType === 'academic_rank'
            ? AcademicRank::find($toGradeId)
            : StaffGrade::find($toGradeId);

        if (!$currentGrade || !$newGrade) {
            throw ValidationException::withMessages([
                'to_grade_id' => 'Invalid grade/rank specified.'
            ]);
        }

        // Validate promotion direction (must be higher level)
        if ($newGrade->level <= $currentGrade->level) {
            throw ValidationException::withMessages([
                'to_grade_id' => 'Promotion must be to a higher grade/rank level. Use Correction for adjustments.'
            ]);
        }

        // Validate grade type consistency
        $currentGradeType = $designation->academic_rank_id ? 'academic_rank' : 'staff_grade';
        if ($currentGradeType !== $gradeType) {
            throw ValidationException::withMessages([
                'grade_type' => 'Cannot change between academic rank and staff grade. These are separate career tracks.'
            ]);
        }

        return DB::transaction(function () use (
            $designation,
            $currentGradeId,
            $currentGradeType,
            $toGradeId,
            $gradeType,
            $effectiveDate,
            $reason,
            $performedByEmployeeId
        ) {
            // Create history record
            $gradeChange = EmployeeGradeChange::create([
                'employee_id' => $designation->employee_id,
                'designation_id' => $designation->id,
                'from_grade_id' => $currentGradeId,
                'from_grade_type' => $currentGradeType,
                'to_grade_id' => $toGradeId,
                'to_grade_type' => $gradeType,
                'change_type' => 'promotion',
                'effective_date' => $effectiveDate,
                'reason' => $reason,
                'performed_by_employee_id' => $performedByEmployeeId,
            ]);

            // Update designation with new grade
            if ($gradeType === 'academic_rank') {
                $designation->update(['academic_rank_id' => $toGradeId]);
            } else {
                $designation->update(['staff_grade_id' => $toGradeId]);
            }

            // Log audit
            app(AuditLogService::class)->logCreated(
                'employees',
                'EmployeeGradeChange',
                (string)$gradeChange->id,
                "Promoted employee {$designation->employee_id} from {$currentGradeType} #{$currentGradeId} to {$gradeType} #{$toGradeId}" . ($reason ? ". Reason: {$reason}" : ""),
                null,
                $gradeChange
            );

            return $gradeChange;
        });
    }

    /**
     * Correct/adjust an employee's grade (fixing errors)
     * 
     * @param EmployeeDesignation $designation
     * @param int $toGradeId
     * @param string $gradeType 'academic_rank' or 'staff_grade'
     * @param string $effectiveDate
     * @param string $reason REQUIRED reason for correction
     * @param string|null $performedByEmployeeId
     * @return EmployeeGradeChange
     * @throws ValidationException
     */
    public function correct(
        EmployeeDesignation $designation,
        int $toGradeId,
        string $gradeType,
        string $effectiveDate,
        string $reason,
        ?string $performedByEmployeeId = null
    ): EmployeeGradeChange {
        // Validate reason is provided
        if (empty(trim($reason))) {
            throw ValidationException::withMessages([
                'reason' => 'Reason is required for corrections/adjustments.'
            ]);
        }

        // Get current grade
        $currentGradeId = $gradeType === 'academic_rank' 
            ? $designation->academic_rank_id 
            : $designation->staff_grade_id;

        // Determine current grade type (if exists)
        $currentGradeType = null;
        if ($designation->academic_rank_id) {
            $currentGradeType = 'academic_rank';
        } elseif ($designation->staff_grade_id) {
            $currentGradeType = 'staff_grade';
        }

        // Validate grade exists
        $newGrade = $gradeType === 'academic_rank'
            ? AcademicRank::find($toGradeId)
            : StaffGrade::find($toGradeId);

        if (!$newGrade) {
            throw ValidationException::withMessages([
                'to_grade_id' => 'Invalid grade/rank specified.'
            ]);
        }

        // Validate grade type consistency (only if there's a current grade)
        if ($currentGradeType && $currentGradeType !== $gradeType) {
            throw ValidationException::withMessages([
                'grade_type' => 'Cannot change between academic rank and staff grade. These are separate career tracks.'
            ]);
        }

        // If no current grade type, use the provided grade_type
        if (!$currentGradeType) {
            $currentGradeType = $gradeType;
        }

        return DB::transaction(function () use (
            $designation,
            $currentGradeId,
            $currentGradeType,
            $toGradeId,
            $gradeType,
            $effectiveDate,
            $reason,
            $performedByEmployeeId
        ) {
            // Create history record
            $gradeChange = EmployeeGradeChange::create([
                'employee_id' => $designation->employee_id,
                'designation_id' => $designation->id,
                'from_grade_id' => $currentGradeId,
                'from_grade_type' => $currentGradeType,
                'to_grade_id' => $toGradeId,
                'to_grade_type' => $gradeType,
                'change_type' => 'correction',
                'effective_date' => $effectiveDate,
                'reason' => $reason,
                'performed_by_employee_id' => $performedByEmployeeId,
            ]);

            // Update designation with corrected grade
            if ($gradeType === 'academic_rank') {
                $designation->update(['academic_rank_id' => $toGradeId]);
            } else {
                $designation->update(['staff_grade_id' => $toGradeId]);
            }

            // Log audit
            $fromDescription = $currentGradeId 
                ? "from {$currentGradeType} #{$currentGradeId}" 
                : "from no grade/rank";
            app(AuditLogService::class)->logCreated(
                'employees',
                'EmployeeGradeChange',
                (string)$gradeChange->id,
                "Corrected employee {$designation->employee_id} {$fromDescription} to {$gradeType} #{$toGradeId}. Reason: {$reason}",
                null,
                $gradeChange
            );

            return $gradeChange;
        });
    }

    /**
     * Get grade change history for an assignment
     * 
     * @param EmployeeDesignation $designation
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getHistory(EmployeeDesignation $designation)
    {
        $history = EmployeeGradeChange::where('designation_id', $designation->id)
            ->with(['performedBy'])
            ->orderBy('effective_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        // Manually load grade relationships (polymorphic)
        $history->each(function ($change) {
            if ($change->from_grade_id && $change->from_grade_type) {
                $change->fromGrade = $change->from_grade_type === 'academic_rank'
                    ? AcademicRank::find($change->from_grade_id)
                    : StaffGrade::find($change->from_grade_id);
            }
            
            $change->toGrade = $change->to_grade_type === 'academic_rank'
                ? AcademicRank::find($change->to_grade_id)
                : StaffGrade::find($change->to_grade_id);
        });

        return $history;
    }
}
