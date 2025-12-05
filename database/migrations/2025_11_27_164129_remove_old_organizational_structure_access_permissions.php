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
        // Remove old organizational structure access permissions
        Permission::where('name', 'access-departments-module')->delete();
        Permission::where('name', 'access-positions-module')->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate the old permissions if needed for rollback
        Permission::firstOrCreate(
            ['name' => 'access-departments-module'],
            [
                'guard_name' => 'web',
                'module' => 'Organizational Structure',
                'label' => 'Access Organizational Structure Module',
                'description' => 'Can access organizational structure module',
                'is_active' => true,
            ]
        );

        Permission::firstOrCreate(
            ['name' => 'access-positions-module'],
            [
                'guard_name' => 'web',
                'module' => 'Organizational Structure',
                'label' => 'Access Organizational Structure Module',
                'description' => 'Can access organizational structure module',
                'is_active' => true,
            ]
        );
    }
};
