<?php

namespace App\Services\Api;

use App\Models\Employee;

class EmployeeApiFormatter
{
    /**
     * Format employee data for API responses (single or list).
     */
    public function format(Employee $employee): array
    {
        return [
            'id' => $employee->id,
            'is_deleted' => $employee->trashed(),
            'deleted_at' => $employee->deleted_at?->format('Y-m-d H:i:s'),
            'name' => [
                'surname' => $employee->surname,
                'first_name' => $employee->first_name,
                'middle_name' => $employee->middle_name,
                'name_extension' => $employee->name_extension,
                'full_name' => trim("{$employee->first_name} {$employee->middle_name} {$employee->surname} {$employee->name_extension}"),
            ],
            'contact' => [
                'email' => $employee->email_address,
                'mobile' => $employee->mobile_no,
                'telephone' => $employee->telephone_no,
            ],
            'employment' => [
                'status' => $employee->status,
                'employment_status' => $employee->employment_status,
                'employee_type' => $employee->employee_type,
                'date_hired' => $employee->date_hired?->format('Y-m-d'),
                'date_regularized' => $employee->date_regularized?->format('Y-m-d'),
            ],
            'unit' => $employee->primaryDesignation?->unit ? [
                'id' => $employee->primaryDesignation->unit->id,
                'code' => $employee->primaryDesignation->unit->code,
                'name' => $employee->primaryDesignation->unit->name,
                'unit_type' => $employee->primaryDesignation->unit->unit_type,
            ] : null,
            'sector' => $employee->primaryDesignation?->unit?->sector ? [
                'id' => $employee->primaryDesignation->unit->sector->id,
                'code' => $employee->primaryDesignation->unit->sector->code,
                'name' => $employee->primaryDesignation->unit->sector->name,
            ] : null,
            'position' => $employee->primaryDesignation?->position ? [
                'id' => $employee->primaryDesignation->position->id,
                'code' => $employee->primaryDesignation->position->pos_code,
                'name' => $employee->primaryDesignation->position->pos_name,
                'authority_level' => $employee->primaryDesignation->position->authority_level,
            ] : null,
            'academic_rank' => $employee->primaryDesignation?->academicRank ? [
                'id' => $employee->primaryDesignation->academicRank->id,
                'code' => $employee->primaryDesignation->academicRank->code,
                'name' => $employee->primaryDesignation->academicRank->name,
                'level' => $employee->primaryDesignation->academicRank->level,
            ] : null,
            'staff_grade' => $employee->primaryDesignation?->staffGrade ? [
                'id' => $employee->primaryDesignation->staffGrade->id,
                'code' => $employee->primaryDesignation->staffGrade->code,
                'name' => $employee->primaryDesignation->staffGrade->name,
                'level' => $employee->primaryDesignation->staffGrade->level,
            ] : null,
            'personal' => [
                'birth_date' => $employee->birth_date?->format('Y-m-d'),
                'birth_place' => $employee->birth_place,
                'sex' => $employee->sex,
                'civil_status' => $employee->civil_status,
                'citizenship' => $employee->citizenship,
                'dual_citizenship' => $employee->dual_citizenship,
                'citizenship_type' => $employee->citizenship_type,
            ],
            'address' => [
                'residential' => [
                    'house_no' => $employee->res_house_no,
                    'street' => $employee->res_street,
                    'subdivision' => $employee->res_subdivision,
                    'barangay' => $employee->res_barangay,
                    'city' => $employee->res_city,
                    'province' => $employee->res_province,
                    'zip_code' => $employee->res_zip_code,
                ],
                'permanent' => [
                    'house_no' => $employee->perm_house_no,
                    'street' => $employee->perm_street,
                    'subdivision' => $employee->perm_subdivision,
                    'barangay' => $employee->perm_barangay,
                    'city' => $employee->perm_city,
                    'province' => $employee->perm_province,
                    'zip_code' => $employee->perm_zip_code,
                ],
            ],
            'government_ids' => [
                'gsis' => $employee->gsis_id_no,
                'pagibig' => $employee->pagibig_id_no,
                'philhealth' => $employee->philhealth_no,
                'sss' => $employee->sss_no,
                'tin' => $employee->tin_no,
                'agency_employee_no' => $employee->agency_employee_no,
                'government_issued_id' => $employee->government_issued_id,
                'id_number' => $employee->id_number,
                'id_date_issued' => $employee->id_date_issued?->format('Y-m-d'),
                'id_place_of_issue' => $employee->id_place_of_issue,
            ],
            'special_categories' => [
                'pwd_id_no' => $employee->pwd_id_no,
                'solo_parent_id_no' => $employee->solo_parent_id_no,
                'indigenous_group' => $employee->indigenous_group,
            ],
        ];
    }
}
