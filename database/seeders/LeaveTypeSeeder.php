<?php

namespace Database\Seeders;

use App\Models\LeaveType;
use Illuminate\Database\Seeder;

/**
 * LeaveTypeSeeder - CSC Compliant
 * 
 * Based on Civil Service Commission (CSC) Omnibus Rules on Leave
 * and CS Form No. 6 (Revised 2020)
 * 
 * Leave Types as per CSC Rules:
 * - Vacation Leave (VL): 15 days/year, accrued 1.25 days/month
 * - Sick Leave (SL): 15 days/year, accrued 1.25 days/month
 * - Mandatory/Forced Leave (FL): 5 days/year, uses VL credits
 * - Special Privilege Leave (SPL): 3 days/year
 * - Maternity Leave (ML): 105 days (RA 11210)
 * - Paternity Leave (PL): 7 days (RA 8187)
 * - Solo Parent Leave: 7 days/year (RA 8972)
 * - VAWC Leave: 10 days (RA 9262)
 * - Special Leave Benefits for Women: Up to 2 months (RA 9710)
 * - Study Leave: Up to 6 months with pay
 * - Rehabilitation Privilege: Per case
 * - Special Emergency (Calamity) Leave: 5 days
 * - Adoption Leave: 60 days (RA 8552)
 * - Terminal Leave: Upon separation
 */
class LeaveTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $leaveTypes = [
            // 1. Vacation Leave (VL)
            [
                'name' => 'Vacation Leave',
                'code' => 'VL',
                'description' => 'Annual vacation leave for rest, recreation, and personal transactions. Accrued at 1.25 days per month of service.',
                'color' => '#3b82f6', // Blue
                'requires_approval' => true,
                'requires_medical_certificate' => false,
                'max_days_per_request' => null, // No limit per request
                'max_days_per_year' => null, // Cumulative, no yearly max
                'min_notice_days' => 5, // 5 days advance filing
                'can_carry_over' => true,
                'max_carry_over_days' => null, // Unlimited carry over
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 1,
                'gender_restriction' => 'all',
                'uses_credits_from' => null,
                'is_monetizable' => true,
                'is_special_leave' => false,
                'required_document' => null,
                'legal_basis' => 'CSC MC No. 41, s. 1998',
                'commutation_applicable' => true,
            ],
            // 2. Mandatory/Forced Leave (FL)
            [
                'name' => 'Mandatory/Forced Leave',
                'code' => 'FL',
                'description' => 'Mandatory leave of 5 working days annually for employees with 10 days or more VL credits. Uses VL credits.',
                'color' => '#6366f1', // Indigo
                'requires_approval' => true,
                'requires_medical_certificate' => false,
                'max_days_per_request' => 5,
                'max_days_per_year' => 5,
                'min_notice_days' => 5,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 2,
                'gender_restriction' => 'all',
                'uses_credits_from' => 'VL', // Uses VL credits
                'is_monetizable' => false,
                'is_special_leave' => false,
                'required_document' => null,
                'legal_basis' => 'CSC MC No. 41, s. 1998; EO 1077',
                'commutation_applicable' => false,
            ],
            // 3. Sick Leave (SL)
            [
                'name' => 'Sick Leave',
                'code' => 'SL',
                'description' => 'Leave for illness, injury, or medical/dental consultation. Accrued at 1.25 days per month of service.',
                'color' => '#ef4444', // Red
                'requires_approval' => true,
                'requires_medical_certificate' => true, // Required for 5+ days
                'max_days_per_request' => null,
                'max_days_per_year' => null, // Cumulative
                'min_notice_days' => 0, // Can be filed immediately
                'can_carry_over' => true,
                'max_carry_over_days' => null, // Unlimited
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 3,
                'gender_restriction' => 'all',
                'uses_credits_from' => null,
                'is_monetizable' => true,
                'is_special_leave' => false,
                'required_document' => 'Medical Certificate (if 5+ days)',
                'legal_basis' => 'CSC MC No. 41, s. 1998',
                'commutation_applicable' => true,
            ],
            // 4. Maternity Leave (ML)
            [
                'name' => 'Maternity Leave',
                'code' => 'ML',
                'description' => '105 calendar days maternity leave with full pay. Additional 15 days for solo parents. 60 days for miscarriage/emergency termination.',
                'color' => '#ec4899', // Pink
                'requires_approval' => true,
                'requires_medical_certificate' => true,
                'max_days_per_request' => 105,
                'max_days_per_year' => 105,
                'min_notice_days' => 30, // Pre-natal leave may be availed
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 4,
                'gender_restriction' => 'female',
                'uses_credits_from' => null,
                'is_monetizable' => false,
                'is_special_leave' => true,
                'required_document' => 'Medical Certificate, Birth Certificate of child',
                'legal_basis' => 'RA 11210 (105-Day Expanded Maternity Leave Law)',
                'commutation_applicable' => false,
            ],
            // 5. Paternity Leave (PL)
            [
                'name' => 'Paternity Leave',
                'code' => 'PL',
                'description' => '7 working days paternity leave for married male employees. Must be used within 60 days from childbirth.',
                'color' => '#06b6d4', // Cyan
                'requires_approval' => true,
                'requires_medical_certificate' => false,
                'max_days_per_request' => 7,
                'max_days_per_year' => 7,
                'min_notice_days' => 0,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 5,
                'gender_restriction' => 'male',
                'uses_credits_from' => null,
                'is_monetizable' => false,
                'is_special_leave' => true,
                'required_document' => 'Birth Certificate of child, Marriage Certificate',
                'legal_basis' => 'RA 8187 (Paternity Leave Act of 1996)',
                'commutation_applicable' => false,
            ],
            // 6. Special Privilege Leave (SPL)
            [
                'name' => 'Special Privilege Leave',
                'code' => 'SPL',
                'description' => '3 days per year for personal milestones, parental obligations, filial obligations, domestic emergencies, government transactions, or medical attention not covered by sick leave.',
                'color' => '#8b5cf6', // Violet
                'requires_approval' => true,
                'requires_medical_certificate' => false,
                'max_days_per_request' => 3,
                'max_days_per_year' => 3,
                'min_notice_days' => 1, // At least 1 week prior for non-emergency
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 6,
                'gender_restriction' => 'all',
                'uses_credits_from' => null,
                'is_monetizable' => false,
                'is_special_leave' => true,
                'required_document' => null,
                'legal_basis' => 'CSC MC No. 6, s. 1996',
                'commutation_applicable' => false,
            ],
            // 7. Solo Parent Leave
            [
                'name' => 'Solo Parent Leave',
                'code' => 'SoloP',
                'description' => '7 working days per year for solo parents. Cannot be converted to cash or carried over.',
                'color' => '#f59e0b', // Amber
                'requires_approval' => true,
                'requires_medical_certificate' => false,
                'max_days_per_request' => 7,
                'max_days_per_year' => 7,
                'min_notice_days' => 5,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 7,
                'gender_restriction' => 'all',
                'uses_credits_from' => null,
                'is_monetizable' => false,
                'is_special_leave' => true,
                'required_document' => 'Solo Parent ID',
                'legal_basis' => 'RA 8972 (Solo Parents Welfare Act)',
                'commutation_applicable' => false,
            ],
            // 8. Study Leave
            [
                'name' => 'Study Leave',
                'code' => 'Study',
                'description' => 'Up to 6 months with pay for employees completing masters degree, taking bar/board exams, or other short-term studies.',
                'color' => '#14b8a6', // Teal
                'requires_approval' => true,
                'requires_medical_certificate' => false,
                'max_days_per_request' => 180, // 6 months
                'max_days_per_year' => 180,
                'min_notice_days' => 30,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 8,
                'gender_restriction' => 'all',
                'uses_credits_from' => null,
                'is_monetizable' => false,
                'is_special_leave' => true,
                'required_document' => 'Enrollment proof, Study plan',
                'legal_basis' => 'CSC MC No. 21, s. 2004',
                'commutation_applicable' => false,
            ],
            // 9. VAWC Leave (Violence Against Women and Children)
            [
                'name' => '10-Day VAWC Leave',
                'code' => 'VAWC',
                'description' => '10-day paid leave for women employees who are victims of violence as defined under RA 9262.',
                'color' => '#f43f5e', // Rose
                'requires_approval' => true,
                'requires_medical_certificate' => false,
                'max_days_per_request' => 10,
                'max_days_per_year' => 10,
                'min_notice_days' => 0,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 9,
                'gender_restriction' => 'female',
                'uses_credits_from' => null,
                'is_monetizable' => false,
                'is_special_leave' => true,
                'required_document' => 'Barangay Protection Order, Police Report, or Medical Certificate',
                'legal_basis' => 'RA 9262 (Anti-VAWC Act of 2004)',
                'commutation_applicable' => false,
            ],
            // 10. Rehabilitation Privilege
            [
                'name' => 'Rehabilitation Privilege',
                'code' => 'Rehab',
                'description' => 'Leave for employees who sustained wounds or injuries while performing official duties.',
                'color' => '#22c55e', // Green
                'requires_approval' => true,
                'requires_medical_certificate' => true,
                'max_days_per_request' => null, // Depends on case
                'max_days_per_year' => null,
                'min_notice_days' => 0,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 10,
                'gender_restriction' => 'all',
                'uses_credits_from' => null,
                'is_monetizable' => false,
                'is_special_leave' => true,
                'required_document' => 'Medical Certificate, Incident Report',
                'legal_basis' => 'CSC MC No. 41, s. 1998',
                'commutation_applicable' => false,
            ],
            // 11. Special Leave Benefits for Women (Gynecological Leave)
            [
                'name' => 'Special Leave Benefits for Women',
                'code' => 'WSL',
                'description' => 'Up to 2 months leave with pay for women who underwent surgery due to gynecological disorders.',
                'color' => '#d946ef', // Fuchsia
                'requires_approval' => true,
                'requires_medical_certificate' => true,
                'max_days_per_request' => 60, // 2 months
                'max_days_per_year' => 60,
                'min_notice_days' => 0,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 11,
                'gender_restriction' => 'female',
                'uses_credits_from' => null,
                'is_monetizable' => false,
                'is_special_leave' => true,
                'required_document' => 'Medical Certificate, Hospital records',
                'legal_basis' => 'RA 9710 (Magna Carta of Women)',
                'commutation_applicable' => false,
            ],
            // 12. Special Emergency (Calamity) Leave
            [
                'name' => 'Special Emergency (Calamity) Leave',
                'code' => 'CL',
                'description' => '5 working days for employees directly affected by natural calamity/disaster as declared by NDRRMC.',
                'color' => '#ea580c', // Orange
                'requires_approval' => true,
                'requires_medical_certificate' => false,
                'max_days_per_request' => 5,
                'max_days_per_year' => 5,
                'min_notice_days' => 0,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 12,
                'gender_restriction' => 'all',
                'uses_credits_from' => null,
                'is_monetizable' => false,
                'is_special_leave' => true,
                'required_document' => 'Certification from Barangay, DSWD, or local DRRM office',
                'legal_basis' => 'CSC MC No. 2, s. 2012',
                'commutation_applicable' => false,
            ],
            // 13. Adoption Leave
            [
                'name' => 'Adoption Leave',
                'code' => 'Adopt',
                'description' => '60 days leave for female employees who legally adopt a child below 7 years old.',
                'color' => '#a855f7', // Purple
                'requires_approval' => true,
                'requires_medical_certificate' => false,
                'max_days_per_request' => 60,
                'max_days_per_year' => 60,
                'min_notice_days' => 7,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 13,
                'gender_restriction' => 'female',
                'uses_credits_from' => null,
                'is_monetizable' => false,
                'is_special_leave' => true,
                'required_document' => 'DSWD Pre-Adoption Placement Authority, Adoption Decree',
                'legal_basis' => 'RA 8552 (Domestic Adoption Act)',
                'commutation_applicable' => false,
            ],
            // 14. Terminal Leave
            [
                'name' => 'Terminal Leave',
                'code' => 'TL',
                'description' => 'Leave applied upon separation from service to monetize unused leave credits.',
                'color' => '#64748b', // Slate
                'requires_approval' => true,
                'requires_medical_certificate' => false,
                'max_days_per_request' => null,
                'max_days_per_year' => null,
                'min_notice_days' => 30,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 14,
                'gender_restriction' => 'all',
                'uses_credits_from' => null,
                'is_monetizable' => true,
                'is_special_leave' => false,
                'required_document' => 'Resignation/Retirement letter, Clearance',
                'legal_basis' => 'CSC MC No. 41, s. 1998',
                'commutation_applicable' => true,
            ],
        ];

        foreach ($leaveTypes as $leaveType) {
            LeaveType::updateOrCreate(
                ['code' => $leaveType['code']],
                $leaveType
            );
        }

        $this->command->info('✓ CSC-compliant leave types seeded successfully');
    }
}
