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
            $table->enum('employment_status', ['Regular', 'Contractual', 'Job-Order', 'Probationary'])
                ->default('Probationary')
                ->after('employee_type');
            $table->date('date_hired')
                ->nullable()
                ->after('employment_status');
            $table->date('date_regularized')
                ->nullable()
                ->after('date_hired');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['employment_status', 'date_hired', 'date_regularized']);
        });
    }
};
