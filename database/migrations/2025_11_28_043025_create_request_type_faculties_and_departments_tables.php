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
        Schema::dropIfExists('request_type_allowed_departments');
        Schema::dropIfExists('request_type_allowed_faculties');
        
        Schema::create('request_type_allowed_faculties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_type_id')->constrained()->cascadeOnDelete();
            $table->foreignId('faculty_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['request_type_id', 'faculty_id'], 'rt_allowed_faculties_unique');
        });

        Schema::create('request_type_allowed_departments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_type_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['request_type_id', 'department_id'], 'rt_allowed_depts_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('request_type_allowed_departments');
        Schema::dropIfExists('request_type_allowed_faculties');
    }
};
