<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EmployeeDatabaseSeeder extends Seeder
{
    public function run()
    {
        // Disable foreign key checks temporarily
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // 1. Seed Departments
        $departments = [
            ['faculty_code' => 'CS', 'faculty_name' => 'Computer Science', 'description' => 'Department of Computer Science'],
            ['faculty_code' => 'ENG', 'faculty_name' => 'Engineering', 'description' => 'Department of Engineering'],
            ['faculty_code' => 'MATH', 'faculty_name' => 'Mathematics', 'description' => 'Department of Mathematics'],
            ['faculty_code' => 'PHYS', 'faculty_name' => 'Physics', 'description' => 'Department of Physics'],
            ['faculty_code' => 'CHEM', 'faculty_name' => 'Chemistry', 'description' => 'Department of Chemistry'],
            ['faculty_code' => 'BIO', 'faculty_name' => 'Biology', 'description' => 'Department of Biology'],
            ['faculty_code' => 'HIST', 'faculty_name' => 'History', 'description' => 'Department of History'],
            ['faculty_code' => 'ENG', 'faculty_name' => 'English', 'description' => 'Department of English'],
            ['faculty_code' => 'ECON', 'faculty_name' => 'Economics', 'description' => 'Department of Economics'],
            ['faculty_code' => 'PSY', 'faculty_name' => 'Psychology', 'description' => 'Department of Psychology'],
        ];

        foreach ($departments as $department) {
            DB::table('departments')->updateOrInsert(
                ['faculty_code' => $department['faculty_code']],
                array_merge($department, [
                    'code' => $department['faculty_code'],
                    'name' => $department['faculty_name'],
                ])
            );
        }

        // 2. Seed Positions
        $positions = [
            ['pos_code' => 'PROF', 'pos_name' => 'Professor', 'description' => 'Full Professor'],
            ['pos_code' => 'ASSP', 'pos_name' => 'Associate Professor', 'description' => 'Associate Professor'],
            ['pos_code' => 'ASST', 'pos_name' => 'Assistant Professor', 'description' => 'Assistant Professor'],
            ['pos_code' => 'INST', 'pos_name' => 'Instructor', 'description' => 'Instructor'],
            ['pos_code' => 'LECT', 'pos_name' => 'Lecturer', 'description' => 'Lecturer'],
            ['pos_code' => 'RES', 'pos_name' => 'Researcher', 'description' => 'Research Staff'],
            ['pos_code' => 'ADMIN', 'pos_name' => 'Administrator', 'description' => 'Administrative Staff'],
            ['pos_code' => 'LIB', 'pos_name' => 'Librarian', 'description' => 'Library Staff'],
            ['pos_code' => 'IT', 'pos_name' => 'IT Staff', 'description' => 'Information Technology Staff'],
            ['pos_code' => 'MAINT', 'pos_name' => 'Maintenance', 'description' => 'Maintenance Staff'],
        ];

        foreach ($positions as $position) {
            DB::table('positions')->updateOrInsert(
                ['pos_code' => $position['pos_code']],
                $position
            );
        }

        // 3. Seed Employees (50 records)
        $employees = [];
        for ($i = 1; $i <= 50; $i++) {
            $employeeId = 'EMP' . str_pad($i, 4, '0', STR_PAD_LEFT);
            
            $employeeData = [
                'id' => $employeeId,
                'surname' => 'LastName' . $i,
                'first_name' => 'FirstName' . $i,
                'middle_name' => 'Middle' . $i,
                'name_extension' => $i % 5 == 0 ? 'Jr.' : ($i % 7 == 0 ? 'Sr.' : null),
                'status' => ['active', 'inactive', 'on-leave'][rand(0, 2)],
                'employee_type' => ['Teaching', 'Non-Teaching'][rand(0, 1)],
                'department_id' => rand(1, 10),
                'position_id' => rand(1, 10),
                'birth_date' => date('Y-m-d', strtotime('-' . rand(25, 60) . ' years')),
                'birth_place' => 'City ' . rand(1, 50),
                'sex' => ['Male', 'Female'][rand(0, 1)],
                'civil_status' => ['Single', 'Married', 'Separated', 'Widowed', 'Annulled'][rand(0, 4)],
                'height_m' => rand(150, 200) / 100,
                'weight_kg' => rand(50, 100) + (rand(0, 9) / 10),
                'blood_type' => ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'][rand(0, 7)],
                'gsis_id_no' => 'GSIS' . rand(100000, 999999),
                'pagibig_id_no' => 'PAGIBIG' . rand(100000, 999999),
                'philhealth_no' => 'PHIL' . rand(100000, 999999),
                'sss_no' => 'SSS' . rand(100000, 999999),
                'tin_no' => 'TIN' . rand(100000, 999999),
                'agency_employee_no' => 'AGENCY' . rand(1000, 9999),
                'citizenship' => 'Filipino',
                'dual_citizenship' => rand(0, 1),
                'citizenship_type' => ['By birth', 'By naturalization'][rand(0, 1)],
                'dual_citizenship_country' => rand(0, 1) ? ['USA', 'Canada', 'UK', 'Australia'][rand(0, 3)] : null,
                'res_house_no' => rand(1, 999),
                'res_street' => 'Street ' . rand(1, 50),
                'res_subdivision' => 'Subdivision ' . rand(1, 10),
                'res_barangay' => 'Barangay ' . rand(1, 50),
                'res_city' => 'City ' . rand(1, 50),
                'res_province' => 'Province ' . rand(1, 50),
                'res_zip_code' => rand(1000, 9999),
                'perm_house_no' => rand(1, 999),
                'perm_street' => 'Street ' . rand(1, 50),
                'perm_subdivision' => 'Subdivision ' . rand(1, 10),
                'perm_barangay' => 'Barangay ' . rand(1, 50),
                'perm_city' => 'City ' . rand(1, 50),
                'perm_province' => 'Province ' . rand(1, 50),
                'perm_zip_code' => rand(1000, 9999),
                'telephone_no' => '02' . rand(1000000, 9999999),
                'mobile_no' => '09' . rand(100000000, 999999999),
                'email_address' => 'employee' . $i . '@university.edu',
                'government_issued_id' => ['Passport', 'Driver License', 'UMID'][rand(0, 2)],
                'id_number' => 'ID' . rand(100000, 999999),
                'id_date_issued' => date('Y-m-d', strtotime('-' . rand(1, 10) . ' years')),
                'id_place_of_issue' => 'City ' . rand(1, 50),
                'indigenous_group' => rand(0, 1) ? ['Igorot', 'Lumad', 'Mangyan', 'Aeta'][rand(0, 3)] : null,
                'pwd_id_no' => rand(0, 1) ? 'PWD' . rand(100000, 999999) : null,
                'solo_parent_id_no' => rand(0, 1) ? 'SP' . rand(100000, 999999) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            DB::table('employees')->updateOrInsert(
                ['id' => $employeeId],
                $employeeData
            );

            $employees[] = $employeeData;
        }

        // 4. Seed Family Backgrounds
        $familyBackgrounds = [];
        foreach ($employees as $employee) {
            // Father
            $familyBackgrounds[] = [
                'employee_id' => $employee['id'],
                'relation' => 'Father',
                'surname' => 'FatherLastName' . substr($employee['id'], 3),
                'first_name' => 'FatherFirstName' . substr($employee['id'], 3),
                'middle_name' => 'FatherMiddle' . substr($employee['id'], 3),
                'name_extension' => null,
                'occupation' => ['Engineer', 'Doctor', 'Teacher', 'Farmer', 'Businessman'][rand(0, 4)],
                'employer' => 'Company ' . rand(1, 100),
                'business_address' => 'Address ' . rand(1, 100),
                'telephone_no' => '02' . rand(1000000, 9999999),
                'created_at' => now(),
                'updated_at' => now(),
            ];

            // Mother
            $familyBackgrounds[] = [
                'employee_id' => $employee['id'],
                'relation' => 'Mother',
                'surname' => 'MotherLastName' . substr($employee['id'], 3),
                'first_name' => 'MotherFirstName' . substr($employee['id'], 3),
                'middle_name' => 'MotherMiddle' . substr($employee['id'], 3),
                'name_extension' => null,
                'occupation' => ['Nurse', 'Teacher', 'Housewife', 'Accountant', 'Businesswoman'][rand(0, 4)],
                'employer' => 'Company ' . rand(1, 100),
                'business_address' => 'Address ' . rand(1, 100),
                'telephone_no' => '02' . rand(1000000, 9999999),
                'created_at' => now(),
                'updated_at' => now(),
            ];

            // Spouse (if married)
            if ($employee['civil_status'] == 'Married') {
                $familyBackgrounds[] = [
                    'employee_id' => $employee['id'],
                    'relation' => 'Spouse',
                    'surname' => 'SpouseLastName' . substr($employee['id'], 3),
                    'first_name' => 'SpouseFirstName' . substr($employee['id'], 3),
                    'middle_name' => 'SpouseMiddle' . substr($employee['id'], 3),
                    'name_extension' => null,
                    'occupation' => ['Engineer', 'Doctor', 'Teacher', 'Nurse', 'Accountant'][rand(0, 4)],
                    'employer' => 'Company ' . rand(1, 100),
                    'business_address' => 'Address ' . rand(1, 100),
                    'telephone_no' => '02' . rand(1000000, 9999999),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        DB::table('employee_family_backgrounds')->insert($familyBackgrounds);

        // 5. Seed Children
        $children = [];
        foreach ($employees as $employee) {
            if ($employee['civil_status'] == 'Married') {
                $numChildren = rand(1, 3);
                for ($i = 1; $i <= $numChildren; $i++) {
                    $children[] = [
                        'employee_id' => $employee['id'],
                        'full_name' => 'Child ' . $i . ' ' . $employee['surname'],
                        'birth_date' => date('Y-m-d', strtotime('-' . rand(1, 20) . ' years')),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }
        }

        DB::table('employee_childrens')->insert($children);

        // 6. Seed Educational Backgrounds
        $educationalBackgrounds = [];
        foreach ($employees as $employee) {
            $levels = ['Elementary', 'Secondary', 'Vocational', 'College', 'Graduate Studies'];
            $numRecords = rand(3, 5);
            
            for ($i = 0; $i < $numRecords; $i++) {
                $level = $levels[$i];
                $yearGraduated = date('Y') - rand(5, 30);
                
                if ($level === 'Graduate Studies') {
                    $periodFrom = $yearGraduated - rand(2, 5);
                } elseif ($level === 'College') {
                    $periodFrom = $yearGraduated - rand(4, 6);
                } elseif ($level === 'Vocational') {
                    $periodFrom = $yearGraduated - rand(1, 2);
                } elseif ($level === 'Secondary') {
                    $periodFrom = $yearGraduated - rand(4, 6);
                } else { // Elementary
                    $periodFrom = $yearGraduated - rand(6, 7);
                }
                
                $educationalBackgrounds[] = [
                    'employee_id' => $employee['id'],
                    'level' => $level,
                    'school_name' => $level . ' School ' . rand(1, 100),
                    'degree_course' => $level === 'College' || $level === 'Graduate Studies' ? ['BS Computer Science', 'BS Engineering', 'BA English', 'BS Biology', 'MA Education', 'PhD Mathematics'][rand(0, 5)] : null,
                    'period_from' => $periodFrom . '-06-01',
                    'period_to' => $yearGraduated . '-03-31',
                    'highest_level_units' => $level === 'College' || $level === 'Graduate Studies' ? rand(100, 200) . ' units' : null,
                    'year_graduated' => $yearGraduated,
                    'honors_received' => rand(0, 1) ? ['Cum Laude', 'Magna Cum Laude', 'Summa Cum Laude', 'With Honors'][rand(0, 3)] : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        DB::table('employee_educational_backgrounds')->insert($educationalBackgrounds);

        // 7. Seed Civil Service Eligibilities
        $civilServiceEligibilities = [];
        foreach ($employees as $employee) {
            $numRecords = rand(0, 2);
            for ($i = 0; $i < $numRecords; $i++) {
                $eligibility = ['Professional', 'Subprofessional', 'RA 1080', 'CSEE', 'CES'][rand(0, 4)];
                
                $civilServiceEligibilities[] = [
                    'employee_id' => $employee['id'],
                    'eligibility' => $eligibility,
                    'rating' => rand(80, 99) . '.' . rand(0, 99),
                    'exam_date' => date('Y-m-d', strtotime('-' . rand(1, 10) . ' years')),
                    'exam_place' => 'City ' . rand(1, 50),
                    'license_no' => 'LIC' . rand(100000, 999999),
                    'license_validity' => date('Y-m-d', strtotime('+' . rand(1, 10) . ' years')),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        DB::table('employee_civil_service_eligibilities')->insert($civilServiceEligibilities);

        // 8. Seed Work Experiences
        $workExperiences = [];
        foreach ($employees as $employee) {
            $numRecords = rand(2, 5);
            for ($i = 0; $i < $numRecords; $i++) {
                $dateFrom = date('Y-m-d', strtotime('-' . rand(5, 15) . ' years'));
                $dateTo = rand(0, 1) ? date('Y-m-d', strtotime($dateFrom . ' +' . rand(1, 5) . ' years')) : null;
                
                $workExperiences[] = [
                    'employee_id' => $employee['id'],
                    'position_title' => ['Manager', 'Supervisor', 'Specialist', 'Analyst', 'Engineer', 'Teacher'][rand(0, 5)],
                    'company_name' => 'Company ' . rand(1, 100),
                    'company_address' => 'Address ' . rand(1, 100),
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'monthly_salary' => rand(20000, 100000),
                    'salary_grade_step' => rand(1, 33) . '-' . rand(1, 8),
                    'status_of_appointment' => ['Permanent', 'Contractual', 'Probationary', 'Part-time'][rand(0, 3)],
                    'is_gov_service' => rand(0, 1),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        DB::table('employee_work_experiences')->insert($workExperiences);

        // 9. Seed Voluntary Works
        $voluntaryWorks = [];
        foreach ($employees as $employee) {
            $numRecords = rand(0, 3);
            for ($i = 0; $i < $numRecords; $i++) {
                $dateFrom = date('Y-m-d', strtotime('-' . rand(2, 10) . ' years'));
                $dateTo = rand(0, 1) ? date('Y-m-d', strtotime($dateFrom . ' +' . rand(1, 3) . ' years')) : null;
                
                $voluntaryWorks[] = [
                    'employee_id' => $employee['id'],
                    'organization_name' => 'Organization ' . rand(1, 50),
                    'organization_address' => 'Address ' . rand(1, 100),
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'hours_rendered' => rand(50, 500),
                    'position_or_nature' => ['Volunteer', 'Coordinator', 'Trainer', 'Facilitator'][rand(0, 3)],
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        DB::table('employee_voluntary_works')->insert($voluntaryWorks);

        // 10. Seed Learning and Developments
        $learningDevelopments = [];
        foreach ($employees as $employee) {
            $numRecords = rand(3, 8);
            for ($i = 0; $i < $numRecords; $i++) {
                $dateFrom = date('Y-m-d', strtotime('-' . rand(1, 5) . ' years'));
                $dateTo = date('Y-m-d', strtotime($dateFrom . ' +' . rand(1, 14) . ' days'));
                
                $learningDevelopments[] = [
                    'employee_id' => $employee['id'],
                    'title' => 'Training ' . rand(1, 100),
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'hours' => rand(8, 40),
                    'type_of_ld' => ['Managerial', 'Supervisory', 'Technical', 'Foundation', 'Others'][rand(0, 4)],
                    'conducted_by' => 'Organization ' . rand(1, 50),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        DB::table('employee_learning_developments')->insert($learningDevelopments);

        // 11. Seed Other Information
        $otherInformations = [];
        foreach ($employees as $employee) {
            $otherInformations[] = [
                'employee_id' => $employee['id'],
                'skill_or_hobby' => ['Programming', 'Painting', 'Singing', 'Dancing', 'Sports', 'Writing'][rand(0, 5)],
                'non_academic_distinctions' => rand(0, 1) ? 'Award ' . rand(1, 10) : null,
                'memberships' => rand(0, 1) ? 'Member of Organization ' . rand(1, 10) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::table('employee_other_information')->insert($otherInformations);

        // 12. Seed Questionnaires
        $questionnaires = [];
        foreach ($employees as $employee) {
            for ($i = 34; $i <= 41; $i++) {
                $answer = rand(0, 1);
                
                $questionnaires[] = [
                    'employee_id' => $employee['id'],
                    'question_number' => $i,
                    'answer' => $answer,
                    'details' => $answer ? 'Details for question ' . $i : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        DB::table('questionnaires')->insert($questionnaires);

        // 13. Seed References
        $references = [];
        foreach ($employees as $employee) {
            for ($i = 1; $i <= 3; $i++) {
                $references[] = [
                    'employee_id' => $employee['id'],
                    'first_name' => 'ReferenceFirstName' . $i,
                    'middle_initial' => chr(rand(65, 90)),
                    'surname' => 'ReferenceLastName' . $i,
                    'address' => 'Address ' . rand(1, 100),
                    'telephone_no' => '02' . rand(1000000, 9999999),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        DB::table('references')->insert($references);

        // Re-enable foreign key checks
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->command->info('✅ Employee database seeded successfully!');
    }
}