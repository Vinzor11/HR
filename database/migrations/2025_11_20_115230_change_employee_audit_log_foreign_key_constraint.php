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
        Schema::table('employee_audit_log', function (Blueprint $table) {
            // Drop the existing foreign key constraint
            $table->dropForeign(['employee_id']);
            
            // Recreate the foreign key with NO ACTION instead of CASCADE
            // This preserves audit logs even after employee deletion
            // Note: We'll handle the deletion in application code by temporarily disabling FK checks
            $table->foreign('employee_id')
                  ->references('id')
                  ->on('employees')
                  ->onDelete('no action')
                  ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_audit_log', function (Blueprint $table) {
            // Drop the NO ACTION constraint
            $table->dropForeign(['employee_id']);
            
            // Restore the original CASCADE constraint
            $table->foreign('employee_id')
                  ->references('id')
                  ->on('employees')
                  ->onDelete('cascade')
                  ->onUpdate('cascade');
        });
    }
};
