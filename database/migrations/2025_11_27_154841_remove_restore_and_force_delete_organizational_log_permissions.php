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
        // Delete restore and force-delete organizational log permissions
        Permission::where('name', 'restore-organizational-log')->delete();
        Permission::where('name', 'force-delete-organizational-log')->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate the deleted permissions (if needed for rollback)
        Permission::firstOrCreate(
            ['name' => 'restore-organizational-log'],
            [
                'guard_name' => 'web',
                'module' => 'Organizational Logs',
                'label' => 'Restore Organizational Log',
                'description' => 'Can restore deleted organizational logs',
                'is_active' => true,
            ]
        );

        Permission::firstOrCreate(
            ['name' => 'force-delete-organizational-log'],
            [
                'guard_name' => 'web',
                'module' => 'Organizational Logs',
                'label' => 'Force Delete Organizational Log',
                'description' => 'Can permanently delete organizational logs',
                'is_active' => true,
            ]
        );
    }
};
