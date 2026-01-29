<?php

namespace Database\Seeders;

use App\Models\Position;
use App\Models\UnitPosition;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UnitPositionSeeder extends Seeder
{
    /**
     * Seed unit-position whitelist based on strict organizational rules.
     * 
     * STRICT RULES:
     * 1. College units: Only academic leadership and faculty positions
     * 2. Program units: Only program-level positions (heads, coordinators, faculty)
     * 3. Office units: Only administrative positions
     * 4. System-wide positions (President, VPs) can be assigned anywhere
     * 
     * This whitelist enforces that employees can only be assigned to positions
     * that are appropriate for their unit type.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Clear existing whitelist to ensure strict rules
            // UnitPosition::truncate(); // Uncomment if you want to reset

            // ============================================
            // COLLEGE UNIT POSITIONS (Academic Leadership)
            // ============================================
            // Only positions that make sense at the college level
            $collegePositions = [
                // College Leadership
                'COLLEGE_DEAN',      // College Dean
                'ASSOC_DEAN',        // Associate Dean
                'COLLEGE_SEC',       // College Secretary
                'VISIT_DEAN',        // Visiting Dean
                
                // College-level Coordinators
                'RES_COORD',         // Research Coordinator
                'EXT_COORD',         // Extension Coordinator
                'QAA_COORD',         // QAA Coordinator
                'GAD_FOCAL',         // GAD Focal Person
                
                // Faculty (can be at college level for general assignment)
                'FACULTY',           // Faculty
                'LECTURER',          // Lecturer
                'AFFILIATE_FAC',     // Affiliate Faculty
                
                // College Support
                'COLLEGE_LIB',       // College Librarian
                'LAB_INCHARGE',      // Laboratory In-Charge
                'ADMIN_STAFF_ACAD',  // Administrative Staff (Academic)
            ];

            // ============================================
            // PROGRAM UNIT POSITIONS (Program-Level Only)
            // ============================================
            // Positions specific to academic programs under colleges
            $programPositions = [
                // Program Leadership
                'PROG_HEAD',         // Program Head
                
                // Program Coordinators
                'OJT_COORD',         // OJT Coordinator
                'INTERN_COORD',      // Internship Coordinator
                'STUD_SERV_COORD',   // Student Services Coordinator
                'ALUMNI_COORD',      // Alumni Affairs Coordinator
                'CLINICAL_COORD',    // Clinical Coordinator (for Nursing, etc.)
                'RES_COORD',         // Research Coordinator
                'EXT_COORD',         // Extension Coordinator
                
                // Teaching Staff
                'FACULTY',           // Faculty
                'LECTURER',          // Lecturer
                'AFFILIATE_FAC',     // Affiliate Faculty
                
                // Program Support
                'LAB_INCHARGE',      // Laboratory In-Charge
                'ADMIN_STAFF_ACAD',  // Administrative Staff (Academic)
            ];

            // ============================================
            // OFFICE UNIT POSITIONS (Administrative Only)
            // ============================================
            // Only administrative positions for office units
            $officePositions = [
                // Office Leadership
                'DIRECTOR',          // Director
                'ASST_DIRECTOR',     // Assistant Director
                
                // Chief Administrative Officers
                'CAO',               // Chief Administrative Officer
                'CAO_FIN',           // Chief Administrative Officer (Finance)
                
                // Supervising Officers
                'SUP_ADMIN_OFF',     // Supervising Administrative Officer
                
                // Administrative Officers (I-V)
                'ADMIN_OFF_V',       // Administrative Officer V
                'ADMIN_OFF_IV',      // Administrative Officer IV
                'ADMIN_OFF_III',     // Administrative Officer III
                'ADMIN_OFF_II',      // Administrative Officer II
                'ADMIN_OFF_I',       // Administrative Officer I
                
                // Administrative Assistants
                'ADMIN_ASST_V',      // Administrative Assistant V
                'ADMIN_ASST_III',    // Administrative Assistant III
                'ADMIN_ASST_II',     // Administrative Assistant II
                'ADMIN_ASST_I',      // Administrative Assistant I
                
                // Administrative Aides
                'ADMIN_AIDE_VI',     // Administrative Aide VI
                'ADMIN_AIDE_IV',     // Administrative Aide IV
                'ADMIN_AIDE_III',    // Administrative Aide III
                'ADMIN_AIDE_I',      // Administrative Aide I
                
                // Specialized - Finance
                'ACCOUNTANT_III',    // Accountant III
                'ACCOUNTANT_II',     // Accountant II
                'BUDGET_OFF_IV',     // Budget Officer IV
                'BUDGET_OFF_III',    // Budget Officer III
                'BUDGET_OFF_II',     // Budget Officer II
                'BUDGET_OFF_I',      // Budget Officer I
                'CASHIER_III',       // Cashier III
                'CASHIER_II',        // Cashier II
                'COLLECT_OFF',       // Collecting Officer
                'DISBURS_OFF',       // Disbursing Officer
                
                // Specialized - HR/Legal
                'HRMO_DIR',          // HRMO Director
                'ATTORNEY_IV',       // Attorney IV
                'LEGAL_ASST_III',    // Legal Assistant III
                'LEGAL_ASST_II',     // Legal Assistant II
                
                // Specialized - Audit
                'INT_AUDITOR_III',   // Internal Auditor III
                'INT_AUDITOR_II',    // Internal Auditor II
                'INT_AUDITOR_I',     // Internal Auditor I
                
                // Specialized - Registrar/Records
                'UNIV_REG',          // University Registrar
                'REGISTRAR_III',     // Registrar III
                'RECORDS_OFF_III',   // Records Officer III
                
                // Specialized - Library
                'LIB_DIR',           // Director, Library Services
                'COLLEGE_LIB_I',     // College Librarian I
                
                // Specialized - IT
                'ICTC_DIR',          // ICTC Director
                'COMP_PROG_I',       // Computer Programmer I
                
                // Specialized - Engineering/Planning
                'PROJ_DEV_OFF_III',  // Project Development Officer III
                'PROJ_DEV_OFF_I',    // Project Development Officer I
                'PLANNING_OFF_II',   // Planning Officer II
                'ARCHITECT',         // Architect
                'ENGINEER_I',        // Engineer I
                
                // Specialized - Procurement
                'PROC_OFF',          // Procurement Officer
                'BAC_CHAIR',         // BAC Chairman
                'BAC_VICE_CHAIR',    // BAC Vice-Chairman
                'BAC_MEMBER',        // BAC Member
                
                // Specialized - Health
                'DENTIST_II',        // Dentist II
                'NURSE_II',          // Nurse II
                'NUTRI_DIET_II',     // Nutritionist Dietitian II
                'UNIV_PSYCHO',       // University Psychometrician
                
                // Specialized - Information
                'INFO_OFF_III',      // Information Officer III
                'INFO_OFF_I',        // Information Officer I
                
                // Specialized - Agriculture/Research
                'SR_AGRI',           // Senior Agriculturist
                
                // Support Staff
                'EXEC_SEC',          // Executive Secretary
                'SECRETARY',         // Secretary
                'CLERK',             // Clerk
                'STOREKEEPER',       // Storekeeper
                'INSPECTOR',         // Inspector
                'UTILITY',           // Utility
                'DRIVER',            // Driver
                'SECURITY_GUARD',    // Security Guard
                'SKILLED_WORKER',    // Skilled Worker
                'ELECTRICIAN',       // Electrician
                'PLUMBER',           // Plumber
                'JOB_ORDER',         // Job Order
            ];

            // ============================================
            // SYSTEM-WIDE POSITIONS (Can be assigned anywhere)
            // ============================================
            // Top leadership positions that transcend unit types
            $systemWidePositions = [
                'UNIV_PRES',         // University President
                'SUC_PRES_III',      // SUC President III
                'VP_ACAD',           // Vice President for Academic Affairs
                'VP_ADMIN',          // Vice President for Administration
                'VP_RES_EXT',        // Vice President for Research and Extension
                'VP_EXT_QA',         // Vice President for External Affairs and Quality Assurance
                'BOARD_SEC_V',       // Board Secretary V
                'BOARD_SEC_I',       // Board Secretary I
            ];

            // Seed positions for each unit type
            $this->seedPositionsForUnitType('college', array_merge($collegePositions, $systemWidePositions));
            $this->seedPositionsForUnitType('program', array_merge($programPositions, $systemWidePositions));
            $this->seedPositionsForUnitType('office', array_merge($officePositions, $systemWidePositions));

            $this->command->info('Unit-Position whitelist seeded successfully with strict rules!');
            $this->command->info('  - College positions: ' . count($collegePositions) . ' + ' . count($systemWidePositions) . ' system-wide');
            $this->command->info('  - Program positions: ' . count($programPositions) . ' + ' . count($systemWidePositions) . ' system-wide');
            $this->command->info('  - Office positions: ' . count($officePositions) . ' + ' . count($systemWidePositions) . ' system-wide');
        });
    }

    /**
     * Seed positions for a specific unit type
     * 
     * @param string $unitType The unit type (college, program, office)
     * @param array $positionCodes Array of position codes to whitelist
     */
    protected function seedPositionsForUnitType(string $unitType, array $positionCodes): void
    {
        $seeded = 0;
        $skipped = 0;

        foreach ($positionCodes as $code) {
            $position = Position::where('pos_code', $code)->first();
            
            if ($position) {
                UnitPosition::updateOrInsert(
                    [
                        'unit_type' => $unitType,
                        'position_id' => $position->id,
                    ],
                    [
                        'is_active' => true,
                        'description' => "Whitelisted: {$position->pos_name} for {$unitType} units",
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
                $seeded++;
            } else {
                $skipped++;
                $this->command->warn("  Position code '{$code}' not found in positions table - skipped for {$unitType}");
            }
        }

        $this->command->line("  {$unitType}: {$seeded} positions whitelisted, {$skipped} skipped");
    }
}
