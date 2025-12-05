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
        // Delete unwanted Employee Log permissions
        Permission::where('name', 'restore-employee-log')->delete();
        Permission::where('name', 'force-delete-employee-log')->delete();

        // Move view-employee-log to Employees module
        $viewLog = Permission::where('name', 'view-employee-log')->first();
        if ($viewLog) {
            $viewLog->module = 'Employees';
            $viewLog->save();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate the deleted permissions (if needed for rollback)
        Permission::firstOrCreate(
            ['name' => 'restore-employee-log'],
            [
                'guard_name' => 'web',
                'module' => 'Employee Logs',
                'label' => 'Restore Employee Log',
                'description' => 'Can restore deleted employee logs',
                'is_active' => true,
            ]
        );

        Permission::firstOrCreate(
            ['name' => 'force-delete-employee-log'],
            [
                'guard_name' => 'web',
                'module' => 'Employee Logs',
                'label' => 'Force Delete Employee Log',
                'description' => 'Can permanently delete employee logs',
                'is_active' => true,
            ]
        );

        // Revert view-employee-log to Employee Logs module
        $viewLog = Permission::where('name', 'view-employee-log')->first();
        if ($viewLog) {
            $viewLog->module = 'Employee Logs';
            $viewLog->save();
        }
    }
};
