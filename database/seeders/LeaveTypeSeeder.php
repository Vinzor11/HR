<?php

namespace Database\Seeders;

use App\Models\LeaveType;
use Illuminate\Database\Seeder;

class LeaveTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $leaveTypes = [
            [
                'name' => 'Vacation Leave',
                'code' => 'VAC',
                'description' => 'Annual vacation leave for rest and recreation',
                'color' => '#3b82f6',
                'requires_approval' => true,
                'requires_medical_certificate' => false,
                'max_days_per_request' => 15,
                'max_days_per_year' => 15,
                'min_notice_days' => 3,
                'can_carry_over' => true,
                'max_carry_over_days' => 5,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Sick Leave',
                'code' => 'SICK',
                'description' => 'Leave for illness or medical appointments',
                'color' => '#ef4444',
                'requires_approval' => true,
                'requires_medical_certificate' => true,
                'max_days_per_request' => 5,
                'max_days_per_year' => 15,
                'min_notice_days' => 0,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Personal Leave',
                'code' => 'PER',
                'description' => 'Personal leave for personal matters',
                'color' => '#8b5cf6',
                'requires_approval' => true,
                'requires_medical_certificate' => false,
                'max_days_per_request' => 3,
                'max_days_per_year' => 5,
                'min_notice_days' => 2,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Maternity Leave',
                'code' => 'MAT',
                'description' => 'Maternity leave for expecting mothers',
                'color' => '#ec4899',
                'requires_approval' => true,
                'requires_medical_certificate' => true,
                'max_days_per_request' => 105,
                'max_days_per_year' => 105,
                'min_notice_days' => 30,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'Paternity Leave',
                'code' => 'PAT',
                'description' => 'Paternity leave for new fathers',
                'color' => '#06b6d4',
                'requires_approval' => true,
                'requires_medical_certificate' => false,
                'max_days_per_request' => 7,
                'max_days_per_year' => 7,
                'min_notice_days' => 7,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 5,
            ],
            [
                'name' => 'Emergency Leave',
                'code' => 'EMER',
                'description' => 'Emergency leave for urgent personal matters',
                'color' => '#f59e0b',
                'requires_approval' => true,
                'requires_medical_certificate' => false,
                'max_days_per_request' => 3,
                'max_days_per_year' => 5,
                'min_notice_days' => 0,
                'can_carry_over' => false,
                'max_carry_over_days' => null,
                'is_paid' => true,
                'is_active' => true,
                'sort_order' => 6,
            ],
        ];

        foreach ($leaveTypes as $leaveType) {
            LeaveType::updateOrCreate(
                ['code' => $leaveType['code']],
                $leaveType
            );
        }
    }
}



