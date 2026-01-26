<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Only migrate if audit_logs table exists
        if (!Schema::hasTable('audit_logs')) {
            return;
        }

        // Migrate Employee Audit Logs
        if (Schema::hasTable('employee_audit_log')) {
            $employeeLogs = DB::table('employee_audit_log')->get();
            
            foreach ($employeeLogs as $log) {
                $action = match($log->action_type) {
                    'CREATE' => 'created',
                    'UPDATE' => 'updated',
                    'DELETE' => 'deleted',
                    default => strtolower($log->action_type ?? 'unknown'),
                };

                $description = $log->new_value ?? '';
                if (is_string($description)) {
                    // Keep as is
                } elseif (is_array($description) || is_object($description)) {
                    $description = json_encode($description);
                }

                // Handle field changes
                if (!empty($log->field_changed)) {
                    $fieldName = str_replace('_', ' ', $log->field_changed);
                    $fieldName = ucwords($fieldName);
                    $description = "Updated {$fieldName}: " . $description;
                }

                // Extract user ID from performed_by if possible
                $userId = null;
                if (!empty($log->performed_by) && $log->performed_by !== 'System') {
                    $user = DB::table('users')->where('name', $log->performed_by)->first();
                    $userId = $user?->id;
                }

                DB::table('audit_logs')->insert([
                    'user_id' => $userId,
                    'action' => $action,
                    'module' => 'employees',
                    'entity_type' => 'Employee',
                    'entity_id' => $log->employee_id,
                    'description' => $description,
                    'old_values' => $log->old_value ? json_encode($log->old_value) : null,
                    'new_values' => $log->new_value ? json_encode($log->new_value) : null,
                    'snapshot' => $log->snapshot ? json_encode($log->snapshot) : null,
                    'reference_number' => $log->reference_number,
                    'ip_address' => null,
                    'user_agent' => null,
                    'created_at' => $log->action_date ?? now(),
                ]);
            }
        }

        // Migrate User Audit Logs
        if (Schema::hasTable('user_audit_log')) {
            $userLogs = DB::table('user_audit_log')->get();
            
            foreach ($userLogs as $log) {
                $action = match($log->action_type) {
                    'CREATE' => 'created',
                    'UPDATE' => 'updated',
                    'DELETE' => 'deleted',
                    default => strtolower($log->action_type ?? 'unknown'),
                };

                $description = $log->new_value ?? '';
                if (is_string($description)) {
                    // Keep as is
                } elseif (is_array($description) || is_object($description)) {
                    $description = json_encode($description);
                }

                // Handle field changes
                if (!empty($log->field_changed)) {
                    $fieldName = str_replace('_', ' ', $log->field_changed);
                    $fieldName = ucwords($fieldName);
                    $description = "Updated {$fieldName}: " . $description;
                }

                // Extract user ID from performed_by if possible
                $userId = null;
                if (!empty($log->performed_by) && $log->performed_by !== 'System') {
                    $user = DB::table('users')->where('name', $log->performed_by)->first();
                    $userId = $user?->id;
                }

                DB::table('audit_logs')->insert([
                    'user_id' => $userId,
                    'action' => $action,
                    'module' => 'users',
                    'entity_type' => 'User',
                    'entity_id' => $log->user_id ? (string)$log->user_id : null,
                    'description' => $description,
                    'old_values' => $log->old_value ? json_encode($log->old_value) : null,
                    'new_values' => $log->new_value ? json_encode($log->new_value) : null,
                    'snapshot' => $log->snapshot ? json_encode($log->snapshot) : null,
                    'reference_number' => $log->reference_number,
                    'ip_address' => null,
                    'user_agent' => null,
                    'created_at' => $log->action_date ?? now(),
                ]);
            }
        }

        // Migrate Organizational Audit Logs
        if (Schema::hasTable('organizational_audit_log')) {
            $orgLogs = DB::table('organizational_audit_log')->get();
            
            foreach ($orgLogs as $log) {
                $action = match($log->action_type) {
                    'CREATE' => 'created',
                    'UPDATE' => 'updated',
                    'DELETE' => 'deleted',
                    default => strtolower($log->action_type ?? 'unknown'),
                };

                $description = $log->new_value ?? '';
                if (is_string($description)) {
                    // Keep as is
                } elseif (is_array($description) || is_object($description)) {
                    $description = json_encode($description);
                }

                // Handle field changes
                if (!empty($log->field_changed)) {
                    $fieldName = str_replace('_', ' ', $log->field_changed);
                    $fieldName = ucwords($fieldName);
                    $description = "Updated {$fieldName}: " . $description;
                }

                // Determine entity type from unit_type
                $entityType = match($log->unit_type) {
                    'faculty' => 'Faculty',
                    'department' => 'Department',
                    'office' => 'Office',
                    'position' => 'Position',
                    default => 'Organizational',
                };

                // Extract user ID from performed_by if possible
                $userId = null;
                if (!empty($log->performed_by) && $log->performed_by !== 'System') {
                    $user = DB::table('users')->where('name', $log->performed_by)->first();
                    $userId = $user?->id;
                }

                DB::table('audit_logs')->insert([
                    'user_id' => $userId,
                    'action' => $action,
                    'module' => 'organizational',
                    'entity_type' => $entityType,
                    'entity_id' => $log->unit_id ? (string)$log->unit_id : null,
                    'description' => $description,
                    'old_values' => $log->old_value ? json_encode($log->old_value) : null,
                    'new_values' => $log->new_value ? json_encode($log->new_value) : null,
                    'snapshot' => $log->snapshot ? json_encode($log->snapshot) : null,
                    'reference_number' => $log->reference_number,
                    'ip_address' => null,
                    'user_agent' => null,
                    'created_at' => $log->action_date ?? now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is one-way - we don't restore old logs
        // The old tables will be dropped in a separate migration
    }
};
