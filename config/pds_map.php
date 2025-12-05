<?php

/**
 * CS Form 212 (Personal Data Sheet) mapping file
 *
 * All coordinates below reference the officially published CSC Excel template
 * (Revised 2017). If your copy of the form differs, simply update the cell
 * references or column letters—no PHP changes are required.
 */

return [
    'default_sheet' => 'C1',

    'single_fields' => [
        // Identification (Sheet C1)
        'surname' => ['cell' => 'D10'],
        'first_name' => ['cell' => 'D11'],
        'middle_name' => ['cell' => 'D12'],
        'birth_date' => ['cell' => 'D13', 'type' => 'date'],
        'birth_place' => ['cell' => 'D15'],
        'sex' => ['cell' => 'D16'],
        'civil_status' => ['cell' => 'D17'],
        'height_m' => ['cell' => 'D22'],
        'weight_kg' => ['cell' => 'D24'],
        'blood_type' => ['cell' => 'D25'],
        'gsis_id_no' => ['cell' => 'D27'],
        'pagibig_id_no' => ['cell' => 'D29'],
        'philhealth_no' => ['cell' => 'D31'],
        'sss_no' => ['cell' => 'D32'],
        'tin_no' => ['cell' => 'D33'],
        'agency_employee_no' => ['cell' => 'D34'],

        // Residential address (Sheet C1)
        'res_house_no' => ['cell' => 'I17'],
        'res_street' => ['cell' => 'L17'],
        'res_subdivision' => ['cell' => 'I19'],
        'res_barangay' => ['cell' => 'L19'],
        'res_city' => ['cell' => 'I22'],
        'res_province' => ['cell' => 'L22'],
        'res_zip_code' => ['cell' => 'I24'],

        // Permanent address (Sheet C1)
        'perm_house_no' => ['cell' => 'I25'],
        'perm_street' => ['cell' => 'L25'],
        'perm_subdivision' => ['cell' => 'I27'],
        'perm_barangay' => ['cell' => 'L27'],
        'perm_city' => ['cell' => 'J29'],
        'perm_province' => ['cell' => 'M29'],
        'perm_zip_code' => ['cell' => 'I31'],

        // Contact information (Sheet C1)
        'telephone_no' => ['cell' => 'I32'],
        'mobile_no' => ['cell' => 'I33'],
        'email_address' => ['cell' => 'I34'],

        // Government issued ID (Sheet C4)
        'government_issued_id' => ['sheet' => 'C4', 'cell' => 'D61'],
        'id_number' => ['sheet' => 'C4', 'cell' => 'D62'],
        'id_date_issued' => ['sheet' => 'C4', 'cell' => 'D64', 'type' => 'date'],
    ],

    'family_background' => [
        [
            'relation' => 'Spouse',
            'sheet' => 'C1',
            'cells' => [
                'surname' => 'D36',
                'first_name' => 'D37',
                'middle_name' => 'D38',
                'occupation' => 'D39',
                'employer' => 'D40',
                'business_address' => 'D41',
                'telephone_no' => 'D42',
            ],
        ],
        [
            'relation' => 'Father',
            'sheet' => 'C1',
            'cells' => [
                'surname' => 'D43',
                'first_name' => 'D44',
                'middle_name' => 'D45',
            ],
        ],
        [
            'relation' => 'Mother',
            'sheet' => 'C1',
            'cells' => [
                'surname' => 'D47',
                'first_name' => 'D48',
                'middle_name' => 'D49',
            ],
        ],
    ],

    'children' => [
        'sheet' => 'C1',
        'start_row' => 37,
        'end_row' => 48,
        'columns' => [
            'full_name' => 'I',
            'birth_date' => ['column' => 'M', 'type' => 'date'],
        ],
        'required' => ['full_name'],
    ],

    'repeating_sections' => [
        'educational_background' => [
            'sheet' => 'C1',
            'start_row' => 54,
            'end_row' => 58,
            'columns' => [
                'level' => 'B',
                'school_name' => 'D',
                'degree_course' => 'G',
                'period_from' => ['column' => 'J', 'type' => 'date'],
                'period_to' => ['column' => 'K', 'type' => 'date'],
                'highest_level_units' => 'L',
                'year_graduated' => 'M',
                'honors_received' => 'N',
            ],
            'required' => ['school_name'],
        ],
        'civil_service_eligibility' => [
            'sheet' => 'C2',
            'start_row' => 5,
            'end_row' => 11,
            'columns' => [
                'eligibility' => 'A',
                'rating' => 'F',
                'exam_date' => ['column' => 'G', 'type' => 'date'],
                'exam_place' => 'I',
                'license_no' => 'L',
                'license_validity' => ['column' => 'M', 'type' => 'date'],
            ],
            'required' => ['eligibility'],
        ],
        'work_experience' => [
            'sheet' => 'C2',
            'start_row' => 18,
            'end_row' => 45,
            'columns' => [
                'date_from' => ['column' => 'A', 'type' => 'date'],
                'date_to' => ['column' => 'C', 'type' => 'date'],
                'position_title' => 'D',
                'company_name' => 'G',
                'monthly_salary' => 'J',
                'salary_grade_step' => 'K',
                'status_of_appointment' => 'L',
                'is_gov_service' => ['column' => 'M', 'type' => 'boolean'],
            ],
            'required' => ['position_title', 'company_name', 'date_from'],
        ],
        'voluntary_work' => [
            'sheet' => 'C3',
            'start_row' => 6,
            'end_row' => 12,
            'columns' => [
                'organization_name' => 'A',
                'date_from' => ['column' => 'E', 'type' => 'date'],
                'date_to' => ['column' => 'F', 'type' => 'date'],
                'hours_rendered' => 'G',
                'position_or_nature' => 'H',
            ],
            'required' => ['organization_name'],
        ],
        'learning_development' => [
            'sheet' => 'C3',
            'start_row' => 18,
            'end_row' => 38,
            'columns' => [
                'title' => 'A',
                'date_from' => ['column' => 'E', 'type' => 'date'],
                'date_to' => ['column' => 'F', 'type' => 'date'],
                'hours' => 'G',
                'type_of_ld' => 'H',
                'conducted_by' => ['columns' => ['I', 'K']],
            ],
            'required' => ['title'],
        ],
        'references' => [
            'sheet' => 'C4',
            'start_row' => 52,
            'end_row' => 54,
            'columns' => [
                'name' => 'A',
                'address' => 'F',
                'telephone_no' => 'G',
            ],
            'required' => ['name'],
        ],
    ],

    'other_information' => [
        'sheet' => 'C3',
        'skill_or_hobby' => [
            'start_row' => 42,
            'end_row' => 48,
            'column' => 'A',
        ],
        'non_academic_distinctions' => [
            'start_row' => 42,
            'end_row' => 48,
            'column' => 'C',
        ],
        'memberships' => [
            'start_row' => 42,
            'end_row' => 48,
            'column' => 'I',
        ],
    ],

    'questionnaire' => [
        // Question 34a: within third degree
        341 => [
            'sheet' => 'C4',
            'answer_cell' => 'F6', // Checkbox for 34a (approximate, may need adjustment)
            'details_cell' => 'I11',
        ],
        // Question 34b: within fourth degree
        342 => [
            'sheet' => 'C4',
            'answer_cell' => 'F8', // Checkbox for 34b (approximate, may need adjustment)
            'details_cell' => 'I11', // Same details cell as 34a
        ],
        // Question 35a: administrative offense
        351 => [
            'sheet' => 'C4',
            'answer_cell' => 'F13', // Checkbox for 35a
            'details_cell' => 'I15',
        ],
        // Question 35b: criminal charge
        352 => [
            'sheet' => 'C4',
            'answer_cell' => 'F18', // Checkbox for 35b
            'details_cell' => 'I20', // Date Filed at L20, Status at L21
        ],
        // Question 36: conviction
        36 => [
            'sheet' => 'C4',
            'answer_cell' => 'F23', // Checkbox for 36
            'details_cell' => 'I25',
        ],
        // Question 37: separation from service
        37 => [
            'sheet' => 'C4',
            'answer_cell' => 'F27', // Checkbox for 37
            'details_cell' => 'I29',
        ],
        // Question 38a: candidate in election
        381 => [
            'sheet' => 'C4',
            'answer_cell' => 'F31', // Checkbox for 38a
            'details_cell' => 'K32',
        ],
        // Question 38b: resigned during election
        382 => [
            'sheet' => 'C4',
            'answer_cell' => 'F34', // Checkbox for 38b
            'details_cell' => 'K35',
        ],
        // Question 39: immigrant status
        39 => [
            'sheet' => 'C4',
            'answer_cell' => 'F37', // Checkbox for 39
            'details_cell' => 'I39',
        ],
        // Question 40a: indigenous group
        401 => [
            'sheet' => 'C4',
            'answer_cell' => 'F43', // Checkbox for 40a
            'details_cell' => 'L44',
        ],
        // Question 40b: person with disability
        402 => [
            'sheet' => 'C4',
            'answer_cell' => 'F45', // Checkbox for 40b
            'details_cell' => 'L46',
        ],
        // Question 40c: solo parent
        403 => [
            'sheet' => 'C4',
            'answer_cell' => 'F47', // Checkbox for 40c
            'details_cell' => 'L48',
        ],
    ],
];

