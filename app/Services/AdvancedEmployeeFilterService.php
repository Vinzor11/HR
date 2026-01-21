<?php

namespace App\Services;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Builder;

/**
 * Advanced Employee Filter Service
 * 
 * Handles filtering across ALL employee-related data, including normalized tables.
 * This service enables querying by any field, even if not visible in the table UI.
 */
class AdvancedEmployeeFilterService
{
    /**
     * Apply advanced filters to employee query
     * 
     * @param Builder $query
     * @param array $filters Array of filter conditions
     * @return Builder
     */
    public function applyFilters(Builder $query, array $filters): Builder
    {
        if (empty($filters)) {
            return $query;
        }

        foreach ($filters as $filter) {
            if (!isset($filter['field']) || !isset($filter['operator'])) {
                continue;
            }

            $field = $filter['field'];
            $operator = $filter['operator'];
            $value = $filter['value'] ?? null;

            // Skip if field is empty (filter not configured yet)
            if (empty($field)) {
                continue;
            }
            
            // Skip if value is empty (unless operator is 'is_null' or 'is_not_null')
            if (!in_array($operator, ['is_null', 'is_not_null'])) {
                if ($value === null || $value === '') {
                    continue;
                }
                if (is_array($value) && empty(array_filter($value))) {
                    continue;
                }
            }

            $this->applyFilter($query, $field, $operator, $value);
        }

        return $query;
    }

    /**
     * Apply a single filter condition
     * 
     * @param Builder $query
     * @param string $field Field path (e.g., 'res_city', 'family_background.relation', 'eligibility.eligibility')
     * @param string $operator Filter operator
     * @param mixed $value Filter value
     * @return void
     */
    protected function applyFilter(Builder $query, string $field, string $operator, $value): void
    {
        // Handle direct employee table fields
        if (!$this->isRelatedField($field)) {
            $this->applyDirectFieldFilter($query, $field, $operator, $value);
            return;
        }

        // Handle related table fields
        $parts = explode('.', $field);
        $relation = $parts[0];
        $relatedField = $parts[1] ?? null;

        if (!$relatedField) {
            return;
        }

        $this->applyRelatedFieldFilter($query, $relation, $relatedField, $operator, $value);
    }

