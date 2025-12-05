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
        // Move all Faculty permissions to Organizational Structure
        Permission::whereIn('name', [
            'create-faculty',
            'edit-faculty',
            'delete-faculty',
            'view-faculty',
            'restore-faculty',
            'force-delete-faculty',
        ])->update(['module' => 'Organizational Structure']);

        // Move all Department permissions to Organizational Structure
        Permission::whereIn('name', [
            'create-department',
            'edit-department',
            'delete-department',
            'view-department',
            'restore-department',
            'force-delete-department',
        ])->update(['module' => 'Organizational Structure']);

        // Move all Position permissions to Organizational Structure
        Permission::whereIn('name', [
            'create-position',
            'edit-position',
            'delete-position',
            'view-position',
            'restore-position',
            'force-delete-position',
        ])->update(['module' => 'Organizational Structure']);

        // Move access module permissions to Organizational Structure
        Permission::whereIn('name', [
            'access-departments-module',
            'access-positions-module',
        ])->update(['module' => 'Organizational Structure']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert Faculty permissions to Faculties module
        Permission::whereIn('name', [
            'create-faculty',
            'edit-faculty',
            'delete-faculty',
            'view-faculty',
            'restore-faculty',
            'force-delete-faculty',
        ])->update(['module' => 'Faculties']);

        // Revert Department permissions to Departments module
        Permission::whereIn('name', [
            'create-department',
            'edit-department',
            'delete-department',
            'view-department',
            'restore-department',
            'force-delete-department',
        ])->update(['module' => 'Departments']);

        // Revert Position permissions to Positions module
        Permission::whereIn('name', [
            'create-position',
            'edit-position',
            'delete-position',
            'view-position',
            'restore-position',
            'force-delete-position',
        ])->update(['module' => 'Positions']);

        // Revert access module permissions
        Permission::where('name', 'access-departments-module')->update(['module' => 'Departments']);
        Permission::where('name', 'access-positions-module')->update(['module' => 'Positions']);
    }
};
