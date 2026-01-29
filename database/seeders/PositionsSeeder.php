<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PositionsSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // Get sector IDs
            $academicSectorId = DB::table('sectors')->where('name', 'Academic')->value('id');
            $adminSectorId = DB::table('sectors')->where('name', 'Administrative')->value('id');

            // System-wide positions (sector_id = null) - Top University Leadership
            $systemWidePositions = [
                ['pos_code' => 'UNIV_PRES', 'pos_name' => 'University President', 'sector_id' => null, 'authority_level' => 100],
                ['pos_code' => 'SUC_PRES_III', 'pos_name' => 'SUC President III', 'sector_id' => null, 'authority_level' => 100],
                ['pos_code' => 'VP_ACAD', 'pos_name' => 'Vice President for Academic Affairs', 'sector_id' => null, 'authority_level' => 95],
                ['pos_code' => 'VP_ADMIN', 'pos_name' => 'Vice President for Administration', 'sector_id' => null, 'authority_level' => 95],
                ['pos_code' => 'VP_RES_EXT', 'pos_name' => 'Vice President for Research and Extension', 'sector_id' => null, 'authority_level' => 95],
                ['pos_code' => 'VP_EXT_QA', 'pos_name' => 'Vice President for External Affairs and Quality Assurance', 'sector_id' => null, 'authority_level' => 95],
                ['pos_code' => 'BOARD_SEC_V', 'pos_name' => 'Board Secretary V', 'sector_id' => null, 'authority_level' => 85],
                ['pos_code' => 'BOARD_SEC_I', 'pos_name' => 'Board Secretary I', 'sector_id' => null, 'authority_level' => 75],
            ];

            // Academic positions - College/Program Level
            $academicPositions = [
                // College Leadership
                ['pos_code' => 'COLLEGE_DEAN', 'pos_name' => 'College Dean', 'sector_id' => $academicSectorId, 'authority_level' => 85],
                ['pos_code' => 'ASSOC_DEAN', 'pos_name' => 'Associate Dean', 'sector_id' => $academicSectorId, 'authority_level' => 80],
                ['pos_code' => 'COLLEGE_SEC', 'pos_name' => 'College Secretary', 'sector_id' => $academicSectorId, 'authority_level' => 70],
                
                // Program Level
                ['pos_code' => 'PROG_HEAD', 'pos_name' => 'Program Head', 'sector_id' => $academicSectorId, 'authority_level' => 75],
                
                // Coordinators
                ['pos_code' => 'RES_COORD', 'pos_name' => 'Research Coordinator', 'sector_id' => $academicSectorId, 'authority_level' => 65],
                ['pos_code' => 'EXT_COORD', 'pos_name' => 'Extension Coordinator', 'sector_id' => $academicSectorId, 'authority_level' => 65],
                ['pos_code' => 'OJT_COORD', 'pos_name' => 'OJT Coordinator', 'sector_id' => $academicSectorId, 'authority_level' => 60],
                ['pos_code' => 'INTERN_COORD', 'pos_name' => 'Internship Coordinator', 'sector_id' => $academicSectorId, 'authority_level' => 60],
                ['pos_code' => 'STUD_SERV_COORD', 'pos_name' => 'Student Services Coordinator', 'sector_id' => $academicSectorId, 'authority_level' => 60],
                ['pos_code' => 'ALUMNI_COORD', 'pos_name' => 'Alumni Affairs Coordinator', 'sector_id' => $academicSectorId, 'authority_level' => 60],
                ['pos_code' => 'GAD_FOCAL', 'pos_name' => 'GAD Focal Person', 'sector_id' => $academicSectorId, 'authority_level' => 60],
                ['pos_code' => 'QAA_COORD', 'pos_name' => 'QAA Coordinator', 'sector_id' => $academicSectorId, 'authority_level' => 65],
                ['pos_code' => 'CLINICAL_COORD', 'pos_name' => 'Clinical Coordinator', 'sector_id' => $academicSectorId, 'authority_level' => 65],
                
                // Faculty
                ['pos_code' => 'FACULTY', 'pos_name' => 'Faculty', 'sector_id' => $academicSectorId, 'authority_level' => 50],
                ['pos_code' => 'LECTURER', 'pos_name' => 'Lecturer', 'sector_id' => $academicSectorId, 'authority_level' => 45],
                ['pos_code' => 'AFFILIATE_FAC', 'pos_name' => 'Affiliate Faculty', 'sector_id' => $academicSectorId, 'authority_level' => 45],
                ['pos_code' => 'VISIT_DEAN', 'pos_name' => 'Visiting Dean', 'sector_id' => $academicSectorId, 'authority_level' => 80],
                
                // Laboratory
                ['pos_code' => 'LAB_INCHARGE', 'pos_name' => 'Laboratory In-Charge', 'sector_id' => $academicSectorId, 'authority_level' => 55],
                ['pos_code' => 'COLLEGE_LIB', 'pos_name' => 'College Librarian', 'sector_id' => $academicSectorId, 'authority_level' => 55],
                
                // Support
                ['pos_code' => 'ADMIN_STAFF_ACAD', 'pos_name' => 'Administrative Staff', 'sector_id' => $academicSectorId, 'authority_level' => 40],
            ];

            // Administrative positions - Office Level
            $adminPositions = [
                // Directors
                ['pos_code' => 'DIRECTOR', 'pos_name' => 'Director', 'sector_id' => $adminSectorId, 'authority_level' => 80],
                ['pos_code' => 'ASST_DIRECTOR', 'pos_name' => 'Assistant Director', 'sector_id' => $adminSectorId, 'authority_level' => 75],
                
                // Chief Administrative Officers
                ['pos_code' => 'CAO_FIN', 'pos_name' => 'Chief Administrative Officer (Finance)', 'sector_id' => $adminSectorId, 'authority_level' => 85],
                ['pos_code' => 'CAO', 'pos_name' => 'Chief Administrative Officer', 'sector_id' => $adminSectorId, 'authority_level' => 85],
                
                // Supervising Officers
                ['pos_code' => 'SUP_ADMIN_OFF', 'pos_name' => 'Supervising Administrative Officer', 'sector_id' => $adminSectorId, 'authority_level' => 75],
                
                // Administrative Officers
                ['pos_code' => 'ADMIN_OFF_V', 'pos_name' => 'Administrative Officer V', 'sector_id' => $adminSectorId, 'authority_level' => 70],
                ['pos_code' => 'ADMIN_OFF_IV', 'pos_name' => 'Administrative Officer IV', 'sector_id' => $adminSectorId, 'authority_level' => 65],
                ['pos_code' => 'ADMIN_OFF_III', 'pos_name' => 'Administrative Officer III', 'sector_id' => $adminSectorId, 'authority_level' => 60],
                ['pos_code' => 'ADMIN_OFF_II', 'pos_name' => 'Administrative Officer II', 'sector_id' => $adminSectorId, 'authority_level' => 55],
                ['pos_code' => 'ADMIN_OFF_I', 'pos_name' => 'Administrative Officer I', 'sector_id' => $adminSectorId, 'authority_level' => 50],
                
                // Administrative Assistants
                ['pos_code' => 'ADMIN_ASST_V', 'pos_name' => 'Administrative Assistant V', 'sector_id' => $adminSectorId, 'authority_level' => 50],
                ['pos_code' => 'ADMIN_ASST_III', 'pos_name' => 'Administrative Assistant III', 'sector_id' => $adminSectorId, 'authority_level' => 45],
                ['pos_code' => 'ADMIN_ASST_II', 'pos_name' => 'Administrative Assistant II', 'sector_id' => $adminSectorId, 'authority_level' => 40],
                ['pos_code' => 'ADMIN_ASST_I', 'pos_name' => 'Administrative Assistant I', 'sector_id' => $adminSectorId, 'authority_level' => 35],
                
                // Administrative Aides
                ['pos_code' => 'ADMIN_AIDE_VI', 'pos_name' => 'Administrative Aide VI', 'sector_id' => $adminSectorId, 'authority_level' => 35],
                ['pos_code' => 'ADMIN_AIDE_IV', 'pos_name' => 'Administrative Aide IV', 'sector_id' => $adminSectorId, 'authority_level' => 30],
                ['pos_code' => 'ADMIN_AIDE_III', 'pos_name' => 'Administrative Aide III', 'sector_id' => $adminSectorId, 'authority_level' => 25],
                ['pos_code' => 'ADMIN_AIDE_I', 'pos_name' => 'Administrative Aide I', 'sector_id' => $adminSectorId, 'authority_level' => 20],
                
                // Specialized Positions - Finance
                ['pos_code' => 'ACCOUNTANT_III', 'pos_name' => 'Accountant III', 'sector_id' => $adminSectorId, 'authority_level' => 65],
                ['pos_code' => 'ACCOUNTANT_II', 'pos_name' => 'Accountant II', 'sector_id' => $adminSectorId, 'authority_level' => 60],
                ['pos_code' => 'BUDGET_OFF_IV', 'pos_name' => 'Budget Officer IV', 'sector_id' => $adminSectorId, 'authority_level' => 70],
                ['pos_code' => 'BUDGET_OFF_III', 'pos_name' => 'Budget Officer III', 'sector_id' => $adminSectorId, 'authority_level' => 65],
                ['pos_code' => 'BUDGET_OFF_II', 'pos_name' => 'Budget Officer II', 'sector_id' => $adminSectorId, 'authority_level' => 60],
                ['pos_code' => 'BUDGET_OFF_I', 'pos_name' => 'Budget Officer I', 'sector_id' => $adminSectorId, 'authority_level' => 55],
                ['pos_code' => 'CASHIER_III', 'pos_name' => 'Cashier III', 'sector_id' => $adminSectorId, 'authority_level' => 65],
                ['pos_code' => 'CASHIER_II', 'pos_name' => 'Cashier II', 'sector_id' => $adminSectorId, 'authority_level' => 60],
                ['pos_code' => 'COLLECT_OFF', 'pos_name' => 'Collecting Officer', 'sector_id' => $adminSectorId, 'authority_level' => 50],
                ['pos_code' => 'DISBURS_OFF', 'pos_name' => 'Disbursing Officer', 'sector_id' => $adminSectorId, 'authority_level' => 50],
                
                // Specialized Positions - HR/Legal
                ['pos_code' => 'HRMO_DIR', 'pos_name' => 'HRMO Director', 'sector_id' => $adminSectorId, 'authority_level' => 80],
                ['pos_code' => 'ATTORNEY_IV', 'pos_name' => 'Attorney IV', 'sector_id' => $adminSectorId, 'authority_level' => 75],
                ['pos_code' => 'LEGAL_ASST_III', 'pos_name' => 'Legal Assistant III', 'sector_id' => $adminSectorId, 'authority_level' => 55],
                ['pos_code' => 'LEGAL_ASST_II', 'pos_name' => 'Legal Assistant II', 'sector_id' => $adminSectorId, 'authority_level' => 50],
                
                // Specialized Positions - Audit
                ['pos_code' => 'INT_AUDITOR_III', 'pos_name' => 'Internal Auditor III', 'sector_id' => $adminSectorId, 'authority_level' => 65],
                ['pos_code' => 'INT_AUDITOR_II', 'pos_name' => 'Internal Auditor II', 'sector_id' => $adminSectorId, 'authority_level' => 60],
                ['pos_code' => 'INT_AUDITOR_I', 'pos_name' => 'Internal Auditor I', 'sector_id' => $adminSectorId, 'authority_level' => 55],
                
                // Specialized Positions - Registrar
                ['pos_code' => 'UNIV_REG', 'pos_name' => 'University Registrar', 'sector_id' => $adminSectorId, 'authority_level' => 75],
                ['pos_code' => 'REGISTRAR_III', 'pos_name' => 'Registrar III', 'sector_id' => $adminSectorId, 'authority_level' => 65],
                ['pos_code' => 'RECORDS_OFF_III', 'pos_name' => 'Records Officer III', 'sector_id' => $adminSectorId, 'authority_level' => 60],
                
                // Specialized Positions - Library
                ['pos_code' => 'LIB_DIR', 'pos_name' => 'Director, Library Services', 'sector_id' => $adminSectorId, 'authority_level' => 75],
                ['pos_code' => 'COLLEGE_LIB_I', 'pos_name' => 'College Librarian I', 'sector_id' => $adminSectorId, 'authority_level' => 60],
                
                // Specialized Positions - IT
                ['pos_code' => 'ICTC_DIR', 'pos_name' => 'ICTC Director', 'sector_id' => $adminSectorId, 'authority_level' => 80],
                ['pos_code' => 'COMP_PROG_I', 'pos_name' => 'Computer Programmer I', 'sector_id' => $adminSectorId, 'authority_level' => 55],
                
                // Specialized Positions - Engineering/Planning
                ['pos_code' => 'PROJ_DEV_OFF_III', 'pos_name' => 'Project Development Officer III', 'sector_id' => $adminSectorId, 'authority_level' => 70],
                ['pos_code' => 'PROJ_DEV_OFF_I', 'pos_name' => 'Project Development Officer I', 'sector_id' => $adminSectorId, 'authority_level' => 60],
                ['pos_code' => 'PLANNING_OFF_II', 'pos_name' => 'Planning Officer II', 'sector_id' => $adminSectorId, 'authority_level' => 65],
                ['pos_code' => 'ARCHITECT', 'pos_name' => 'Architect', 'sector_id' => $adminSectorId, 'authority_level' => 65],
                ['pos_code' => 'ENGINEER_I', 'pos_name' => 'Engineer I', 'sector_id' => $adminSectorId, 'authority_level' => 60],
                
                // Specialized Positions - Procurement
                ['pos_code' => 'PROC_OFF', 'pos_name' => 'Procurement Officer', 'sector_id' => $adminSectorId, 'authority_level' => 65],
                ['pos_code' => 'BAC_CHAIR', 'pos_name' => 'BAC Chairman', 'sector_id' => $adminSectorId, 'authority_level' => 75],
                ['pos_code' => 'BAC_VICE_CHAIR', 'pos_name' => 'BAC Vice-Chairman', 'sector_id' => $adminSectorId, 'authority_level' => 70],
                ['pos_code' => 'BAC_MEMBER', 'pos_name' => 'BAC Member', 'sector_id' => $adminSectorId, 'authority_level' => 60],
                
                // Specialized Positions - Health
                ['pos_code' => 'DENTIST_II', 'pos_name' => 'Dentist II', 'sector_id' => $adminSectorId, 'authority_level' => 65],
                ['pos_code' => 'NURSE_II', 'pos_name' => 'Nurse II', 'sector_id' => $adminSectorId, 'authority_level' => 60],
                ['pos_code' => 'NUTRI_DIET_II', 'pos_name' => 'Nutritionist Dietitian II', 'sector_id' => $adminSectorId, 'authority_level' => 60],
                ['pos_code' => 'UNIV_PSYCHO', 'pos_name' => 'University Psychometrician', 'sector_id' => $adminSectorId, 'authority_level' => 65],
                
                // Specialized Positions - Information
                ['pos_code' => 'INFO_OFF_III', 'pos_name' => 'Information Officer III', 'sector_id' => $adminSectorId, 'authority_level' => 65],
                ['pos_code' => 'INFO_OFF_I', 'pos_name' => 'Information Officer I', 'sector_id' => $adminSectorId, 'authority_level' => 55],
                
                // Specialized Positions - Research/Extension
                ['pos_code' => 'SR_AGRI', 'pos_name' => 'Senior Agriculturist', 'sector_id' => $adminSectorId, 'authority_level' => 65],
                
                // Support Staff
                ['pos_code' => 'EXEC_SEC', 'pos_name' => 'Executive Secretary', 'sector_id' => $adminSectorId, 'authority_level' => 70],
                ['pos_code' => 'SECRETARY', 'pos_name' => 'Secretary', 'sector_id' => $adminSectorId, 'authority_level' => 45],
                ['pos_code' => 'CLERK', 'pos_name' => 'Clerk', 'sector_id' => $adminSectorId, 'authority_level' => 30],
                ['pos_code' => 'STOREKEEPER', 'pos_name' => 'Storekeeper', 'sector_id' => $adminSectorId, 'authority_level' => 35],
                ['pos_code' => 'INSPECTOR', 'pos_name' => 'Inspector', 'sector_id' => $adminSectorId, 'authority_level' => 40],
                ['pos_code' => 'UTILITY', 'pos_name' => 'Utility', 'sector_id' => $adminSectorId, 'authority_level' => 15],
                ['pos_code' => 'DRIVER', 'pos_name' => 'Driver', 'sector_id' => $adminSectorId, 'authority_level' => 25],
                ['pos_code' => 'SECURITY_GUARD', 'pos_name' => 'Security Guard', 'sector_id' => $adminSectorId, 'authority_level' => 25],
                ['pos_code' => 'SKILLED_WORKER', 'pos_name' => 'Skilled Worker', 'sector_id' => $adminSectorId, 'authority_level' => 30],
                ['pos_code' => 'ELECTRICIAN', 'pos_name' => 'Electrician', 'sector_id' => $adminSectorId, 'authority_level' => 35],
                ['pos_code' => 'PLUMBER', 'pos_name' => 'Plumber', 'sector_id' => $adminSectorId, 'authority_level' => 35],
                ['pos_code' => 'JOB_ORDER', 'pos_name' => 'Job Order', 'sector_id' => $adminSectorId, 'authority_level' => 10],
            ];

            $allPositions = array_merge($systemWidePositions, $academicPositions, $adminPositions);

            foreach ($allPositions as $position) {
                DB::table('positions')->updateOrInsert(
                    ['pos_code' => $position['pos_code']],
                    array_merge($position, [
                        'description' => null,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ])
                );
            }
        });
    }
}
