<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeRankPromotion;
use App\Models\EmployeeAssignment;
use App\Models\AcademicRank;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class EmployeeRankPromotionController extends Controller
{
    /**
     * Get rank promotion history for an employee
     */
    public function index(Request $request, Employee $employee)
    {
        $rankPromotions = $employee->rankPromotions()
            ->with(['fromAcademicRank', 'toAcademicRank', 'promotedBy'])
            ->orderBy('effective_date', 'desc')
            ->get();

        return response()->json([
            'rankPromotions' => $rankPromotions,
        ]);
    }

    /**
     * Record a new academic rank promotion
     */
    public function store(Request $request, Employee $employee)
    {
        abort_unless($request->user()->can('promote-employee'), 403, 'Unauthorized action.');
        $validated = $request->validate([
            'to_academic_rank_id' => 'required|exists:academic_ranks,id',
            'effective_date' => 'required|date',
            'remarks' => 'nullable|string|max:500',
            'document_ref' => 'nullable|string|max:255',
        ]);

        // Get current academic rank from primary assignment
        $primaryAssignment = $employee->primaryAssignment;
        $fromAcademicRankId = $primaryAssignment?->academic_rank_id;

        // Validate promotion direction (to higher level)
        if ($fromAcademicRankId) {
            $fromRank = AcademicRank::find($fromAcademicRankId);
            $toRank = AcademicRank::find($validated['to_academic_rank_id']);
            
            if ($toRank && $fromRank && $toRank->level <= $fromRank->level) {
                return back()->withErrors([
                    'to_academic_rank_id' => 'Promotion must be to a higher rank level.'
                ]);
            }
        }

        DB::transaction(function () use ($validated, $employee, $fromAcademicRankId, $primaryAssignment) {
            $promotedBy = auth()->user()->employee?->id;

            $rankPromotion = EmployeeRankPromotion::create([
                'employee_id' => $employee->id,
                'from_academic_rank_id' => $fromAcademicRankId,
                'to_academic_rank_id' => $validated['to_academic_rank_id'],
                'effective_date' => $validated['effective_date'],
                'promoted_by' => $promotedBy,
                'remarks' => $validated['remarks'] ?? null,
                'document_ref' => $validated['document_ref'] ?? null,
            ]);

            // Update primary assignment with new academic rank
            if ($primaryAssignment) {
                $primaryAssignment->update([
                    'academic_rank_id' => $validated['to_academic_rank_id'],
                ]);
            }

            app(AuditLogService::class)->logCreated(
                'employees',
                'EmployeeRankPromotion',
                (string)$rankPromotion->id,
                "Recorded academic rank promotion for employee {$employee->id}: Rank changed from #{$fromAcademicRankId} to #{$validated['to_academic_rank_id']}",
                null,
                $rankPromotion
            );
        });

        return back()->with('success', 'Academic rank promotion recorded successfully!');
    }

    /**
     * Get form options for creating rank promotions
     */
    public function getFormOptions(Employee $employee)
    {
        $academicRanks = AcademicRank::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'code', 'level']);

        // Get current academic rank
        $currentRank = $employee->primaryAssignment?->academicRank;
        $currentRankLevel = $currentRank?->level ?? 0;

        // Filter to only show higher ranks
        $availableRanks = $academicRanks->filter(fn($rank) => $rank->level > $currentRankLevel);

        return response()->json([
            'academicRanks' => $availableRanks->values(),
            'currentRank' => $currentRank,
        ]);
    }
}
