<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Support\Facades\DB;

/**
 * Seeds default functional roles for the HR system.
 * 
 * IMPORTANT: Roles are NOT the same as Positions.
 * - Positions = Job titles in org structure (Dean, Accountant, etc.) - used for HR/payroll
 * - Roles = Permission groupings for system access - used for controlling app features
 * 
 * A Dean and a Director might both get the "Unit Head" role because they need
 * the same system access, even though they have different positions.
 * 
 * Role Assignment Guide:
 * ┌─────────────────┬────────────────────────────────────────────────────────┐
 * │ Role            │ Assign To                                              │
 * ├─────────────────┼────────────────────────────────────────────────────────┤
 * │ HR Director     │ HRMO Director, CAO, VP Admin                           │
 * │ HR Staff        │ Admin Officers/Assistants in HRMO                      │
 * │ Unit Head       │ Deans, Directors, Program Heads                        │
 * │ Training Coord  │ Designated training coordinators                       │
 * │ Basic Employee  │ All other employees (default)                          │
 * └─────────────────┴────────────────────────────────────────────────────────┘
 */
class DefaultRolesSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Creating default functional roles...');

        DB::transaction(function () {
            // Define roles with their permissions
            $roles = $this->getRoleDefinitions();

            foreach ($roles as $roleData) {
                $role = Role::updateOrCreate(
                    [
                        'name' => $roleData['name'],
                        'guard_name' => 'web',
                    ],
                    [
                        'label' => $roleData['label'],
                        'description' => $roleData['description'],
                        'is_active' => true,
                    ]
                );

                // Get permission IDs for this role
                $permissionNames = $roleData['permissions'];
                $permissions = Permission::whereIn('name', $permissionNames)->pluck('id');

                // Sync permissions (replaces existing)
                $role->syncPermissions($permissions);

                $this->command->info("  ✓ {$roleData['label']}: {$permissions->count()} permissions assigned");
            }
        });

        $this->command->info('✅ Default roles created successfully!');
        $this->command->newLine();
        $this->command->info('Role Assignment Guide:');
        $this->command->info('  • HR Director    → HRMO Director, CAO, VP Admin');
        $this->command->info('  • HR Staff       → Admin Officers/Assistants in HRMO');
        $this->command->info('  • Unit Head      → Deans, Directors, Program Heads');
        $this->command->info('  • Training Coord → Designated training coordinators');
        $this->command->info('  • Basic Employee → All other employees (default)');
    }

    /**
     * Define all roles and their permissions
     */
    private function getRoleDefinitions(): array
    {
        return [
            // =========================================================
            // HR DIRECTOR
            // Full HR management + Org Structure + Audit Logs
            // Assign to: HRMO Director, CAO, VP Admin
            // =========================================================
            [
                'name' => 'hr-director',
                'label' => 'HR Director',
                'description' => 'Full HR management including employees, org structure, trainings, and audit logs. Assign to HRMO Director, CAO, or VP Admin.',
                'permissions' => [
                    // Employees - Full access
                    'access-employees-module',
                    'create-employee',
                    'edit-employee',
                    'delete-employee',
                    'view-employee',
                    'restore-employee',
                    'force-delete-employee',
                    'view-all-employees',
                    
                    // Promotions & Grade Changes
                    'promote-employee',
                    'view-employee-promotions',
                    'promote-grade',
                    'correct-grade',
                    'view-grade-history',
                    
                    // Organizational Structure - Full access
                    'access-sector',
                    'create-sector',
                    'edit-sector',
                    'delete-sector',
                    'view-sector',
                    'restore-sector',
                    'force-delete-sector',
                    
                    'access-unit',
                    'create-unit',
                    'edit-unit',
                    'delete-unit',
                    'view-unit',
                    'restore-unit',
                    'force-delete-unit',
                    
                    'access-position',
                    'create-position',
                    'edit-position',
                    'delete-position',
                    'view-position',
                    'restore-position',
                    'force-delete-position',
                    
                    'access-unit-position',
                    'create-unit-position',
                    'edit-unit-position',
                    'delete-unit-position',
                    'view-unit-position',
                    'restore-unit-position',
                    'force-delete-unit-position',
                    
                    'access-academic-rank',
                    'create-academic-rank',
                    'edit-academic-rank',
                    'delete-academic-rank',
                    'view-academic-rank',
                    'restore-academic-rank',
                    'force-delete-academic-rank',
                    
                    'access-staff-grade',
                    'create-staff-grade',
                    'edit-staff-grade',
                    'delete-staff-grade',
                    'view-staff-grade',
                    'restore-staff-grade',
                    'force-delete-staff-grade',
                    
                    // Trainings - Full access
                    'access-trainings-module',
                    'create-training',
                    'edit-training',
                    'delete-training',
                    'view-training',
                    'restore-training',
                    'force-delete-training',
                    
                    // Leaves
                    'access-leave-calendar',
                    'manage-leave-balances',
                    
                    // Request Types - Full access
                    'access-request-types-module',
                    'create-request-type',
                    'edit-request-type',
                    'delete-request-type',
                    'view-request-type',
                    
                    // Audit Logs
                    'view-audit-logs',
                ],
            ],

            // =========================================================
            // HR STAFF
            // Day-to-day HR operations (no delete, no org structure management)
            // Assign to: Admin Officers/Assistants working in HRMO
            // =========================================================
            [
                'name' => 'hr-staff',
                'label' => 'HR Staff',
                'description' => 'Day-to-day HR operations including employee records and trainings. Assign to Admin Officers/Assistants in HRMO.',
                'permissions' => [
                    // Employees - Create/Edit/View only
                    'access-employees-module',
                    'create-employee',
                    'edit-employee',
                    'view-employee',
                    'view-all-employees',
                    
                    // View promotions/grades (no edit)
                    'view-employee-promotions',
                    'view-grade-history',
                    
                    // Org Structure - View only
                    'access-sector',
                    'view-sector',
                    
                    'access-unit',
                    'view-unit',
                    
                    'access-position',
                    'view-position',
                    
                    'access-unit-position',
                    'view-unit-position',
                    
                    'access-academic-rank',
                    'view-academic-rank',
                    
                    'access-staff-grade',
                    'view-staff-grade',
                    
                    // Trainings - Create/Edit/View
                    'access-trainings-module',
                    'create-training',
                    'edit-training',
                    'view-training',
                    
                    // Leaves - View only
                    'access-leave-calendar',
                    
                    // Request Types - View only
                    'view-request-type',
                ],
            ],

            // =========================================================
            // UNIT HEAD
            // View employees in their unit/sector, view trainings
            // Assign to: Deans, Directors, Program Heads
            // =========================================================
            [
                'name' => 'unit-head',
                'label' => 'Unit Head',
                'description' => 'View employees within their unit and training records. Assign to Deans, Directors, Program Heads.',
                'permissions' => [
                    // Employees - View only (scoped to unit)
                    'access-employees-module',
                    'view-employee',
                    'view-unit-employees',  // Scoped view
                    
                    // View promotions/grades
                    'view-employee-promotions',
                    'view-grade-history',
                    
                    // Org Structure - View only
                    'access-sector',
                    'view-sector',
                    
                    'access-unit',
                    'view-unit',
                    
                    'access-position',
                    'view-position',
                    
                    'access-academic-rank',
                    'view-academic-rank',
                    
                    'access-staff-grade',
                    'view-staff-grade',
                    
                    // Trainings - View only
                    'access-trainings-module',
                    'view-training',
                    
                    // Leaves - View calendar
                    'access-leave-calendar',
                ],
            ],

            // =========================================================
            // TRAINING COORDINATOR
            // Manage trainings, view employees
            // Assign to: Designated training coordinators in colleges/offices
            // =========================================================
            [
                'name' => 'training-coordinator',
                'label' => 'Training Coordinator',
                'description' => 'Manage training records and view employees. Assign to designated training coordinators.',
                'permissions' => [
                    // Employees - View only
                    'access-employees-module',
                    'view-employee',
                    'view-unit-employees',
                    
                    // Trainings - Full access
                    'access-trainings-module',
                    'create-training',
                    'edit-training',
                    'delete-training',
                    'view-training',
                    'restore-training',
                    
                    // Org Structure - View only (for filtering)
                    'access-sector',
                    'view-sector',
                    
                    'access-unit',
                    'view-unit',
                ],
            ],

            // =========================================================
            // BASIC EMPLOYEE
            // Minimal permissions - self-service only
            // Assign to: All employees by default
            // =========================================================
            [
                'name' => 'basic-employee',
                'label' => 'Basic Employee',
                'description' => 'Self-service access only. Default role for all employees.',
                'permissions' => [
                    // Minimal permissions - employees access their own profile
                    // through the employee portal which checks auth()->user()->employee_id
                    // No explicit permissions needed for self-service
                    
                    // View org structure (for reference)
                    'access-sector',
                    'view-sector',
                    
                    'access-unit',
                    'view-unit',
                    
                    'access-position',
                    'view-position',
                ],
            ],
        ];
    }
}