    /**
     * Check if field is from a related table
     */
    protected function isRelatedField(string $field): bool
    {
        $relatedPrefixes = [
            'family_background',
            'children',
            'educational_background',
            'eligibility',
            'civil_service_eligibility',
            'work_experience',
            'voluntary_work',
            'learning_development',
            'training',
            'questionnaire',
            'references',
            'other_information',
            'department',
            'position',
        ];

        foreach ($relatedPrefixes as $prefix) {
            if (str_starts_with($field, $prefix . '.')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Apply filter on direct employee table field
     */
    protected function applyDirectFieldFilter(Builder $query, string $field, string $operator, $value): void
    {
        match ($operator) {
            'equals' => $query->where($field, $value),
            'not_equals' => $query->where($field, '!=', $value),
            'contains' => $query->where($field, 'like', "%{$value}%"),
            'not_contains' => $query->where($field, 'not like', "%{$value}%"),
            'starts_with' => $query->where($field, 'like', "{$value}%"),
            'ends_with' => $query->where($field, 'like', "%{$value}"),
            'greater_than' => $query->where($field, '>', $value),
            'greater_than_or_equal' => $query->where($field, '>=', $value),
            'less_than' => $query->where($field, '<', $value),
            'less_than_or_equal' => $query->where($field, '<=', $value),
            'in' => $query->whereIn($field, is_array($value) ? $value : [$value]),
            'not_in' => $query->whereNotIn($field, is_array($value) ? $value : [$value]),
            'is_null' => $query->whereNull($field),
            'is_not_null' => $query->whereNotNull($field),
            'between' => $query->whereBetween($field, is_array($value) && count($value) === 2 ? $value : [$value, $value]),
            default => null,
        };
    }

    /**
     * Apply filter on related table field
     */
    protected function applyRelatedFieldFilter(
        Builder $query,
        string $relation,
        string $field,
        string $operator,
        $value
    ): void {
        // Map frontend relation names to model relationship names
        $relationMap = [
            'family_background' => 'familyBackground',
            'children' => 'children',
            'educational_background' => 'educationalBackground',
            'eligibility' => 'civilServiceEligibility',
            'civil_service_eligibility' => 'civilServiceEligibility',
            'work_experience' => 'workExperience',
            'voluntary_work' => 'voluntaryWork',
            'learning_development' => 'learningDevelopment',
            'training' => 'learningDevelopment', // Alias
            'questionnaire' => 'questionnaire',
            'references' => 'references',
            'other_information' => 'otherInformation',
            'department' => 'department',
            'position' => 'position',
        ];

        $modelRelation = $relationMap[$relation] ?? $relation;

        $query->whereHas($modelRelation, function ($q) use ($field, $operator, $value) {
            match ($operator) {
                'equals' => $q->where($field, $value),
                'not_equals' => $q->where($field, '!=', $value),
                'contains' => $q->where($field, 'like', "%{$value}%"),
                'not_contains' => $q->where($field, 'not like', "%{$value}%"),
                'starts_with' => $q->where($field, 'like', "{$value}%"),
                'ends_with' => $q->where($field, 'like', "%{$value}"),
                'greater_than' => $q->where($field, '>', $value),
                'greater_than_or_equal' => $q->where($field, '>=', $value),
                'less_than' => $q->where($field, '<', $value),
                'less_than_or_equal' => $q->where($field, '<=', $value),
                'in' => $q->whereIn($field, is_array($value) ? $value : [$value]),
                'not_in' => $q->whereNotIn($field, is_array($value) ? $value : [$value]),
                'is_null' => $q->whereNull($field),
                'is_not_null' => $q->whereNotNull($field),
                'between' => $q->whereBetween($field, is_array($value) && count($value) === 2 ? $value : [$value, $value]),
                default => null,
            };
        });
    }

    /**
     * Get available filter fields configuration
     * This can be used by frontend to build filter UI
     */
    public static function getFilterFieldsConfig(): array
    {
        return [
            // Employee Table - Identification
            'identification' => [
                'id' => ['type' => 'text', 'label' => 'Employee ID'],
                'surname' => ['type' => 'text', 'label' => 'Surname'],
                'first_name' => ['type' => 'text', 'label' => 'First Name'],
                'middle_name' => ['type' => 'text', 'label' => 'Middle Name'],
                'name_extension' => ['type' => 'text', 'label' => 'Name Extension'],
            ],

            // Employee Table - Employment
            'employment' => [
                'status' => ['type' => 'select', 'label' => 'Status', 'options' => ['active', 'inactive', 'on-leave']],
                'employment_status' => ['type' => 'select', 'label' => 'Employment Status', 'options' => ['Regular', 'Contractual', 'Job-Order', 'Probationary']],
                'employee_type' => ['type' => 'select', 'label' => 'Employee Type', 'options' => ['Teaching', 'Non-Teaching']],
                'date_hired' => ['type' => 'date', 'label' => 'Date Hired'],
                'date_regularized' => ['type' => 'date', 'label' => 'Date Regularized'],
                'department.faculty_name' => ['type' => 'text', 'label' => 'Department'],
                'position.pos_name' => ['type' => 'text', 'label' => 'Position'],
            ],

            // Employee Table - Address (Residential)
            'address_residential' => [
                'res_city' => ['type' => 'text', 'label' => 'Residential City'],
                'res_province' => ['type' => 'text', 'label' => 'Residential Province'],
                'res_barangay' => ['type' => 'text', 'label' => 'Residential Barangay'],
                'res_street' => ['type' => 'text', 'label' => 'Residential Street'],
                'res_zip_code' => ['type' => 'text', 'label' => 'Residential ZIP Code'],
            ],

            // Employee Table - Address (Permanent)
            'address_permanent' => [
                'perm_city' => ['type' => 'text', 'label' => 'Permanent City'],
                'perm_province' => ['type' => 'text', 'label' => 'Permanent Province'],
                'perm_barangay' => ['type' => 'text', 'label' => 'Permanent Barangay'],
                'perm_street' => ['type' => 'text', 'label' => 'Permanent Street'],
                'perm_zip_code' => ['type' => 'text', 'label' => 'Permanent ZIP Code'],
            ],

            // Employee Table - Contact
            'contact' => [
                'mobile_no' => ['type' => 'text', 'label' => 'Mobile Number'],
                'email_address' => ['type' => 'text', 'label' => 'Email Address'],
                'telephone_no' => ['type' => 'text', 'label' => 'Telephone Number'],
            ],

            // Employee Table - Personal
            'personal' => [
                'birth_date' => ['type' => 'date', 'label' => 'Birth Date'],
                'birth_place' => ['type' => 'text', 'label' => 'Birth Place'],
                'sex' => ['type' => 'select', 'label' => 'Sex', 'options' => ['Male', 'Female']],
                'civil_status' => ['type' => 'text', 'label' => 'Civil Status'],
                'citizenship' => ['type' => 'text', 'label' => 'Citizenship'],
            ],

            // Family Background
            'family_background' => [
                'family_background.relation' => ['type' => 'select', 'label' => 'Family Relation', 'options' => ['Father', 'Mother', 'Spouse']],
                'family_background.surname' => ['type' => 'text', 'label' => 'Family Surname'],
                'family_background.first_name' => ['type' => 'text', 'label' => 'Family First Name'],
                'family_background.occupation' => ['type' => 'text', 'label' => 'Family Occupation'],
                'family_background.employer' => ['type' => 'text', 'label' => 'Family Employer'],
            ],

            // Children
            'children' => [
                'children.full_name' => ['type' => 'text', 'label' => 'Child Name'],
                'children.birth_date' => ['type' => 'date', 'label' => 'Child Birth Date'],
            ],

            // Educational Background
            'educational_background' => [
                'educational_background.level' => ['type' => 'text', 'label' => 'Education Level'],
                'educational_background.school_name' => ['type' => 'text', 'label' => 'School Name'],
                'educational_background.degree_course' => ['type' => 'text', 'label' => 'Degree/Course'],
                'educational_background.year_graduated' => ['type' => 'text', 'label' => 'Year Graduated'],
            ],

            // Civil Service Eligibility
            'eligibility' => [
                'eligibility.eligibility' => ['type' => 'text', 'label' => 'Eligibility Name'],
                'eligibility.rating' => ['type' => 'text', 'label' => 'Rating'],
                'eligibility.exam_date' => ['type' => 'date', 'label' => 'Exam Date'],
                'eligibility.license_no' => ['type' => 'text', 'label' => 'License Number'],
                'eligibility.license_validity' => ['type' => 'date', 'label' => 'License Validity'],
            ],

            // Work Experience
            'work_experience' => [
                'work_experience.position_title' => ['type' => 'text', 'label' => 'Position Title'],
                'work_experience.company_name' => ['type' => 'text', 'label' => 'Company Name'],
                'work_experience.date_from' => ['type' => 'date', 'label' => 'Work Start Date'],
                'work_experience.date_to' => ['type' => 'date', 'label' => 'Work End Date'],
                'work_experience.is_gov_service' => ['type' => 'boolean', 'label' => 'Government Service'],
            ],

            // Learning & Development / Training
            'training' => [
                'training.title' => ['type' => 'text', 'label' => 'Training Title'],
                'training.type_of_ld' => ['type' => 'text', 'label' => 'Training Type'],
                'training.date_from' => ['type' => 'date', 'label' => 'Training Start Date'],
                'training.date_to' => ['type' => 'date', 'label' => 'Training End Date'],
                'training.conducted_by' => ['type' => 'text', 'label' => 'Conducted By'],
                'training.venue' => ['type' => 'text', 'label' => 'Venue'],
            ],

            // Other Information
            'other_information' => [
                'other_information.skill_or_hobby' => ['type' => 'text', 'label' => 'Skills/Hobbies'],
                'other_information.non_academic_distinctions' => ['type' => 'text', 'label' => 'Distinctions'],
                'other_information.memberships' => ['type' => 'text', 'label' => 'Memberships'],
            ],
        ];
    }
}
