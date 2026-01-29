<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Removes legacy roles AND permissions that are no longer needed after migrating to
 * Sector/Unit/Position structure. Ensures only current permissions remain.
 * 
 * This seeder:
 * 1. Removes legacy roles (old position-based and Faculty/Department roles)
 * 2. Removes legacy permissions (Faculty, Department, Office CRUD permissions)
 * 3. Protects Super Admin role and all current permissions defined in SuperAdminSeeder
 */
class LegacyCleanupSeeder extends Seeder
{
    /**
     * Roles that must never be removed (system roles and default functional roles).
     */
    protected array $protectedRoles = [
        'super-admin',           // canonical Super Admin role name (matches SuperAdminSeeder::SUPER_ADMIN_ROLE_NAME)
        'Super Admin',           // legacy name (do not remove in case it's still referenced)
        'hr-director',           // default functional role
        'hr-staff',              // default functional role
        'unit-head',             // default functional role
        'training-coordinator',  // default functional role
        'basic-employee',        // default functional role
    ];

    /**
     * Legacy role names to remove (from old Faculty/Department/position structure).
     */
    protected array $legacyRoleNames = [
        // Old position-based roles (replaced by new position codes)
        'dean',                    // was DEAN -> now college-dean (COLLEGE_DEAN)
        'associate-dean',          // was ASSO_DEAN -> now assoc-dean (ASSOC_DEAN)
        'coordinator',             // was COORD -> now specific coordinators (RES_COORD, EXT_COORD, etc.)
        'head',                    // was HEAD -> now specific heads (HRMO_DIR, etc.)
        'officer',                 // was OFFICER -> now admin_off_i, admin_off_ii, etc.
        'staff',                   // was STAFF -> now admin_staff_acad
        'administrative-aide',     // was AIDE -> now admin_aide_i, admin_aide_vi, etc.
        // Old org structure (Faculty/Department)
        'faculty-admin',
        'department-admin',
        'department-head',
        'faculty-head',
        'office-head',
    ];

    /**
     * Legacy permission names to remove (from old Faculty/Department/Office structure).
     * These are replaced by Sector/Unit permissions in SuperAdminSeeder.
     */
    protected array $legacyPermissionNames = [
        // Faculty permissions (replaced by Sector permissions)
        'access-faculty',
        'access-faculties-module',
        'create-faculty',
        'edit-faculty',
        'delete-faculty',
        'view-faculty',
        'restore-faculty',
        'force-delete-faculty',
        'view-faculty-log',
        
        // Department permissions (replaced by Unit permissions)
        'access-department',
        'access-departments-module',
        'create-department',
        'edit-department',
        'delete-department',
        'view-department',
        'restore-department',
        'force-delete-department',
        'view-department-log',
        
        // Office permissions (offices are now Units with unit_type='office')
        'access-office',
        'access-offices-module',
        'create-office',
        'edit-office',
        'delete-office',
        'view-office',
        'restore-office',
        'force-delete-office',
        'view-office-log',
        
        // Old access module permissions
        'access-positions-module',  // replaced by access-position
        
        // Old organizational log permissions (now unified in Audit Logs)
        'restore-organizational-log',
        'force-delete-organizational-log',
        'restore-employee-log',
        'force-delete-employee-log',
        
        // Legacy individual log permissions (replaced by unified view-audit-logs)
        'view-user-log',
        'view-employee-log',
        'view-organizational-log',
    ];

    public function run(): void
    {
        $this->command->info('Cleaning up legacy roles and permissions...');

        DB::transaction(function () {
            $this->cleanupLegacyRoles();
            $this->cleanupLegacyPermissions();
        });

        $this->command->info('Legacy cleanup complete.');
    }

    /**
     * Remove legacy roles
     */
    protected function cleanupLegacyRoles(): void
    {
        $guard = 'web';
        $removed = 0;

        foreach ($this->legacyRoleNames as $name) {
            $role = Role::where('name', $name)->where('guard_name', $guard)->first();
            if (!$role) {
                continue;
            }

            if ($this->isProtectedRole($name)) {
                $this->command->warn("  Skipped protected role: {$name}");
                continue;
            }

            $roleId = $role->id;

            // 1. Unassign all users from this role
            $pivot = config('permission.table_names.model_has_roles', 'model_has_roles');
            $roleKey = config('permission.column_names.role_pivot_key') ?? 'role_id';
            $unassigned = DB::table($pivot)->where($roleKey, $roleId)->delete();

            // 2. Null approver_role_id in request_approval_actions (approval flows must be reconfigured)
            $nulled = DB::table('request_approval_actions')
                ->where('approver_role_id', $roleId)
                ->update(['approver_role_id' => null]);

            // 3. Remove role-permission links
            $role->syncPermissions([]);

            // 4. Delete the role
            $role->delete();
            $removed++;

            $this->command->line("  Removed role: {$name} (unassigned {$unassigned} user(s), nulled {$nulled} approval action(s))");
        }

        $this->command->info("  Roles cleanup: removed {$removed} legacy role(s)");
    }

    /**
     * Remove legacy permissions
     */
    protected function cleanupLegacyPermissions(): void
    {
        $guard = 'web';
        $removed = 0;

        foreach ($this->legacyPermissionNames as $name) {
            $permission = Permission::where('name', $name)->where('guard_name', $guard)->first();
            if (!$permission) {
                continue;
            }

            $permissionId = $permission->id;

            // 1. Remove from all roles (role_has_permissions)
            $rolePermPivot = config('permission.table_names.role_has_permissions', 'role_has_permissions');
            $permKey = config('permission.column_names.permission_pivot_key') ?? 'permission_id';
            $detachedRoles = DB::table($rolePermPivot)->where($permKey, $permissionId)->delete();

            // 2. Remove from all users (model_has_permissions)
            $modelPermPivot = config('permission.table_names.model_has_permissions', 'model_has_permissions');
            $detachedUsers = DB::table($modelPermPivot)->where($permKey, $permissionId)->delete();

            // 3. Delete the permission
            $permission->delete();
            $removed++;

            $this->command->line("  Removed permission: {$name} (detached from {$detachedRoles} role(s), {$detachedUsers} user(s))");
        }

        $this->command->info("  Permissions cleanup: removed {$removed} legacy permission(s)");
    }

    protected function isProtectedRole(string $name): bool
    {
        $normalized = strtolower(trim($name));
        foreach ($this->protectedRoles as $protected) {
            if (strtolower(trim($protected)) === $normalized) {
                return true;
            }
        }
        return false;
    }
}
