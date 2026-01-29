<?php

namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserInfoController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('employee.primaryDesignation.unit.sector', 'employee.primaryDesignation.position');
        $employee = $user->employee ?? null;

        $claims = [
            'sub' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified' => $user->hasVerifiedEmail(),
        ];

        if ($employee) {
            $claims['employee_id'] = (string) $employee->id;
            $claims['employee_number'] = $employee->employee_number ?? null;
            $claims['first_name'] = $employee->first_name ?? null;
            $claims['last_name'] = $employee->surname ?? null;
            $claims['middle_name'] = $employee->middle_name ?? null;

            $designation = $employee->primaryDesignation;
            if ($designation) {
                if ($designation->unit) {
                    $claims['unit'] = $designation->unit->name ?? null;
                    $claims['unit_code'] = $designation->unit->code ?? null;
                    $claims['unit_type'] = $designation->unit->unit_type ?? null;
                }
                if ($designation->unit?->sector) {
                    $claims['sector'] = $designation->unit->sector->name ?? null;
                    $claims['sector_code'] = $designation->unit->sector->code ?? null;
                }
                if ($designation->position) {
                    $claims['position'] = $designation->position->pos_name ?? null;
                }
            }
        }

        $claims['roles'] = $user->getRoleNames()->toArray();
        $claims['permissions'] = $user->getAllPermissions()->pluck('name')->toArray();

        return response()->json($claims);
    }
}

