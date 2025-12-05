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
        // Move view-organizational-log to Organizational Structure module
        $viewLog = Permission::where('name', 'view-organizational-log')->first();
        if ($viewLog) {
            $viewLog->module = 'Organizational Structure';
            $viewLog->save();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert view-organizational-log to Organizational Logs module
        $viewLog = Permission::where('name', 'view-organizational-log')->first();
        if ($viewLog) {
            $viewLog->module = 'Organizational Logs';
            $viewLog->save();
        }
    }
};
