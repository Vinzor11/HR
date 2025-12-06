<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            // Add indexes for commonly queried columns
            if (!$this->hasIndex('employees', 'employees_status_index')) {
                $table->index('status', 'employees_status_index');
            }
            if (!$this->hasIndex('employees', 'employees_employee_type_index')) {
                $table->index('employee_type', 'employees_employee_type_index');
            }
            if (!$this->hasIndex('employees', 'employees_department_id_index')) {
                $table->index('department_id', 'employees_department_id_index');
            }
            if (!$this->hasIndex('employees', 'employees_position_id_index')) {
                $table->index('position_id', 'employees_position_id_index');
            }
            if (!$this->hasIndex('employees', 'employees_created_at_index')) {
                $table->index('created_at', 'employees_created_at_index');
            }
            // Composite index for common filter combinations
            if (!$this->hasIndex('employees', 'employees_status_type_index')) {
                $table->index(['status', 'employee_type'], 'employees_status_type_index');
            }
        });

        Schema::table('request_submissions', function (Blueprint $table) {
            // Add indexes for commonly queried columns
            if (!$this->hasIndex('request_submissions', 'request_submissions_status_index')) {
                $table->index('status', 'request_submissions_status_index');
            }
            if (!$this->hasIndex('request_submissions', 'request_submissions_user_id_index')) {
                $table->index('user_id', 'request_submissions_user_id_index');
            }
            if (!$this->hasIndex('request_submissions', 'request_submissions_request_type_id_index')) {
                $table->index('request_type_id', 'request_submissions_request_type_id_index');
            }
            if (!$this->hasIndex('request_submissions', 'request_submissions_submitted_at_index')) {
                $table->index('submitted_at', 'request_submissions_submitted_at_index');
            }
            // Composite index for common queries
            if (!$this->hasIndex('request_submissions', 'request_submissions_status_user_index')) {
                $table->index(['status', 'user_id'], 'request_submissions_status_user_index');
            }
        });

        Schema::table('request_approval_actions', function (Blueprint $table) {
            // Add indexes for approval queries
            if (!$this->hasIndex('request_approval_actions', 'request_approval_actions_status_index')) {
                $table->index('status', 'request_approval_actions_status_index');
            }
            if (!$this->hasIndex('request_approval_actions', 'request_approval_actions_approver_id_index')) {
                $table->index('approver_id', 'request_approval_actions_approver_id_index');
            }
            if (!$this->hasIndex('request_approval_actions', 'request_approval_actions_approver_role_id_index')) {
                $table->index('approver_role_id', 'request_approval_actions_approver_role_id_index');
            }
            // Composite index for pending approvals query
            if (!$this->hasIndex('request_approval_actions', 'request_approval_actions_status_step_index')) {
                $table->index(['status', 'step_index'], 'request_approval_actions_status_step_index');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            // Add index for employee_id lookup
            if (!$this->hasIndex('users', 'users_employee_id_index')) {
                $table->index('employee_id', 'users_employee_id_index');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropIndex('employees_status_index');
            $table->dropIndex('employees_employee_type_index');
            $table->dropIndex('employees_department_id_index');
            $table->dropIndex('employees_position_id_index');
            $table->dropIndex('employees_created_at_index');
            $table->dropIndex('employees_status_type_index');
        });

        Schema::table('request_submissions', function (Blueprint $table) {
            $table->dropIndex('request_submissions_status_index');
            $table->dropIndex('request_submissions_user_id_index');
            $table->dropIndex('request_submissions_request_type_id_index');
            $table->dropIndex('request_submissions_submitted_at_index');
            $table->dropIndex('request_submissions_status_user_index');
        });

        Schema::table('request_approval_actions', function (Blueprint $table) {
            $table->dropIndex('request_approval_actions_status_index');
            $table->dropIndex('request_approval_actions_approver_id_index');
            $table->dropIndex('request_approval_actions_approver_role_id_index');
            $table->dropIndex('request_approval_actions_status_step_index');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_employee_id_index');
        });
    }

    /**
     * Check if an index exists on a table
     */
    private function hasIndex(string $table, string $indexName): bool
    {
        $connection = Schema::getConnection();
        $database = $connection->getDatabaseName();
        $driver = $connection->getDriverName();

        if ($driver === 'mysql') {
            $result = $connection->select(
                "SELECT COUNT(*) as count FROM information_schema.statistics 
                 WHERE table_schema = ? AND table_name = ? AND index_name = ?",
                [$database, $table, $indexName]
            );
            return $result[0]->count > 0;
        }

        // For SQLite (used during build), assume index doesn't exist
        return false;
    }
};

