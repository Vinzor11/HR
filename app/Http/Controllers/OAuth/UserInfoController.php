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
        $user->load([
            'employee.primaryDesignation.unit.sector',
            'employee.primaryDesignation.unit.parentUnit',
            'employee.primaryDesignation.position',
            'employee.primaryDesignation.academicRank',
            'employee.primaryDesignation.staffGrade',
            'employee.designations.unit.sector',
            'employee.designations.unit.parentUnit',
            'employee.designations.position',
            'employee.designations.academicRank',
            'employee.designations.staffGrade'
        ]);
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

            // Primary designation (for backward compatibility)
            $designation = $employee->primaryDesignation;
            if ($designation) {
                if ($designation->unit) {
                    $claims['unit'] = $designation->unit->name ?? null;
                    $claims['unit_code'] = $designation->unit->code ?? null;
                    $claims['unit_type'] = $designation->unit->unit_type ?? null;
                    if ($designation->unit->parentUnit) {
                        $claims['unit_parent'] = $designation->unit->parentUnit->name ?? null;
                        $claims['unit_parent_code'] = $designation->unit->parentUnit->code ?? null;
                        $claims['unit_parent_id'] = (string) $designation->unit->parentUnit->id;
                    }
                }
                if ($designation->unit?->sector) {
                    $claims['sector'] = $designation->unit->sector->name ?? null;
                    $claims['sector_code'] = $designation->unit->sector->code ?? null;
                }
                if ($designation->position) {
                    $claims['position'] = $designation->position->pos_name ?? null;
                }
            }

            // All designations
            $claims['designations'] = $employee->designations->map(function ($designation) {
                $designationData = [
                    'id' => (string) $designation->id,
                    'is_primary' => $designation->is_primary ?? false,
                    'start_date' => $designation->start_date ? $designation->start_date->format('Y-m-d') : null,
                    'end_date' => $designation->end_date ? $designation->end_date->format('Y-m-d') : null,
                    'remarks' => $designation->remarks ?? null,
                ];

                if ($designation->unit) {
                    $designationData['unit'] = [
                        'id' => (string) $designation->unit->id,
                        'code' => $designation->unit->code ?? null,
                        'name' => $designation->unit->name ?? null,
                        'unit_type' => $designation->unit->unit_type ?? null,
                    ];

                    if ($designation->unit->parentUnit) {
                        $designationData['unit']['parent_unit'] = [
                            'id' => (string) $designation->unit->parentUnit->id,
                            'code' => $designation->unit->parentUnit->code ?? null,
                            'name' => $designation->unit->parentUnit->name ?? null,
                        ];
                    }

                    if ($designation->unit->sector) {
                        $designationData['unit']['sector'] = [
                            'id' => (string) $designation->unit->sector->id,
                            'code' => $designation->unit->sector->code ?? null,
                            'name' => $designation->unit->sector->name ?? null,
                        ];
                    }
                }

                if ($designation->position) {
                    $designationData['position'] = [
                        'id' => (string) $designation->position->id,
                        'code' => $designation->position->pos_code ?? null,
                        'name' => $designation->position->pos_name ?? null,
                        'authority_level' => $designation->position->authority_level ?? null,
                    ];
                }

                if ($designation->academicRank) {
                    $designationData['academic_rank'] = [
                        'id' => (string) $designation->academicRank->id,
                        'code' => $designation->academicRank->code ?? null,
                        'name' => $designation->academicRank->name ?? null,
                        'level' => $designation->academicRank->level ?? null,
                    ];
                }

                if ($designation->staffGrade) {
                    $designationData['staff_grade'] = [
                        'id' => (string) $designation->staffGrade->id,
                        'code' => $designation->staffGrade->code ?? null,
                        'name' => $designation->staffGrade->name ?? null,
                        'level' => $designation->staffGrade->level ?? null,
                    ];
                }

                return $designationData;
            })->toArray();
        }

        $claims['roles'] = $user->getRoleNames()->toArray();
        $claims['permissions'] = $user->getAllPermissions()->pluck('name')->toArray();

        return response()->json($claims);
    }
}

