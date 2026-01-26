<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create the view-audit-logs permission if it doesn't exist
        Permission::firstOrCreate(
            ['name' => 'view-audit-logs'],
            [
                'guard_name' => 'web',
                'module' => 'Audit Logs',
                'label' => 'View Audit Logs',
                'description' => 'Can view unified audit logs across all modules',
                'is_active' => true,
            ]
        );

        // Assign this permission to Super Admin role if it exists
        $superAdminRole = \Spatie\Permission\Models\Role::where('name', 'Super Admin')->first();
        if ($superAdminRole) {
            $permission = Permission::where('name', 'view-audit-logs')->first();
            if ($permission && !$superAdminRole->hasPermissionTo($permission)) {
                $superAdminRole->givePermissionTo($permission);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove permission from Super Admin role
        $superAdminRole = \Spatie\Permission\Models\Role::where('name', 'Super Admin')->first();
        if ($superAdminRole) {
            $permission = Permission::where('name', 'view-audit-logs')->first();
            if ($permission) {
                $superAdminRole->revokePermissionTo($permission);
            }
        }

        // Optionally delete the permission (commented out to preserve data)
        // Permission::where('name', 'view-audit-logs')->delete();
    }
};
