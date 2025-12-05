<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 🔹 Trainings Table
        Schema::create('trainings', function (Blueprint $table) {
            $table->id('training_id');
            $table->string('reference_number', 50)->nullable()->unique();
            $table->string('training_title', 100);
            $table->unsignedBigInteger('training_category_id')->nullable(); // placeholder for future category table
            $table->date('date_from');
            $table->date('date_to');
            $table->decimal('hours', 5, 2);
            $table->string('facilitator', 100)->nullable();
            $table->string('venue', 100)->nullable();
            $table->integer('capacity')->nullable();
            $table->text('remarks')->nullable();
            $table->boolean('requires_approval')->default(false);
            $table
                ->foreignId('request_type_id')
                ->nullable()
                ->constrained('request_types')
                ->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index('reference_number', 'idx_training_reference_number');
        });

        // 🔹 Allowed Departments (Many-to-Many)
        Schema::create('training_allowed_departments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('training_id');
            $table->unsignedBigInteger('department_id');
            $table->timestamps();

            $table->foreign('training_id')->references('training_id')->on('trainings')->onDelete('cascade');
            $table->foreign('department_id')->references('id')->on('departments')->onDelete('cascade');
        });

        // 🔹 Allowed Faculties (Many-to-Many)
        Schema::create('training_allowed_faculties', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('training_id');
            $table->unsignedBigInteger('faculty_id');
            $table->timestamps();

            $table->foreign('training_id')->references('training_id')->on('trainings')->onDelete('cascade');
            $table->foreign('faculty_id')->references('id')->on('faculties')->onDelete('cascade');
        });

        // 🔹 Allowed Positions (Many-to-Many)
        Schema::create('training_allowed_positions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('training_id');
            $table->unsignedBigInteger('position_id');
            $table->timestamps();

            $table->foreign('training_id')->references('training_id')->on('trainings')->onDelete('cascade');
            $table->foreign('position_id')->references('id')->on('positions')->onDelete('cascade');
        });

        // 🔹 Training Applications
        Schema::create('apply_training', function (Blueprint $table) {
            $table->id('apply_id');
            $table->string('employee_id', 15); // FK to employees
            $table->unsignedBigInteger('training_id');
            $table->timestamp('sign_up_date')->useCurrent();
            $table->enum('attendance', ['Present', 'Absent', 'Excused'])->nullable();
            $table->text('certificate_path')->nullable();
            $table->enum('status', [
                'Signed Up',
                'Approved',
                'Completed',
                'Cancelled',
                'Rejected',
                'No Show',
            ])->default('Signed Up');
            $table->unsignedInteger('re_apply_count')->default(0);
            $table->unsignedBigInteger('request_submission_id')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('training_id')->references('training_id')->on('trainings')->onDelete('cascade');
            $table
                ->foreign('request_submission_id')
                ->references('id')
                ->on('request_submissions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apply_training');
        Schema::dropIfExists('training_allowed_positions');
        Schema::dropIfExists('training_allowed_faculties');
        Schema::dropIfExists('training_allowed_departments');
        Schema::dropIfExists('trainings');
    }
};
