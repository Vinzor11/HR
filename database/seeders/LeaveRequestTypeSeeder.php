<?php

namespace Database\Seeders;

use App\Models\RequestType;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

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
                'description' => 'CSC Form No. 6 compliant leave request covering Vacation, Sick, and Special Philippine leave types.',
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

        $this->command->info('✅ Leave Request type created/updated successfully.');
    }

    protected function buildApprovalSteps(): array
    {
        // Note: Roles should be created manually in the Roles module
        // This seeder uses role-based approval but doesn't create roles
        // You can configure specific users or roles via the Dynamic Builder UI after creation

        return [
            [
                'name' => 'Immediate Supervisor Review',
                'description' => 'Validates schedule, ensures classes/mandates are covered before forwarding to HR.',
                'approvers' => [
                    // Approvers should be configured via Dynamic Builder UI
                    // This can be role-based or user-specific based on your organization structure
                ],
                'sort_order' => 0,
            ],
            [
                'name' => 'HR Validation',
                'description' => 'Checks leave credits, attachments, and statutory compliance prior to approval.',
                'approvers' => [
                    // Approvers should be configured via Dynamic Builder UI
                    // This can be role-based or user-specific based on your organization structure
                ],
                'sort_order' => 1,
            ],
        ];
    }

    protected function fieldDefinitions(): array
    {
        return [
            [
                'field_key' => 'leave_type',
                'label' => 'Leave Type',
                'field_type' => 'dropdown',
                'is_required' => true,
                'description' => 'Select leave type in accordance with CSC Form 6 categories.',
                'options' => [
                    ['label' => 'Vacation Leave (VL)', 'value' => 'VAC'],
                    ['label' => 'Sick Leave (SL)', 'value' => 'SICK'],
                    ['label' => 'Personal Leave (PL)', 'value' => 'PER'],
                    ['label' => 'Emergency Leave', 'value' => 'EMER'],
                    ['label' => 'Maternity Leave', 'value' => 'MAT'],
                    ['label' => 'Paternity Leave', 'value' => 'PAT'],
                ],
            ],
            [
                'field_key' => 'start_date',
                'label' => 'Inclusive Start Date',
                'field_type' => 'date',
                'is_required' => true,
                'description' => 'Date when leave will commence.',
                'options' => null,
            ],
            [
                'field_key' => 'end_date',
                'label' => 'Inclusive End Date',
                'field_type' => 'date',
                'is_required' => true,
                'description' => 'Date when leave ends (include date of reporting back).',
                'options' => null,
            ],
            [
                'field_key' => 'total_days',
                'label' => 'Total Working Days Applied',
                'field_type' => 'number',
                'is_required' => true,
                'description' => 'Exclude weekends and legal holidays. Encode half-day as 0.5.',
                'options' => null,
            ],
            [
                'field_key' => 'reason',
                'label' => 'Reason / Specific Purpose',
                'field_type' => 'textarea',
                'is_required' => true,
                'description' => 'Briefly describe the purpose of the leave. For SL indicate type of illness.',
                'options' => null,
            ],
            [
                'field_key' => 'leave_location',
                'label' => 'Place Where Leave Will Be Spent',
                'field_type' => 'text',
                'is_required' => true,
                'description' => 'For VL indicate whether within Philippines or abroad; for SL indicate confinement/home address.',
                'options' => null,
            ],
            [
                'field_key' => 'contact_number',
                'label' => 'Contact Number While on Leave',
                'field_type' => 'text',
                'is_required' => true,
                'description' => 'Mobile number where employee may be reached while on leave.',
                'options' => null,
            ],
            [
                'field_key' => 'contact_person',
                'label' => 'Contact Person / Immediate Supervisor',
                'field_type' => 'text',
                'is_required' => false,
                'description' => 'Name of person who can help reach the employee during the leave period.',
                'options' => null,
            ],
            [
                'field_key' => 'coverage_plan',
                'label' => 'Work Coverage / Handover Plan',
                'field_type' => 'textarea',
                'is_required' => true,
                'description' => 'Outline how duties will be covered while on leave (e.g., substitute teacher, delegation).',
                'options' => null,
            ],
            [
                'field_key' => 'is_with_pay',
                'label' => 'With Pay?',
                'field_type' => 'dropdown',
                'is_required' => true,
                'description' => 'Indicate if leave credits will be used or if filing as leave without pay.',
                'options' => [
                    ['label' => 'With Pay (charge to leave credits)', 'value' => 'with_pay'],
                    ['label' => 'Without Pay (no credits available)', 'value' => 'without_pay'],
                ],
            ],
            [
                'field_key' => 'is_emergency',
                'label' => 'Emergency Leave Declaration',
                'field_type' => 'checkbox',
                'is_required' => false,
                'description' => 'Tick if filed after the fact due to emergency (automatic supporting document request).',
                'options' => null,
            ],
            [
                'field_key' => 'supporting_documents',
                'label' => 'Supporting Documents (CS Form 6 Attachments)',
                'field_type' => 'file',
                'is_required' => false,
                'description' => 'Attach travel authority, court summons, or other proof. Multiple files may be zipped.',
                'options' => null,
            ],
            [
                'field_key' => 'medical_certificate',
                'label' => 'Medical Certificate',
                'field_type' => 'file',
                'is_required' => false,
                'description' => 'Required for sick leave of three (3) days or more.',
                'options' => null,
            ],
            [
                'field_key' => 'remarks',
                'label' => 'Additional Notes to HR',
                'field_type' => 'textarea',
                'is_required' => false,
                'description' => 'Optional remarks or clarifications for HR.',
                'options' => null,
            ],
        ];
    }
}


