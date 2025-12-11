<?php

namespace Database\Seeders;

use App\Models\RequestType;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * LeaveRequestTypeSeeder - CS Form No. 6 Compliant
 * 
 * Based on Civil Service Commission (CSC) CS Form No. 6 (Revised 2020)
 * Application for Leave
 */
class LeaveRequestTypeSeeder extends Seeder
{
    public function run(): void
    {
        $creator = User::first();

        if (!$creator) {
            $creator = User::factory()->create([
                'name' => 'System Administrator',
                'email' => 'admin@leave.local',
                'password' => bcrypt('password'),
            ]);
        }

        DB::transaction(function () use ($creator) {
            $approvalSteps = $this->buildApprovalSteps();

            $requestType = RequestType::withTrashed()->firstOrNew(['name' => 'Leave Request']);

            if ($requestType->exists && $requestType->trashed()) {
                $requestType->restore();
            }

            $requestType->fill([
                'created_by' => $requestType->created_by ?? $creator->id,
                'description' => 'CS Form No. 6 (Revised 2020) - Application for Leave. Covers all CSC-mandated leave types including Vacation, Sick, Special Privilege, Maternity, Paternity, and other special leaves.',
                'has_fulfillment' => false,
                'approval_steps' => $approvalSteps,
                'is_published' => true,
                'published_at' => now(),
            ]);

            $requestType->save();

            // Rebuild fields to ensure latest structure
            $requestType->fields()->delete();

            $fields = $this->fieldDefinitions();

            foreach ($fields as $index => $field) {
                $requestType->fields()->create([
                    ...$field,
                    'sort_order' => $index,
                ]);
            }
        });

        $this->command->info('✅ CS Form No. 6 Leave Request type created/updated successfully.');
    }

    protected function buildApprovalSteps(): array
    {
        return [
            [
                'name' => 'Immediate Supervisor Recommendation',
                'description' => 'Section 8.A - Supervisor reviews leave application and provides recommendation for approval/disapproval.',
                'approvers' => [],
                'sort_order' => 0,
            ],
            [
                'name' => 'HR Leave Credits Certification',
                'description' => 'Section 7 - HR certifies leave credits as of filing date and validates compliance with CSC rules.',
                'approvers' => [],
                'sort_order' => 1,
            ],
            [
                'name' => 'Authorized Official Approval',
                'description' => 'Section 8.B - Final approval/disapproval by authorized official (Head of Office/Agency).',
                'approvers' => [],
                'sort_order' => 2,
            ],
        ];
    }

