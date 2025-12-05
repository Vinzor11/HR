<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'surname',
        'first_name',
        'middle_name',
        'name_extension',
        'status',
        'employment_status',
        'employee_type',
        'department_id',
        'position_id',
        'date_hired',
        'date_regularized',
        'birth_date',
        'birth_place',
        'sex',
        'civil_status',
        'height_m',
        'weight_kg',
        'blood_type',
        'gsis_id_no',
        'pagibig_id_no',
        'philhealth_no',
        'sss_no',
        'tin_no',
        'agency_employee_no',
        'citizenship',
        'dual_citizenship',
        'citizenship_type',
        'dual_citizenship_country',
        'res_house_no',
        'res_street',
        'res_subdivision',
        'res_barangay',
        'res_city',
        'res_province',
        'res_zip_code',
        'perm_house_no',
        'perm_street',
        'perm_subdivision',
        'perm_barangay',
        'perm_city',
        'perm_province',
        'perm_zip_code',
        'telephone_no',
        'mobile_no',
        'email_address',
        'government_issued_id',
        'id_number',
        'id_date_issued',
        'id_place_of_issue',
        'indigenous_group',
        'pwd_id_no',
        'solo_parent_id_no'
    ];

    protected $casts = [
        'birth_date' => 'date',
        'id_date_issued' => 'date',
        'dual_citizenship' => 'boolean',
        'date_hired' => 'date',
        'date_regularized' => 'date',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function position()
    {
        return $this->belongsTo(Position::class);
    }

    public function user()
    {
        return $this->hasOne(User::class, 'employee_id', 'id');
    }

    public function familyBackground()
    {
        return $this->hasMany(EmployeeFamilyBackground::class, 'employee_id', 'id');
    }

    public function children()
    {
        return $this->hasMany(EmployeeChildren::class, 'employee_id', 'id');
    }

    public function educationalBackground()
    {
        return $this->hasMany(EmployeeEducationalBackground::class, 'employee_id', 'id');
    }

    public function civilServiceEligibility()
    {
        return $this->hasMany(EmployeeCivilServiceEligibility::class, 'employee_id', 'id');
    }

    public function workExperience()
    {
        return $this->hasMany(EmployeeWorkExperience::class, 'employee_id', 'id');
    }

    public function voluntaryWork()
    {
        return $this->hasMany(EmployeeVoluntaryWork::class, 'employee_id', 'id');
    }

    public function learningDevelopment()
    {
        return $this->hasMany(EmployeeLearningDevelopment::class, 'employee_id', 'id');
    }

    public function otherInformation()
    {
        return $this->hasOne(EmployeeOtherInformation::class, 'employee_id', 'id');
    }

    public function questionnaire()
    {
        return $this->hasMany(Questionnaire::class, 'employee_id', 'id');
    }

    public function references()
    {
        return $this->hasMany(Reference::class, 'employee_id', 'id');
    }

    public function auditLogs()
    {
        return $this->hasMany(EmployeeAuditLog::class, 'employee_id', 'id')->orderBy('action_date', 'desc');
    }
}