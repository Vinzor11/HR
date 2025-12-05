<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create the Super Admin role
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin'], [
            'guard_name' => 'web',
        ]);

        // 2. Define all permissions
        $permissions = [
            // Access Module Permissions
            [
                'name' => 'access-roles-module',
                'module' => 'Roles',
                'label' => 'Access Roles Module',
                'description' => 'Can access roles module',
            ],
            [
                'name' => 'access-permissions-module',
                'module' => 'Permissions',
                'label' => 'Access Permissions Module',
                'description' => 'Can access permissions module',
            ],
            [
                'name' => 'access-users-module',
                'module' => 'Users',
                'label' => 'Access Users Module',
                'description' => 'Can access users module',
            ],
            [
                'name' => 'access-employees-module',
                'module' => 'Employees',
                'label' => 'Access Employees Module',
                'description' => 'Can access employee module',
            ],
            [
                'name' => 'access-request-types-module',
                'module' => 'Requests',
                'label' => 'Access Requests Module',
                'description' => 'Can configure HR request types and fulfillment workflows',
            ],
            [
                'name' => 'access-leave-calendar',
                'module' => 'Leaves',
                'label' => 'Access Leave Calendar',
                'description' => 'Can view the leave calendar showing all employees\' leave requests',
            ],

            // Roles Permissions
            ['name' => 'create-role', 'module' => 'Roles', 'label' => 'Create Role', 'description' => 'Can create new roles'],
            ['name' => 'edit-role', 'module' => 'Roles', 'label' => 'Edit Role', 'description' => 'Can modify existing roles'],
            ['name' => 'delete-role', 'module' => 'Roles', 'label' => 'Delete Role', 'description' => 'Can remove roles'],
            ['name' => 'view-role', 'module' => 'Roles', 'label' => 'View Role', 'description' => 'Can view role details'],

            // Permissions Permissions
            ['name' => 'create-permission', 'module' => 'Permissions', 'label' => 'Create Permission', 'description' => 'Can create permissions'],
            ['name' => 'edit-permission', 'module' => 'Permissions', 'label' => 'Edit Permission', 'description' => 'Can modify permissions'],
            ['name' => 'delete-permission', 'module' => 'Permissions', 'label' => 'Delete Permission', 'description' => 'Can delete permissions'],
            ['name' => 'view-permission', 'module' => 'Permissions', 'label' => 'View Permission', 'description' => 'Can view permissions'],

            // Users Permissions
            ['name' => 'create-user', 'module' => 'Users', 'label' => 'Create User', 'description' => 'Can create new users'],
            ['name' => 'edit-user', 'module' => 'Users', 'label' => 'Edit User', 'description' => 'Can modify user accounts'],
            ['name' => 'delete-user', 'module' => 'Users', 'label' => 'Delete User', 'description' => 'Can delete users'],
            ['name' => 'view-user', 'module' => 'Users', 'label' => 'View User', 'description' => 'Can view user details'],
            ['name' => 'restore-user', 'module' => 'Users', 'label' => 'Restore User', 'description' => 'Can restore deactivated users'],
            ['name' => 'force-delete-user', 'module' => 'Users', 'label' => 'Force Delete User', 'description' => 'Can permanently delete users'],

            // Employees Permissions (including Employee Logs)
            ['name' => 'create-employee', 'module' => 'Employees', 'label' => 'Create Employee', 'description' => 'Can create new employees'],
            ['name' => 'edit-employee', 'module' => 'Employees', 'label' => 'Edit Employee', 'description' => 'Can edit employee records'],
            ['name' => 'delete-employee', 'module' => 'Employees', 'label' => 'Delete Employee', 'description' => 'Can delete employee records'],
            ['name' => 'view-employee', 'module' => 'Employees', 'label' => 'View Employee', 'description' => 'Can view employee details'],
            ['name' => 'view-employee-log', 'module' => 'Employees', 'label' => 'View Employee Log', 'description' => 'Can view employee logs'],
            ['name' => 'restore-employee', 'module' => 'Employees', 'label' => 'Restore Employee', 'description' => 'Can restore deleted employees'],
            ['name' => 'force-delete-employee', 'module' => 'Employees', 'label' => 'Force Delete Employee', 'description' => 'Can permanently delete employees'],

            // Organizational Structure Permissions (Faculties, Departments, Positions)
            // Faculties
            ['name' => 'access-faculty', 'module' => 'Organizational Structure', 'label' => 'Access Faculty', 'description' => 'Can access faculty module'],
            ['name' => 'create-faculty', 'module' => 'Organizational Structure', 'label' => 'Create Faculty', 'description' => 'Can create new faculties'],
            ['name' => 'edit-faculty', 'module' => 'Organizational Structure', 'label' => 'Edit Faculty', 'description' => 'Can edit faculty records'],
            ['name' => 'delete-faculty', 'module' => 'Organizational Structure', 'label' => 'Delete Faculty', 'description' => 'Can delete faculties'],
            ['name' => 'view-faculty', 'module' => 'Organizational Structure', 'label' => 'View Faculty', 'description' => 'Can view faculty details'],
            ['name' => 'restore-faculty', 'module' => 'Organizational Structure', 'label' => 'Restore Faculty', 'description' => 'Can restore deleted faculties'],
            ['name' => 'force-delete-faculty', 'module' => 'Organizational Structure', 'label' => 'Force Delete Faculty', 'description' => 'Can permanently delete faculties'],

            // Departments
            ['name' => 'access-department', 'module' => 'Organizational Structure', 'label' => 'Access Department', 'description' => 'Can access department module'],
            ['name' => 'create-department', 'module' => 'Organizational Structure', 'label' => 'Create Department', 'description' => 'Can create new departments'],
            ['name' => 'edit-department', 'module' => 'Organizational Structure', 'label' => 'Edit Department', 'description' => 'Can edit department records'],
            ['name' => 'delete-department', 'module' => 'Organizational Structure', 'label' => 'Delete Department', 'description' => 'Can delete departments'],
            ['name' => 'view-department', 'module' => 'Organizational Structure', 'label' => 'View Department', 'description' => 'Can view department details'],
            ['name' => 'restore-department', 'module' => 'Organizational Structure', 'label' => 'Restore Department', 'description' => 'Can restore deleted departments'],
            ['name' => 'force-delete-department', 'module' => 'Organizational Structure', 'label' => 'Force Delete Department', 'description' => 'Can permanently delete departments'],

            // Offices
            ['name' => 'access-office', 'module' => 'Organizational Structure', 'label' => 'Access Office', 'description' => 'Can access office module'],
            ['name' => 'create-office', 'module' => 'Organizational Structure', 'label' => 'Create Office', 'description' => 'Can create new offices'],
            ['name' => 'edit-office', 'module' => 'Organizational Structure', 'label' => 'Edit Office', 'description' => 'Can edit office records'],
            ['name' => 'delete-office', 'module' => 'Organizational Structure', 'label' => 'Delete Office', 'description' => 'Can delete offices'],
            ['name' => 'view-office', 'module' => 'Organizational Structure', 'label' => 'View Office', 'description' => 'Can view office details'],
            ['name' => 'restore-office', 'module' => 'Organizational Structure', 'label' => 'Restore Office', 'description' => 'Can restore deleted offices'],
            ['name' => 'force-delete-office', 'module' => 'Organizational Structure', 'label' => 'Force Delete Office', 'description' => 'Can permanently delete offices'],

            // Positions
            ['name' => 'access-position', 'module' => 'Organizational Structure', 'label' => 'Access Position', 'description' => 'Can access position module'],
            ['name' => 'create-position', 'module' => 'Organizational Structure', 'label' => 'Create Position', 'description' => 'Can create new positions'],
            ['name' => 'edit-position', 'module' => 'Organizational Structure', 'label' => 'Edit Position', 'description' => 'Can edit position records'],
            ['name' => 'delete-position', 'module' => 'Organizational Structure', 'label' => 'Delete Position', 'description' => 'Can delete positions'],
            ['name' => 'view-position', 'module' => 'Organizational Structure', 'label' => 'View Position', 'description' => 'Can view position details'],
            ['name' => 'restore-position', 'module' => 'Organizational Structure', 'label' => 'Restore Position', 'description' => 'Can restore deleted positions'],
            ['name' => 'force-delete-position', 'module' => 'Organizational Structure', 'label' => 'Force Delete Position', 'description' => 'Can permanently delete positions'],

            // Organizational Logs Permissions (under Organizational Structure)
            ['name' => 'view-organizational-log', 'module' => 'Organizational Structure', 'label' => 'View Organizational Log', 'description' => 'Can view organizational logs'],
            
            // Trainings Permissions
            ['name' => 'access-trainings-module', 'module' => 'Trainings', 'label' => 'Access Trainings Module', 'description' => 'Can access trainings module'],
            ['name' => 'create-training', 'module' => 'Trainings', 'label' => 'Create Training', 'description' => 'Can create new trainings'],
            ['name' => 'edit-training', 'module' => 'Trainings', 'label' => 'Edit Training', 'description' => 'Can edit training records'],
            ['name' => 'delete-training', 'module' => 'Trainings', 'label' => 'Delete Training', 'description' => 'Can delete trainings'],
            ['name' => 'view-training', 'module' => 'Trainings', 'label' => 'View Training', 'description' => 'Can view training details'],
            ['name' => 'restore-training', 'module' => 'Trainings', 'label' => 'Restore Training', 'description' => 'Can restore deleted trainings'],
            ['name' => 'force-delete-training', 'module' => 'Trainings', 'label' => 'Force Delete Training', 'description' => 'Can permanently delete trainings'],
            
            // Request Types Permissions
            ['name' => 'create-request-type', 'module' => 'Requests', 'label' => 'Create Request Type', 'description' => 'Can create new request types'],
            ['name' => 'edit-request-type', 'module' => 'Requests', 'label' => 'Edit Request Type', 'description' => 'Can edit request type records'],
            ['name' => 'delete-request-type', 'module' => 'Requests', 'label' => 'Delete Request Type', 'description' => 'Can delete request types'],
            ['name' => 'view-request-type', 'module' => 'Requests', 'label' => 'View Request Type', 'description' => 'Can view request type details'],
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
            ['email' => 'superadmin@example.com'],
            [
                'name' => 'Super Admin',
                'password' => bcrypt('password'), // ⚠️ Change this in production!
            ]
        );

        // 6. Assign the Super Admin role to the user
        $user->assignRole($superAdminRole);

        $this->command->info('✅ Super Admin user, role, and all module permissions (including Departments & Positions) seeded successfully!');
    }
}
