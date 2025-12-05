<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 🔹 Faculties Table
        Schema::create('faculties', function (Blueprint $table) {
            $table->id();
            $table->string('code', 25)->unique();
            $table->string('name', 150)->unique();
            $table->text('description')->nullable();
            $table->enum('type', ['academic', 'administrative'])->default('academic');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        // 🔹 Department Table
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 150)->unique();
            $table->enum('type', ['academic', 'administrative'])->default('academic');
            $table->foreignId('faculty_id')->nullable()->constrained('faculties')->nullOnDelete();
            $table->unsignedBigInteger('head_position_id')->nullable();
            $table->string('faculty_code', 10)->nullable();
            $table->string('faculty_name', 100)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 🔹 Position Table
        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->string('pos_code', 25)->unique();
            $table->string('pos_name', 150);
            $table->text('description')->nullable();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('faculty_id')->nullable()->constrained('faculties')->cascadeOnDelete();
            $table->integer('hierarchy_level')->default(1);
            $table->string('position_type', 50)->nullable();
            $table->string('slug', 255)->nullable()->index();
            $table->enum('creation_type', ['manual', 'auto'])->default('manual');
            $table->enum('position_category', [
                'executive',
                'academic_teaching',
                'academic_support',
                'administrative_non_teaching',
                'technical_skilled',
                'support_utility',
                'specialized_compliance',
            ])->nullable();
            $table->unsignedInteger('capacity')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 🔹 Employees Table (Manual PK: employee_id)
        Schema::create('employees', function (Blueprint $table) {
            $table->string('id', 15)->primary(); // Not auto-increment
            $table->string('surname', 50);
            $table->string('first_name', 50);
            $table->string('middle_name', 50)->nullable();
            $table->string('name_extension', 5)->nullable();
            $table->enum('status', ['active', 'inactive', 'on-leave'])->default('active');
            $table->enum('employment_status', ['Regular', 'Contractual', 'Job-Order', 'Probationary'])->default('Probationary');
            $table->enum('employee_type', ['Teaching', 'Non-Teaching'])->default('Teaching');
            $table->foreignId('department_id')->nullable()->constrained('departments')->cascadeOnDelete();
            $table->foreignId('position_id')->constrained('positions')->cascadeOnDelete();
            $table->date('date_hired')->nullable();
            $table->date('date_regularized')->nullable();
            $table->date('birth_date');
            $table->string('birth_place', 100);
            $table->enum('sex', ['Male', 'Female']);
            $table->string('civil_status', 15);
            $table->decimal('height_m', 5, 2);
            $table->decimal('weight_kg', 6, 2);
            $table->string('blood_type', 3)->nullable();
            $table->string('gsis_id_no', 25)->nullable()->index();
            $table->string('pagibig_id_no', 25)->nullable();
            $table->string('philhealth_no', 25)->nullable();
            $table->string('sss_no', 25)->nullable()->index();
            $table->string('tin_no', 25)->nullable()->index();
            $table->string('agency_employee_no', 25)->nullable();
            $table->string('citizenship', 30);
            $table->boolean('dual_citizenship')->default(false);
            $table->enum('citizenship_type', ['By birth', 'By naturalization'])->nullable();
            $table->string('dual_citizenship_country', 50)->nullable();
            $table->string('res_house_no', 15)->nullable();
            $table->string('res_street', 50)->nullable();
            $table->string('res_subdivision', 50)->nullable();
            $table->string('res_barangay', 50)->nullable();
            $table->string('res_city', 50)->nullable();
            $table->string('res_province', 50)->nullable();
            $table->string('res_zip_code', 10)->nullable();
            $table->string('perm_house_no', 15)->nullable();
            $table->string('perm_street', 50)->nullable();
            $table->string('perm_subdivision', 50)->nullable();
            $table->string('perm_barangay', 50)->nullable();
            $table->string('perm_city', 50)->nullable();
            $table->string('perm_province', 50)->nullable();
            $table->string('perm_zip_code', 10)->nullable();
            $table->string('telephone_no', 20)->nullable();
            $table->string('mobile_no', 20)->nullable()->index();
            $table->string('email_address', 80)->nullable()->index();
            $table->string('government_issued_id', 50)->nullable();
            $table->string('id_number', 25)->nullable();
            $table->date('id_date_issued')->nullable();
            $table->string('id_place_of_issue', 100)->nullable();
            $table->string('indigenous_group', 50)->nullable();
            $table->string('pwd_id_no', 50)->nullable();
            $table->string('solo_parent_id_no', 50)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // All child tables reference employee_id (string)
        Schema::create('employee_family_backgrounds', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->enum('relation', ['Father', 'Mother', 'Spouse']);
            $table->string('surname', 50);
            $table->string('first_name', 50);
            $table->string('middle_name', 50)->nullable();
            $table->string('name_extension', 5)->nullable();
            $table->string('occupation', 50)->nullable();
            $table->string('employer', 100)->nullable();
            $table->string('business_address', 100)->nullable();
            $table->string('telephone_no', 20)->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
        });

        Schema::create('employee_childrens', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->string('full_name', 100);
            $table->date('birth_date');
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
        });

        Schema::create('employee_educational_backgrounds', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->string('level', 255)->notNull(); // VARCHAR instead of ENUM to accommodate any educational level
            $table->string('school_name', 255);
            $table->string('degree_course', 255)->nullable();
            $table->date('period_from');
            $table->date('period_to');
            $table->string('highest_level_units', 255)->nullable();
            $table->year('year_graduated')->nullable();
            $table->string('honors_received', 255)->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
        });

        Schema::create('employee_civil_service_eligibilities', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->string('eligibility', 80);
            $table->string('rating', 10)->nullable();
            $table->date('exam_date')->nullable();
            $table->string('exam_place', 100)->nullable();
            $table->string('license_no', 30)->nullable();
            $table->date('license_validity')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
        });

        Schema::create('employee_work_experiences', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->string('position_title', 100);
            $table->string('company_name', 100);
            $table->string('company_address', 100)->nullable();
            $table->date('date_from');
            $table->date('date_to')->nullable();
            $table->decimal('monthly_salary', 10, 2)->nullable();
            $table->string('salary_grade_step', 7)->nullable();
            $table->string('status_of_appointment', 20);
            $table->boolean('is_gov_service')->default(false);
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
        });

        Schema::create('employee_voluntary_works', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->string('organization_name', 100);
            $table->string('organization_address', 100)->nullable();
            $table->date('date_from');
            $table->date('date_to')->nullable();
            $table->integer('hours_rendered');
            $table->string('position_or_nature', 50);
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
        });

        Schema::create('employee_learning_developments', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->string('title', 100);
            $table->date('date_from');
            $table->date('date_to');
            $table->integer('hours');
            $table->enum('type_of_ld', ['Managerial', 'Supervisory', 'Technical', 'Foundation', 'Others']);
            $table->string('conducted_by', 100);
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
        });

        Schema::create('employee_other_information', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->text('skill_or_hobby')->nullable();
            $table->text('non_academic_distinctions')->nullable();
            $table->text('memberships')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
        });

        Schema::create('questionnaires', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->integer('question_number');
            $table->boolean('answer');
            $table->text('details')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
        });

        Schema::create('references', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 15);
            $table->string('first_name', 50);
            $table->string('middle_initial', 5)->nullable();
            $table->string('surname', 50);
            $table->string('address', 100);
            $table->string('telephone_no', 20)->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('references');
        Schema::dropIfExists('questionnaires');
        Schema::dropIfExists('employee_other_information');
        Schema::dropIfExists('employee_learning_developments');
        Schema::dropIfExists('employee_voluntary_works');
        Schema::dropIfExists('employee_work_experiences');
        Schema::dropIfExists('employee_civil_service_eligibilities');
        Schema::dropIfExists('employee_educational_backgrounds');
        Schema::dropIfExists('employee_childrens');
        Schema::dropIfExists('employee_family_backgrounds');
        Schema::dropIfExists('employees');
        Schema::dropIfExists('positions');
        Schema::dropIfExists('departments');
        Schema::dropIfExists('faculties');
    }
};