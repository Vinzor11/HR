<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeDesignation;
use App\Models\Position;
use App\Services\Api\EmployeeApiFormatter;
use App\Services\EmployeeScopeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Research Office API Controller
 *
 * Endpoints for the Research Office system to:
 * - Fetch employees with Research Coordinator position
 * - Fetch designations
 * - Fetch employees in same parent unit (for coordinators via SSO)
 */
class ResearchApiController extends Controller
{
    protected EmployeeScopeService $scopeService;

    protected EmployeeApiFormatter $formatter;

    public function __construct(EmployeeScopeService $scopeService, EmployeeApiFormatter $formatter)
    {
        $this->scopeService = $scopeService;
        $this->formatter = $formatter;
    }

    /**
     * List employees with Research Coordinator position.
     *
     * For Research Office admin: shows all employees who hold the Research Coordinator
     * position so they can assign them in their system.
     *
     * Query Parameters:
     * - page, per_page, status (same as employees index)
     */
    public function coordinators(Request $request): JsonResponse
    {
        $position = Position::where('pos_code', 'RES_COORD')->first();

        if (!$position) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 50,
                    'total' => 0,
                    'from' => null,
                    'to' => null,
                ],
                'links' => [
                    'first' => $request->url(),
                    'last' => $request->url(),
                    'prev' => null,
                    'next' => null,
                ],
            ]);
        }

        $query = Employee::with([
            'designations.unit.sector',
            'designations.position',
            'designations.academicRank',
            'designations.staffGrade',
            'primaryDesignation.unit.sector',
            'primaryDesignation.position',
            'primaryDesignation.academicRank',
            'primaryDesignation.staffGrade',
        ])->whereHas('designations', function ($q) use ($position) {
            $q->where('position_id', $position->id)->active();
        });

        $status = $request->input('status', 'active');
        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $perPage = min((int) $request->input('per_page', 50), 100);
        $employees = $query->orderBy('surname')->orderBy('first_name')->paginate($perPage);

        $formatted = $employees->map(fn (Employee $e) => $this->formatter->format($e) + [
            'designations' => $e->designations->map(fn ($d) => [
                'id' => $d->id,
                'unit' => $d->unit ? [
                    'id' => $d->unit->id,
                    'code' => $d->unit->code,
                    'name' => $d->unit->name,
                    'unit_type' => $d->unit->unit_type,
                    'parent_unit_id' => $d->unit->parent_unit_id,
                ] : null,
                'position' => $d->position ? [
                    'id' => $d->position->id,
                    'code' => $d->position->pos_code,
                    'name' => $d->position->pos_name,
                ] : null,
                'is_primary' => $d->is_primary,
                'start_date' => $d->start_date?->format('Y-m-d'),
                'end_date' => $d->end_date?->format('Y-m-d'),
            ])->values()->all(),
        ]);

        return response()->json([
            'data' => $formatted,
            'meta' => [
                'current_page' => $employees->currentPage(),
                'last_page' => $employees->lastPage(),
                'per_page' => $employees->perPage(),
                'total' => $employees->total(),
                'from' => $employees->firstItem(),
                'to' => $employees->lastItem(),
            ],
            'links' => [
                'first' => $employees->url(1),
                'last' => $employees->url($employees->lastPage()),
                'prev' => $employees->previousPageUrl(),
                'next' => $employees->nextPageUrl(),
            ],
        ]);
    }

    /**
     * List designations with optional filters.
     *
     * Query Parameters:
     * - position_code: Filter by position (e.g. RES_COORD)
     * - unit_id: Filter by unit
     * - employee_id: Filter by employee
     * - page, per_page
     */
    public function designations(Request $request): JsonResponse
    {
        $query = EmployeeDesignation::with(['employee', 'unit.sector', 'position', 'academicRank', 'staffGrade'])
            ->active();

        if ($positionCode = $request->input('position_code')) {
            $query->whereHas('position', fn ($q) => $q->where('pos_code', $positionCode));
        }

        if ($unitId = $request->input('unit_id')) {
            $query->where('unit_id', $unitId);
        }

        if ($employeeId = $request->input('employee_id')) {
            $query->where('employee_id', $employeeId);
        }

        $perPage = min((int) $request->input('per_page', 50), 100);
        $designations = $query->orderBy('employee_id')->paginate($perPage);

        $formatted = $designations->map(fn ($d) => [
            'id' => $d->id,
            'employee_id' => $d->employee_id,
            'employee_name' => $d->employee ? trim("{$d->employee->first_name} {$d->employee->middle_name} {$d->employee->surname}") : null,
            'unit' => $d->unit ? [
                'id' => $d->unit->id,
                'code' => $d->unit->code,
                'name' => $d->unit->name,
                'unit_type' => $d->unit->unit_type,
                'parent_unit_id' => $d->unit->parent_unit_id,
                'sector' => $d->unit->sector ? [
                    'id' => $d->unit->sector->id,
                    'name' => $d->unit->sector->name,
                ] : null,
            ] : null,
            'position' => $d->position ? [
                'id' => $d->position->id,
                'code' => $d->position->pos_code,
                'name' => $d->position->pos_name,
            ] : null,
            'academic_rank' => $d->academicRank ? [
                'id' => $d->academicRank->id,
                'name' => $d->academicRank->name,
            ] : null,
            'is_primary' => $d->is_primary,
            'start_date' => $d->start_date?->format('Y-m-d'),
            'end_date' => $d->end_date?->format('Y-m-d'),
        ]);

        return response()->json([
            'data' => $formatted,
            'meta' => [
                'current_page' => $designations->currentPage(),
                'last_page' => $designations->lastPage(),
                'per_page' => $designations->perPage(),
                'total' => $designations->total(),
                'from' => $designations->firstItem(),
                'to' => $designations->lastItem(),
            ],
            'links' => [
                'first' => $designations->url(1),
                'last' => $designations->url($designations->lastPage()),
                'prev' => $designations->previousPageUrl(),
                'next' => $designations->nextPageUrl(),
            ],
        ]);
    }

    /**
     * List employees in the same parent unit as the requester.
     *
     * For Research Coordinators (logged in via SSO): if the requester is in
     * Computer Science (Program), parent unit is College of Computer Studies,
     * returns all employees in that College + all Programs under it.
     */
    public function unitEmployees(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->employee_id) {
            return response()->json([
                'error' => 'No employee record',
                'message' => 'The authenticated user does not have an associated employee record.',
            ], 404);
        }

        $employee = Employee::with(['primaryDesignation.unit', 'primaryDesignation.position'])->find($user->employee_id);

        if (!$employee) {
            return response()->json([
                'error' => 'Employee not found',
                'message' => 'Employee record not found.',
            ], 404);
        }

        if (!$employee->primaryDesignation?->unit) {
            return response()->json([
                'error' => 'No unit assignment',
                'message' => 'Your employee record has no unit assignment.',
            ], 400);
        }

        $scope = $this->scopeService->getParentUnitScope($employee);

        $perPage = min((int) $request->input('per_page', 50), 100);
        $employees = $scope
            ->with(['primaryDesignation.unit.sector', 'primaryDesignation.position', 'primaryDesignation.academicRank', 'primaryDesignation.staffGrade'])
            ->where('status', 'active')
            ->orderBy('surname')
            ->orderBy('first_name')
            ->paginate($perPage);

        $formatted = $employees->map(fn (Employee $e) => $this->formatter->format($e));

        return response()->json([
            'data' => $formatted,
            'meta' => [
                'current_page' => $employees->currentPage(),
                'last_page' => $employees->lastPage(),
                'per_page' => $employees->perPage(),
                'total' => $employees->total(),
                'from' => $employees->firstItem(),
                'to' => $employees->lastItem(),
            ],
            'links' => [
                'first' => $employees->url(1),
                'last' => $employees->url($employees->lastPage()),
                'prev' => $employees->previousPageUrl(),
                'next' => $employees->nextPageUrl(),
            ],
        ]);
    }
}
