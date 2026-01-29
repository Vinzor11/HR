<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;

class SuperAdminSeeder extends Seeder
{
    /** Stable slug used by RoleController (Str::slug('Super Admin')) - prevents duplicate role when editing in UI */
    public const SUPER_ADMIN_ROLE_NAME = 'super-admin';

    public function run(): void
    {
        // 1. Create or update the Super Admin role (name = slug so UI save doesn't create a duplicate)
        $superAdminRole = Role::updateOrCreate(
            [
                'name' => self::SUPER_ADMIN_ROLE_NAME,
                'guard_name' => 'web',
            ],
            [
                'label' => 'Super Admin',
                'description' => 'Full system access. Cannot be removed.',
                'is_active' => true,
            ]
        );

        // Migrate legacy "Super Admin" (with space) to "super-admin" so we don't leave duplicates
        $legacyRole = Role::where('name', 'Super Admin')->where('guard_name', 'web')->first();
        if ($legacyRole && $legacyRole->id !== $superAdminRole->id) {
            foreach ($legacyRole->users as $user) {
                $user->assignRole($superAdminRole);
            }
            $legacyRole->delete();
        }

        // 2. Define all permissions - organized by module and entity
        // Order within each entity: access -> create -> edit -> delete -> view -> restore -> force-delete
        $permissions = [
            // =============================================
            // ROLES MODULE
            // =============================================
            ['name' => 'access-roles-module', 'module' => 'Roles', 'label' => 'Access Roles Module', 'description' => 'Can access roles module'],
            ['name' => 'create-role', 'module' => 'Roles', 'label' => 'Create Role', 'description' => 'Can create new roles'],
            ['name' => 'edit-role', 'module' => 'Roles', 'label' => 'Edit Role', 'description' => 'Can modify existing roles'],
            ['name' => 'delete-role', 'module' => 'Roles', 'label' => 'Delete Role', 'description' => 'Can remove roles'],
            ['name' => 'view-role', 'module' => 'Roles', 'label' => 'View Role', 'description' => 'Can view role details'],

            // =============================================
            // PERMISSIONS MODULE
            // =============================================
            ['name' => 'access-permissions-module', 'module' => 'Permissions', 'label' => 'Access Permissions Module', 'description' => 'Can access permissions module'],
            ['name' => 'create-permission', 'module' => 'Permissions', 'label' => 'Create Permission', 'description' => 'Can create permissions'],
            ['name' => 'edit-permission', 'module' => 'Permissions', 'label' => 'Edit Permission', 'description' => 'Can modify permissions'],
            ['name' => 'delete-permission', 'module' => 'Permissions', 'label' => 'Delete Permission', 'description' => 'Can delete permissions'],
            ['name' => 'view-permission', 'module' => 'Permissions', 'label' => 'View Permission', 'description' => 'Can view permissions'],

            // =============================================
            // USERS MODULE
            // =============================================
            ['name' => 'access-users-module', 'module' => 'Users', 'label' => 'Access Users Module', 'description' => 'Can access users module'],
            ['name' => 'create-user', 'module' => 'Users', 'label' => 'Create User', 'description' => 'Can create new users'],
            ['name' => 'edit-user', 'module' => 'Users', 'label' => 'Edit User', 'description' => 'Can modify user accounts'],
            ['name' => 'delete-user', 'module' => 'Users', 'label' => 'Delete User', 'description' => 'Can delete users'],
            ['name' => 'view-user', 'module' => 'Users', 'label' => 'View User', 'description' => 'Can view user details'],
            ['name' => 'restore-user', 'module' => 'Users', 'label' => 'Restore User', 'description' => 'Can restore deactivated users'],
            ['name' => 'force-delete-user', 'module' => 'Users', 'label' => 'Force Delete User', 'description' => 'Can permanently delete users'],
            ['name' => 'view-user-activities', 'module' => 'Users', 'label' => 'View User Activities', 'description' => 'Can view user login/logout activities'],

            // =============================================
            // EMPLOYEES MODULE
            // =============================================
            ['name' => 'access-employees-module', 'module' => 'Employees', 'label' => 'Access Employees Module', 'description' => 'Can access employee module'],
            ['name' => 'create-employee', 'module' => 'Employees', 'label' => 'Create Employee', 'description' => 'Can create new employees'],
            ['name' => 'edit-employee', 'module' => 'Employees', 'label' => 'Edit Employee', 'description' => 'Can edit employee records'],
            ['name' => 'delete-employee', 'module' => 'Employees', 'label' => 'Delete Employee', 'description' => 'Can delete employee records'],
            ['name' => 'view-employee', 'module' => 'Employees', 'label' => 'View Employee', 'description' => 'Can view employee details'],
            ['name' => 'restore-employee', 'module' => 'Employees', 'label' => 'Restore Employee', 'description' => 'Can restore deleted employees'],
            ['name' => 'force-delete-employee', 'module' => 'Employees', 'label' => 'Force Delete Employee', 'description' => 'Can permanently delete employees'],
            // Employee Scope Permissions
            ['name' => 'view-all-employees', 'module' => 'Employees', 'label' => 'View All Employees', 'description' => 'Can view all employees without scope restrictions'],
            ['name' => 'view-sector-employees', 'module' => 'Employees', 'label' => 'View Sector Employees', 'description' => 'Can view employees in their sector'],
            ['name' => 'view-unit-employees', 'module' => 'Employees', 'label' => 'View Unit Employees', 'description' => 'Can view employees in their unit'],
            // Employee Promotions & Grade Changes
            ['name' => 'promote-employee', 'module' => 'Employees', 'label' => 'Promote Employee', 'description' => 'Can record employee promotions'],
            ['name' => 'view-employee-promotions', 'module' => 'Employees', 'label' => 'View Employee Promotions', 'description' => 'Can view employee promotion history'],
            ['name' => 'promote-grade', 'module' => 'Employees', 'label' => 'Promote Grade/Rank', 'description' => 'Can promote employee grade/rank (upward progression)'],
            ['name' => 'correct-grade', 'module' => 'Employees', 'label' => 'Correct Grade/Rank', 'description' => 'Can correct/adjust employee grade/rank (with reason)'],
            ['name' => 'view-grade-history', 'module' => 'Employees', 'label' => 'View Grade History', 'description' => 'Can view employee grade/rank change history'],

            // =============================================
            // ORGANIZATIONAL STRUCTURE MODULE
            // Grouped by entity: Sectors -> Units -> Positions -> Position Whitelist -> Academic Ranks -> Staff Grades
            // =============================================
            
            // --- Sectors ---
            ['name' => 'access-sector', 'module' => 'Organizational Structure', 'label' => 'Access Sectors', 'description' => 'Can access sectors module'],
            ['name' => 'create-sector', 'module' => 'Organizational Structure', 'label' => 'Create Sector', 'description' => 'Can create new sectors'],
            ['name' => 'edit-sector', 'module' => 'Organizational Structure', 'label' => 'Edit Sector', 'description' => 'Can edit sector records'],
            ['name' => 'delete-sector', 'module' => 'Organizational Structure', 'label' => 'Delete Sector', 'description' => 'Can delete sectors'],
            ['name' => 'view-sector', 'module' => 'Organizational Structure', 'label' => 'View Sector', 'description' => 'Can view sector details'],
            ['name' => 'restore-sector', 'module' => 'Organizational Structure', 'label' => 'Restore Sector', 'description' => 'Can restore deleted sectors'],
            ['name' => 'force-delete-sector', 'module' => 'Organizational Structure', 'label' => 'Force Delete Sector', 'description' => 'Can permanently delete sectors'],

            // --- Units (Colleges, Programs, Offices) ---
            ['name' => 'access-unit', 'module' => 'Organizational Structure', 'label' => 'Access Units', 'description' => 'Can access units module'],
            ['name' => 'create-unit', 'module' => 'Organizational Structure', 'label' => 'Create Unit', 'description' => 'Can create new units'],
            ['name' => 'edit-unit', 'module' => 'Organizational Structure', 'label' => 'Edit Unit', 'description' => 'Can edit unit records'],
            ['name' => 'delete-unit', 'module' => 'Organizational Structure', 'label' => 'Delete Unit', 'description' => 'Can delete units'],
            ['name' => 'view-unit', 'module' => 'Organizational Structure', 'label' => 'View Unit', 'description' => 'Can view unit details'],
            ['name' => 'restore-unit', 'module' => 'Organizational Structure', 'label' => 'Restore Unit', 'description' => 'Can restore deleted units'],
            ['name' => 'force-delete-unit', 'module' => 'Organizational Structure', 'label' => 'Force Delete Unit', 'description' => 'Can permanently delete units'],

            // --- Positions ---
            ['name' => 'access-position', 'module' => 'Organizational Structure', 'label' => 'Access Positions', 'description' => 'Can access positions module'],
            ['name' => 'create-position', 'module' => 'Organizational Structure', 'label' => 'Create Position', 'description' => 'Can create new positions'],
            ['name' => 'edit-position', 'module' => 'Organizational Structure', 'label' => 'Edit Position', 'description' => 'Can edit position records'],
            ['name' => 'delete-position', 'module' => 'Organizational Structure', 'label' => 'Delete Position', 'description' => 'Can delete positions'],
            ['name' => 'view-position', 'module' => 'Organizational Structure', 'label' => 'View Position', 'description' => 'Can view position details'],
            ['name' => 'restore-position', 'module' => 'Organizational Structure', 'label' => 'Restore Position', 'description' => 'Can restore deleted positions'],
            ['name' => 'force-delete-position', 'module' => 'Organizational Structure', 'label' => 'Force Delete Position', 'description' => 'Can permanently delete positions'],

            // --- Position Whitelist (Unit-Position mapping) ---
            ['name' => 'access-unit-position', 'module' => 'Organizational Structure', 'label' => 'Access Position Whitelist', 'description' => 'Can access position whitelist module'],
            ['name' => 'create-unit-position', 'module' => 'Organizational Structure', 'label' => 'Create Position Whitelist', 'description' => 'Can add positions to unit whitelist'],
            ['name' => 'edit-unit-position', 'module' => 'Organizational Structure', 'label' => 'Edit Position Whitelist', 'description' => 'Can edit position whitelist'],
            ['name' => 'delete-unit-position', 'module' => 'Organizational Structure', 'label' => 'Delete Position Whitelist', 'description' => 'Can delete position whitelist entries'],
            ['name' => 'view-unit-position', 'module' => 'Organizational Structure', 'label' => 'View Position Whitelist', 'description' => 'Can view position whitelist'],
            ['name' => 'restore-unit-position', 'module' => 'Organizational Structure', 'label' => 'Restore Position Whitelist', 'description' => 'Can restore deleted position whitelist entries'],
            ['name' => 'force-delete-unit-position', 'module' => 'Organizational Structure', 'label' => 'Force Delete Position Whitelist', 'description' => 'Can permanently delete position whitelist entries'],

            // --- Academic Ranks ---
            ['name' => 'access-academic-rank', 'module' => 'Organizational Structure', 'label' => 'Access Academic Ranks', 'description' => 'Can access academic ranks module'],
            ['name' => 'create-academic-rank', 'module' => 'Organizational Structure', 'label' => 'Create Academic Rank', 'description' => 'Can create academic ranks'],
            ['name' => 'edit-academic-rank', 'module' => 'Organizational Structure', 'label' => 'Edit Academic Rank', 'description' => 'Can edit academic ranks'],
            ['name' => 'delete-academic-rank', 'module' => 'Organizational Structure', 'label' => 'Delete Academic Rank', 'description' => 'Can delete academic ranks'],
            ['name' => 'view-academic-rank', 'module' => 'Organizational Structure', 'label' => 'View Academic Rank', 'description' => 'Can view academic rank details'],
            ['name' => 'restore-academic-rank', 'module' => 'Organizational Structure', 'label' => 'Restore Academic Rank', 'description' => 'Can restore deleted academic ranks'],
            ['name' => 'force-delete-academic-rank', 'module' => 'Organizational Structure', 'label' => 'Force Delete Academic Rank', 'description' => 'Can permanently delete academic ranks'],

            // --- Staff Grades ---
            ['name' => 'access-staff-grade', 'module' => 'Organizational Structure', 'label' => 'Access Staff Grades', 'description' => 'Can access staff grades module'],
            ['name' => 'create-staff-grade', 'module' => 'Organizational Structure', 'label' => 'Create Staff Grade', 'description' => 'Can create staff grades'],
            ['name' => 'edit-staff-grade', 'module' => 'Organizational Structure', 'label' => 'Edit Staff Grade', 'description' => 'Can edit staff grades'],
            ['name' => 'delete-staff-grade', 'module' => 'Organizational Structure', 'label' => 'Delete Staff Grade', 'description' => 'Can delete staff grades'],
            ['name' => 'view-staff-grade', 'module' => 'Organizational Structure', 'label' => 'View Staff Grade', 'description' => 'Can view staff grade details'],
            ['name' => 'restore-staff-grade', 'module' => 'Organizational Structure', 'label' => 'Restore Staff Grade', 'description' => 'Can restore deleted staff grades'],
            ['name' => 'force-delete-staff-grade', 'module' => 'Organizational Structure', 'label' => 'Force Delete Staff Grade', 'description' => 'Can permanently delete staff grades'],

            // =============================================
            // LEAVES MODULE
            // =============================================
            ['name' => 'access-leave-calendar', 'module' => 'Leaves', 'label' => 'Access Leave Calendar', 'description' => 'Can view the leave calendar showing all employees\' leave requests'],
            ['name' => 'manage-leave-balances', 'module' => 'Leaves', 'label' => 'Manage Leave Balances', 'description' => 'Can set initial balances, grant special leaves, and adjust employee leave credits'],

            // =============================================
            // REQUESTS MODULE
            // =============================================
            ['name' => 'access-request-types-module', 'module' => 'Requests', 'label' => 'Access Request Types', 'description' => 'Can configure HR request types and fulfillment workflows'],
            ['name' => 'create-request-type', 'module' => 'Requests', 'label' => 'Create Request Type', 'description' => 'Can create new request types'],
            ['name' => 'edit-request-type', 'module' => 'Requests', 'label' => 'Edit Request Type', 'description' => 'Can edit request type records'],
            ['name' => 'delete-request-type', 'module' => 'Requests', 'label' => 'Delete Request Type', 'description' => 'Can delete request types'],
            ['name' => 'view-request-type', 'module' => 'Requests', 'label' => 'View Request Type', 'description' => 'Can view request type details'],

            // =============================================
            // TRAININGS MODULE
            // =============================================
            ['name' => 'access-trainings-module', 'module' => 'Trainings', 'label' => 'Access Trainings Module', 'description' => 'Can access trainings module'],
            ['name' => 'create-training', 'module' => 'Trainings', 'label' => 'Create Training', 'description' => 'Can create new trainings'],
            ['name' => 'edit-training', 'module' => 'Trainings', 'label' => 'Edit Training', 'description' => 'Can edit training records'],
            ['name' => 'delete-training', 'module' => 'Trainings', 'label' => 'Delete Training', 'description' => 'Can delete trainings'],
            ['name' => 'view-training', 'module' => 'Trainings', 'label' => 'View Training', 'description' => 'Can view training details'],
            ['name' => 'restore-training', 'module' => 'Trainings', 'label' => 'Restore Training', 'description' => 'Can restore deleted trainings'],
            ['name' => 'force-delete-training', 'module' => 'Trainings', 'label' => 'Force Delete Training', 'description' => 'Can permanently delete trainings'],

            // =============================================
            // AUDIT LOGS MODULE (Unified logging - replaces all individual log permissions)
            // =============================================
            ['name' => 'view-audit-logs', 'module' => 'Audit Logs', 'label' => 'View Audit Logs', 'description' => 'Can view unified audit logs across all modules'],
        ];

        // 3. Create permissions if they don't exist
        foreach ($permissions as $perm) {
            Permission::firstOrCreate(
                ['name' => $perm['name']],
                [
                    'guard_name' => 'web',
                    'module' => $perm['module'],
                    'label' => $perm['label'],
                    'description' => $perm['description'],
                    'is_active' => true,
                ]
            );
        }

        // 4. Assign all permissions to the Super Admin role
        $superAdminRole->syncPermissions(Permission::all());

        // 5. Create the Super Admin user
        $user = User::firstOrCreate(
            ['email' => 'essuhrms02141960@gmail.com'],
            [
                'name' => 'Essu HRMS',
                // Keep password resettable by reruns to stay idempotent
                'password' => bcrypt('password'),
            ]
        );

        // 6. Assign the Super Admin role to the user
        $user->assignRole($superAdminRole);

        $this->command->info('✅ Super Admin user, role, and all module permissions seeded successfully!');
    }
}
