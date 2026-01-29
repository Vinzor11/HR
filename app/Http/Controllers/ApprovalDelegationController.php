<?php

namespace App\Http\Controllers;

use App\Models\ApprovalDelegation;
use App\Models\Employee;
use App\Models\EmployeeDesignation;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalDelegationController extends Controller
{
    /**
     * Display a listing of the delegations.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        
        // Get delegations where user is delegator or delegate
        $delegations = ApprovalDelegation::with(['delegator', 'delegate', 'creator'])
            ->where(function ($query) use ($user) {
                $query->where('delegator_id', $user->id)
                    ->orWhere('delegate_id', $user->id);
            })
            ->when($user->can('access-request-types-module'), function ($query) {
                // Admins can see all delegations
                return ApprovalDelegation::with(['delegator', 'delegate', 'creator']);
            })
            ->orderByDesc('created_at')
            ->paginate(15);

        // Get eligible delegates - users in the same unit or sector
        $eligibleUsers = $this->getEligibleDelegates($user);

        return Inertia::render('settings/delegations', [
            'delegations' => $delegations,
            'users' => $eligibleUsers,
            'canManage' => $user->can('access-request-types-module'),
        ]);
    }

    /**
     * Get users eligible to be delegates for the current user.
     * Filters to users in the same unit or sector for security.
     */
    protected function getEligibleDelegates(User $user): array
    {
        // If user is admin, they can delegate to any user
        if ($user->can('access-request-types-module')) {
            return User::select('id', 'name', 'email')
                ->where('id', '!=', $user->id)
                ->whereNotNull('employee_id')
                ->orderBy('name')
                ->get()
                ->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'context' => 'All Users',
                ])
                ->toArray();
        }

        // Get the current user's employee and their unit/sector
        $employee = $user->employee;
        if (!$employee) {
            return [];
        }

        $employee->load('primaryDesignation.unit.sector');
        $primaryDesignation = $employee->primaryDesignation;
        
        if (!$primaryDesignation) {
            return [];
        }

        $unitId = $primaryDesignation->unit_id;
        $sectorId = $primaryDesignation->unit?->sector_id;

        $eligibleUserIds = collect();

        // 1. Users in the same unit
        if ($unitId) {
            $sameUnitUserIds = EmployeeDesignation::where('unit_id', $unitId)
                ->where('employee_id', '!=', $employee->id)
                ->whereHas('employee.user')
                ->with('employee.user')
                ->get()
                ->pluck('employee.user.id')
                ->filter();
            
            $eligibleUserIds = $eligibleUserIds->merge($sameUnitUserIds);
        }

        // 2. Users in the same sector (different units)
        if ($sectorId) {
            $sameSectorUserIds = EmployeeDesignation::whereHas('unit', function ($query) use ($sectorId) {
                    $query->where('sector_id', $sectorId);
                })
                ->where('employee_id', '!=', $employee->id)
                ->whereHas('employee.user')
                ->with('employee.user')
                ->get()
                ->pluck('employee.user.id')
                ->filter();
            
            $eligibleUserIds = $eligibleUserIds->merge($sameSectorUserIds);
        }

        // Get unique user IDs
        $eligibleUserIds = $eligibleUserIds->unique()->filter(fn ($id) => $id !== $user->id);

        if ($eligibleUserIds->isEmpty()) {
            return [];
        }

        // Fetch users with their designation info for context
        return User::select('id', 'name', 'email', 'employee_id')
            ->whereIn('id', $eligibleUserIds)
            ->with(['employee.primaryDesignation.unit', 'employee.primaryDesignation.position'])
            ->orderBy('name')
            ->get()
            ->map(function ($u) use ($unitId) {
                $designation = $u->employee?->primaryDesignation;
                $unitName = $designation?->unit?->name ?? '';
                $positionName = $designation?->position?->pos_name ?? '';
                
                $context = $positionName;
                if ($unitName) {
                    $context .= $context ? " - {$unitName}" : $unitName;
                }
                
                // Mark if same unit
                $isSameUnit = $designation?->unit_id === $unitId;
                
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'context' => $context ?: 'No designation',
                    'is_same_unit' => $isSameUnit,
                ];
            })
            ->sortByDesc('is_same_unit') // Same unit users first
            ->values()
            ->toArray();
    }

    /**
     * Store a newly created delegation.
     */
    public function store(Request $request)
    {
        $request->validate([
            'delegate_id' => [
                'required',
                'exists:users,id',
                Rule::notIn([$request->user()->id]),
            ],
            'starts_at' => ['required', 'date', 'after_or_equal:today'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'reason' => ['nullable', 'string', 'max:500'],
        ], [
            'delegate_id.not_in' => 'You cannot delegate to yourself.',
        ]);

        // Check if there's already an active delegation
        $existingDelegation = ApprovalDelegation::active()
            ->forDelegator($request->user()->id)
            ->first();

        if ($existingDelegation) {
            return back()->with('error', 'You already have an active delegation. Please deactivate it first.');
        }

        DB::transaction(function () use ($request) {
            $delegation = ApprovalDelegation::create([
                'delegator_id' => $request->user()->id,
                'delegate_id' => $request->input('delegate_id'),
                'starts_at' => $request->input('starts_at'),
                'ends_at' => $request->input('ends_at'),
                'reason' => $request->input('reason'),
                'is_active' => true,
                'created_by' => $request->user()->id,
            ]);

            app(AuditLogService::class)->logCreated(
                'requests',
                'ApprovalDelegation',
                (string) $delegation->id,
                "Created approval delegation to {$delegation->delegate->name}",
                null,
                $delegation
            );
        });

        return back()->with('success', 'Delegation created successfully.');
    }

    /**
     * Deactivate a delegation.
     */
    public function destroy(Request $request, ApprovalDelegation $delegation)
    {
        // Only delegator or admin can deactivate
        if ($delegation->delegator_id !== $request->user()->id && !$request->user()->can('access-request-types-module')) {
            abort(403, 'You can only deactivate your own delegations.');
        }

        $delegation->update(['is_active' => false]);

        app(AuditLogService::class)->log(
            'deactivated',
            'requests',
            'ApprovalDelegation',
            (string) $delegation->id,
            "Deactivated approval delegation to {$delegation->delegate->name}",
            ['is_active' => true],
            ['is_active' => false]
        );

        return back()->with('success', 'Delegation deactivated successfully.');
    }

    /**
     * Get active delegation for current user (API).
     */
    public function getActiveDelegation(Request $request)
    {
        $delegation = ApprovalDelegation::active()
            ->forDelegator($request->user()->id)
            ->with('delegate')
            ->first();

        return response()->json([
            'delegation' => $delegation ? [
                'id' => $delegation->id,
                'delegate' => [
                    'id' => $delegation->delegate->id,
                    'name' => $delegation->delegate->name,
                ],
                'starts_at' => $delegation->starts_at->toIso8601String(),
                'ends_at' => $delegation->ends_at?->toIso8601String(),
                'reason' => $delegation->reason,
            ] : null,
        ]);
    }

    /**
     * Get delegations where current user is the delegate (API).
     */
    public function getDelegationsToMe(Request $request)
    {
        $delegations = ApprovalDelegation::active()
            ->forDelegate($request->user()->id)
            ->with('delegator')
            ->get();

        return response()->json([
            'delegations' => $delegations->map(function ($delegation) {
                return [
                    'id' => $delegation->id,
                    'delegator' => [
                        'id' => $delegation->delegator->id,
                        'name' => $delegation->delegator->name,
                    ],
                    'starts_at' => $delegation->starts_at->toIso8601String(),
                    'ends_at' => $delegation->ends_at?->toIso8601String(),
                    'reason' => $delegation->reason,
                ];
            }),
        ]);
    }
}