    protected function fieldDefinitions(): array
    {
        return [
            // ===== Header / Employee Information (Auto-filled from profile) =====
            [
                'field_key' => 'employee_name',
                'label' => 'Employee Name (Auto-filled)',
                'field_type' => 'text',
                'is_required' => true,
                'description' => 'Auto-filled from your employee profile.',
                'options' => null,
            ],
            [
                'field_key' => 'department_office',
                'label' => 'Department/Office (Auto-filled)',
                'field_type' => 'text',
                'is_required' => true,
                'description' => 'Auto-filled from your employee record.',
                'options' => null,
            ],
            [
                'field_key' => 'position_title',
                'label' => 'Position Title (Auto-filled)',
                'field_type' => 'text',
                'is_required' => true,
                'description' => 'Auto-filled from your employee record.',
                'options' => null,
            ],
            [
                'field_key' => 'salary',
                'label' => 'Salary (Auto-filled)',
                'field_type' => 'text',
                'is_required' => false,
                'description' => 'Auto-filled from your employee record.',
                'options' => null,
            ],
            [
                'field_key' => 'date_of_filing',
                'label' => 'Date of Filing (Auto-filled)',
                'field_type' => 'text',
                'is_required' => true,
                'description' => 'Auto-filled with today\'s date.',
                'options' => null,
            ],
            
            // ===== Section 5: Type of Leave to be Availed Of =====
            [
                'field_key' => 'leave_type',
                'label' => '5. TYPE OF LEAVE TO BE AVAILED OF',
                'field_type' => 'dropdown',
                'is_required' => true,
                'description' => 'Select leave type per CS Form No. 6 categories',
                'options' => [
                    // Credit-based leaves
                    ['label' => 'Vacation Leave (Sec. 51, Rule XVI, Omnibus Rules)', 'value' => 'VL'],
                    ['label' => 'Mandatory/Forced Leave (Sec. 25, Rule XVI)', 'value' => 'FL'],
                    ['label' => 'Sick Leave (Sec. 43, Rule XVI)', 'value' => 'SL'],
                    // Special leaves
                    ['label' => 'Maternity Leave (RA 11210)', 'value' => 'ML'],
                    ['label' => 'Paternity Leave (RA 8187)', 'value' => 'PL'],
                    ['label' => 'Special Privilege Leave (Sec. 21, Rule XVI)', 'value' => 'SPL'],
                    ['label' => 'Solo Parent Leave (RA 8972)', 'value' => 'SoloP'],
                    ['label' => 'Study Leave (Sec. 68, Rule XVI)', 'value' => 'Study'],
                    ['label' => '10-Day VAWC Leave (RA 9262)', 'value' => 'VAWC'],
                    ['label' => 'Rehabilitation Privilege (Sec. 55, Rule XVI)', 'value' => 'Rehab'],
                    ['label' => 'Special Leave Benefits for Women (RA 9710)', 'value' => 'WSL'],
                    ['label' => 'Special Emergency (Calamity) Leave (CSC MC 2, s.2012)', 'value' => 'CL'],
                    ['label' => 'Adoption Leave (RA 8552)', 'value' => 'Adopt'],
                    ['label' => 'Others (specify below)', 'value' => 'OTHER'],
                ],
            ],
            [
                'field_key' => 'other_leave_specify',
                'label' => 'If Others, please specify',
                'field_type' => 'text',
                'is_required' => false,
                'description' => 'Specify the type of leave if "Others" is selected',
                'options' => null,
            ],

            // ===== Section 6: Details of Leave =====
            // 6.A - Vacation/Special Privilege Leave
            [
                'field_key' => 'leave_location',
                'label' => '6.A. LOCATION (For Vacation/SPL)',
                'field_type' => 'dropdown',
                'is_required' => false,
                'description' => 'Where leave will be spent (required for VL/SPL)',
                'options' => [
                    ['label' => 'Within the Philippines', 'value' => 'within_philippines'],
                    ['label' => 'Abroad (specify country)', 'value' => 'abroad'],
                ],
            ],
            [
                'field_key' => 'location_details',
                'label' => 'Specify Location/Address',
                'field_type' => 'text',
                'is_required' => false,
                'description' => 'Specific address or country if abroad',
                'options' => null,
            ],

            // 6.B - Sick Leave
            [
                'field_key' => 'sick_leave_type',
                'label' => '6.B. SICK LEAVE TYPE',
                'field_type' => 'dropdown',
                'is_required' => false,
                'description' => 'Required for Sick Leave applications',
                'options' => [
                    ['label' => 'In Hospital (specify illness)', 'value' => 'in_hospital'],
                    ['label' => 'Out Patient (specify illness)', 'value' => 'out_patient'],
                ],
            ],
            [
                'field_key' => 'illness_description',
                'label' => 'Illness/Diagnosis',
                'field_type' => 'text',
                'is_required' => false,
                'description' => 'Specify illness for sick leave',
                'options' => null,
            ],

            // 6.C - Special Leave Benefits for Women
            [
                'field_key' => 'women_special_illness',
                'label' => '6.C. SPECIAL LEAVE FOR WOMEN - Specify Illness',
                'field_type' => 'text',
                'is_required' => false,
                'description' => 'Required for Special Leave Benefits for Women (gynecological disorder)',
                'options' => null,
            ],

            // 6.D - Study Leave
            [
                'field_key' => 'study_leave_type',
                'label' => '6.D. STUDY LEAVE PURPOSE',
                'field_type' => 'dropdown',
                'is_required' => false,
                'description' => 'Purpose of study leave',
                'options' => [
                    ['label' => 'Completion of Master\'s Degree', 'value' => 'completion_masters'],
                    ['label' => 'BAR/Board Examination Review', 'value' => 'bar_board_exam'],
                    ['label' => 'Other purpose (specify)', 'value' => 'other'],
                ],
            ],
            [
                'field_key' => 'study_leave_details',
                'label' => 'Study Leave Details',
                'field_type' => 'text',
                'is_required' => false,
                'description' => 'Specify course/examination details',
                'options' => null,
            ],

            // 6.E - Other Purpose (Monetization, Terminal)
            [
                'field_key' => 'other_purpose_type',
                'label' => '6.E. OTHER PURPOSE',
                'field_type' => 'dropdown',
                'is_required' => false,
                'description' => 'For monetization or terminal leave',
                'options' => [
                    ['label' => 'Monetization of Leave Credits', 'value' => 'monetization'],
                    ['label' => 'Terminal Leave', 'value' => 'terminal_leave'],
                ],
            ],

            // ===== Inclusive Dates =====
            [
                'field_key' => 'start_date',
                'label' => 'INCLUSIVE DATE - Start',
                'field_type' => 'date',
                'is_required' => true,
                'description' => 'First day of leave',
                'options' => null,
            ],
            [
                'field_key' => 'end_date',
                'label' => 'INCLUSIVE DATE - End',
                'field_type' => 'date',
                'is_required' => true,
                'description' => 'Last day of leave',
                'options' => null,
            ],
            [
                'field_key' => 'total_days',
                'label' => 'NUMBER OF WORKING DAYS APPLIED FOR',
                'field_type' => 'number',
                'is_required' => true,
                'description' => 'Total working days (excluding weekends and holidays). Use 0.5 for half-day.',
                'options' => null,
            ],

            // ===== Commutation =====
            [
                'field_key' => 'commutation_requested',
                'label' => 'COMMUTATION',
                'field_type' => 'dropdown',
                'is_required' => true,
                'description' => 'Request for commutation of leave (applicable for VL/SL)',
                'options' => [
                    ['label' => 'Not Requested', 'value' => 'not_requested'],
                    ['label' => 'Requested', 'value' => 'requested'],
                ],
            ],

            // ===== Additional Information =====
            [
                'field_key' => 'reason',
                'label' => 'REASON/PURPOSE FOR LEAVE',
                'field_type' => 'textarea',
                'is_required' => true,
                'description' => 'Detailed reason for applying for leave',
                'options' => null,
            ],
            [
                'field_key' => 'contact_number',
                'label' => 'Contact Number While on Leave',
                'field_type' => 'text',
                'is_required' => true,
                'description' => 'Mobile number where employee may be reached',
                'options' => null,
            ],
            [
                'field_key' => 'contact_address',
                'label' => 'Address While on Leave',
                'field_type' => 'text',
                'is_required' => false,
                'description' => 'Address where employee can be contacted during leave',
                'options' => null,
            ],

            // ===== Supporting Documents =====
            [
                'field_key' => 'medical_certificate',
                'label' => 'Medical Certificate',
                'field_type' => 'file',
                'is_required' => false,
                'description' => 'Required for sick leave of 5 days or more. Upload scanned copy.',
                'options' => null,
            ],
            [
                'field_key' => 'supporting_documents',
                'label' => 'Other Supporting Documents',
                'field_type' => 'file',
                'is_required' => false,
                'description' => 'Travel authority, court summons, birth certificate (for maternity/paternity), Solo Parent ID, etc.',
                'options' => null,
            ],

            // ===== Declaration =====
            [
                'field_key' => 'declaration',
                'label' => 'Declaration',
                'field_type' => 'checkbox',
                'is_required' => true,
                'description' => 'I hereby certify that the information provided above is true and correct.',
                'options' => null,
            ],
        ];
    }
}
