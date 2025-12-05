import { LucideIcon } from 'lucide-react';

// Helper function
export const getNestedValue = <T extends Record<string, any>>(obj: T, path: string): any =>
  path.split('.').reduce((acc, key) => acc?.[key], obj);

const formatDateValue = (value: string | null | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Employee Table Configuration
export const EmployeeTableConfig = {
  filterOptions: [
    { label: 'Identification', value: 'identification' },
    { label: 'Employment', value: 'employment' },
    { label: 'Personal Details', value: 'personal' },
    { label: 'Address', value: 'address' },
    { label: 'Contact', value: 'contact' },
    { label: 'Government IDs', value: 'government' },
    { label: 'Family Background', value: 'family_background' },
    { label: 'Children', value: 'children' },
    { label: 'Education', value: 'educational_background' },
    { label: 'Civil Service', value: 'civil_service_eligibility' },
    { label: 'Work Experience', value: 'work_experience' },
    { label: 'Voluntary Work', value: 'voluntary_work' },
    { label: 'Learning & Development', value: 'learning_development' },
    { label: 'Questionnaires', value: 'questionnaire' },
    { label: 'References', value: 'references' }
  ],

  columns: [
    // ========== Identification ==========
    { label: 'Employee ID', key: 'id', className: 'min-w-[120px] border p-4', group: 'identification', visible: true },
    { label: 'Surname', key: 'surname', className: 'min-w-[150px] border p-4', group: 'identification', visible: true },
    { label: 'First Name', key: 'first_name', className: 'min-w-[150px] border p-4', group: 'identification', visible: true },
    { label: 'Middle Name', key: 'middle_name', className: 'min-w-[150px] border p-4', group: 'identification', visible: false },
    { label: 'Name Extension', key: 'name_extension', className: 'min-w-[80px] border p-4', group: 'identification', visible: false },

    // ========== Employment ==========
    { label: 'Position', key: 'position.pos_name', className: 'min-w-[180px] border p-4', group: 'employment', visible: true },
    { label: 'Department', key: 'department.faculty_name', className: 'min-w-[200px] border p-4', group: 'employment', visible: true },
    { label: 'Status', key: 'status', className: 'min-w-[100px] capitalize border p-4', group: 'employment', visible: true },
    { label: 'Employee Type', key: 'employee_type', className: 'min-w-[120px] border p-4', group: 'employment', visible: true },
    { label: 'Employment Status', key: 'employment_status', className: 'min-w-[150px] border p-4', group: 'employment', visible: true },
    { label: 'Date Hired', key: 'date_hired', className: 'min-w-[140px] border p-4', group: 'employment', visible: true, format: formatDateValue },
    { label: 'Date Regularized', key: 'date_regularized', className: 'min-w-[160px] border p-4', group: 'employment', visible: true, format: formatDateValue },

    // ========== Personal Details ==========
    { label: 'Birth Date', key: 'birth_date', className: 'min-w-[120px] border p-4', group: 'personal', visible: false },
    { label: 'Birth Place', key: 'birth_place', className: 'min-w-[200px] border p-4', group: 'personal', visible: false },
    { label: 'Sex', key: 'sex', className: 'min-w-[80px] border p-4', group: 'personal', visible: false },
    { label: 'Civil Status', key: 'civil_status', className: 'min-w-[120px] border p-4', group: 'personal', visible: false },
    { label: 'Height (m)', key: 'height_m', className: 'min-w-[100px] border p-4', group: 'personal', visible: false },
    { label: 'Weight (kg)', key: 'weight_kg', className: 'min-w-[100px] border p-4', group: 'personal', visible: false },
    { label: 'Blood Type', key: 'blood_type', className: 'min-w-[100px] border p-4', group: 'personal', visible: false },
    { label: 'Citizenship', key: 'citizenship', className: 'min-w-[120px] border p-4', group: 'personal', visible: false },
    { label: 'Dual Citizenship', key: 'dual_citizenship', className: 'min-w-[120px] border p-4', group: 'personal', visible: false },
    { label: 'Citizenship Type', key: 'citizenship_type', className: 'min-w-[150px] border p-4', group: 'personal', visible: false },
    { label: 'Dual Citizenship Country', key: 'dual_citizenship_country', className: 'min-w-[180px] border p-4', group: 'personal', visible: false },

    // ========== Address ==========
    { label: 'Res House No', key: 'res_house_no', className: 'min-w-[120px] border p-4', group: 'address', visible: false },
    { label: 'Res Street', key: 'res_street', className: 'min-w-[150px] border p-4', group: 'address', visible: false },
    { label: 'Res Subdivision', key: 'res_subdivision', className: 'min-w-[150px] border p-4', group: 'address', visible: false },
    { label: 'Res Barangay', key: 'res_barangay', className: 'min-w-[150px] border p-4', group: 'address', visible: false },
    { label: 'Res City', key: 'res_city', className: 'min-w-[150px] border p-4', group: 'address', visible: false },
    { label: 'Res Province', key: 'res_province', className: 'min-w-[150px] border p-4', group: 'address', visible: false },
    { label: 'Res Zip Code', key: 'res_zip_code', className: 'min-w-[100px] border p-4', group: 'address', visible: false },
    { label: 'Perm House No', key: 'perm_house_no', className: 'min-w-[120px] border p-4', group: 'address', visible: false },
    { label: 'Perm Street', key: 'perm_street', className: 'min-w-[150px] border p-4', group: 'address', visible: false },
    { label: 'Perm Subdivision', key: 'perm_subdivision', className: 'min-w-[150px] border p-4', group: 'address', visible: false },
    { label: 'Perm Barangay', key: 'perm_barangay', className: 'min-w-[150px] border p-4', group: 'address', visible: false },
    { label: 'Perm City', key: 'perm_city', className: 'min-w-[150px] border p-4', group: 'address', visible: false },
    { label: 'Perm Province', key: 'perm_province', className: 'min-w-[150px] border p-4', group: 'address', visible: false },
    { label: 'Perm Zip Code', key: 'perm_zip_code', className: 'min-w-[100px] border p-4', group: 'address', visible: false },

    // ========== Contact ==========
    { label: 'Telephone', key: 'telephone_no', className: 'min-w-[120px] border p-4', group: 'contact', visible: false },
    { label: 'Mobile', key: 'mobile_no', className: 'min-w-[120px] border p-4', group: 'contact', visible: true },
    { label: 'Email', key: 'email_address', className: 'min-w-[200px] border p-4', group: 'contact', visible: true },

    // ========== Government IDs ==========
    { label: 'GSIS', key: 'gsis_id_no', className: 'min-w-[120px] border p-4', group: 'government', visible: false },
    { label: 'PAGIBIG', key: 'pagibig_id_no', className: 'min-w-[120px] border p-4', group: 'government', visible: false },
    { label: 'PhilHealth', key: 'philhealth_no', className: 'min-w-[120px] border p-4', group: 'government', visible: false },
    { label: 'SSS', key: 'sss_no', className: 'min-w-[120px] border p-4', group: 'government', visible: false },
    { label: 'TIN', key: 'tin_no', className: 'min-w-[120px] border p-4', group: 'government', visible: false },
    { label: 'Agency Employee No', key: 'agency_employee_no', className: 'min-w-[150px] border p-4', group: 'government', visible: false },
    { label: 'Government Issued ID', key: 'government_issued_id', className: 'min-w-[150px] border p-4', group: 'government', visible: false },
    { label: 'ID Number', key: 'id_number', className: 'min-w-[120px] border p-4', group: 'government', visible: false },
    { label: 'ID Date Issued', key: 'id_date_issued', className: 'min-w-[120px] border p-4', group: 'government', visible: false },
    { label: 'ID Place of Issue', key: 'id_place_of_issue', className: 'min-w-[180px] border p-4', group: 'government', visible: false },
    { label: 'Indigenous Group', key: 'indigenous_group', className: 'min-w-[150px] border p-4', group: 'government', visible: false },
    { label: 'PWD ID No', key: 'pwd_id_no', className: 'min-w-[120px] border p-4', group: 'government', visible: false },
    { label: 'Solo Parent ID No', key: 'solo_parent_id_no', className: 'min-w-[150px] border p-4', group: 'government', visible: false },

    // ========== Family Background ==========
    { label: 'Family Relation', key: 'family_background.relation', displayKey: 'relation', className: 'min-w-[120px] border p-4', group: 'family_background', visible: false, type: 'multi-values' },
    { label: 'Family Surname', key: 'family_background.surname', displayKey: 'surname', className: 'min-w-[150px] border p-4', group: 'family_background', visible: false, type: 'multi-values' },
    { label: 'Family First Name', key: 'family_background.first_name', displayKey: 'first_name', className: 'min-w-[150px] border p-4', group: 'family_background', visible: false, type: 'multi-values' },
    { label: 'Family Middle Name', key: 'family_background.middle_name', displayKey: 'middle_name', className: 'min-w-[150px] border p-4', group: 'family_background', visible: false, type: 'multi-values' },
    { label: 'Family Name Extension', key: 'family_background.name_extension', displayKey: 'name_extension', className: 'min-w-[80px] border p-4', group: 'family_background', visible: false, type: 'multi-values' },
    { label: 'Family Occupation', key: 'family_background.occupation', displayKey: 'occupation', className: 'min-w-[150px] border p-4', group: 'family_background', visible: false, type: 'multi-values' },
    { label: 'Family Employer', key: 'family_background.employer', displayKey: 'employer', className: 'min-w-[150px] border p-4', group: 'family_background', visible: false, type: 'multi-values' },
    { label: 'Family Business Address', key: 'family_background.business_address', displayKey: 'business_address', className: 'min-w-[200px] border p-4', group: 'family_background', visible: false, type: 'multi-values' },
    { label: 'Family Telephone', key: 'family_background.telephone_no', displayKey: 'telephone_no', className: 'min-w-[120px] border p-4', group: 'family_background', visible: false, type: 'multi-values' },

    // ========== Children ==========
    { label: 'Child Name', key: 'children.full_name', displayKey: 'full_name', className: 'min-w-[200px] border p-4', group: 'children', visible: false, type: 'multi-values' },
    { label: 'Child Birth Date', key: 'children.birth_date', displayKey: 'birth_date', className: 'min-w-[120px] border p-4', group: 'children', visible: false, type: 'multi-values' },

    // ========== Education ==========
    { label: 'Education Level', key: 'educational_background.level', displayKey: 'level', className: 'min-w-[120px] border p-4', group: 'educational_background', visible: false, type: 'multi-values' },
    { label: 'School Name', key: 'educational_background.school_name', displayKey: 'school_name', className: 'min-w-[200px] border p-4', group: 'educational_background', visible: false, type: 'multi-values' },
    { label: 'Degree/Course', key: 'educational_background.degree_course', displayKey: 'degree_course', className: 'min-w-[200px] border p-4', group: 'educational_background', visible: false, type: 'multi-values' },
    { label: 'Period From', key: 'educational_background.period_from', displayKey: 'period_from', className: 'min-w-[120px] border p-4', group: 'educational_background', visible: false, type: 'multi-values' },
    { label: 'Period To', key: 'educational_background.period_to', displayKey: 'period_to', className: 'min-w-[120px] border p-4', group: 'educational_background', visible: false, type: 'multi-values' },
    { label: 'Highest Level/Units', key: 'educational_background.highest_level_units', displayKey: 'highest_level_units', className: 'min-w-[150px] border p-4', group: 'educational_background', visible: false, type: 'multi-values' },
    { label: 'Year Graduated', key: 'educational_background.year_graduated', displayKey: 'year_graduated', className: 'min-w-[120px] border p-4', group: 'educational_background', visible: false, type: 'multi-values' },
    { label: 'Honors Received', key: 'educational_background.honors_received', displayKey: 'honors_received', className: 'min-w-[200px] border p-4', group: 'educational_background', visible: false, type: 'multi-values' },

    // ========== Civil Service ==========
    { label: 'Eligibility', key: 'civil_service_eligibility.eligibility', displayKey: 'eligibility', className: 'min-w-[200px] border p-4', group: 'civil_service_eligibility', visible: false, type: 'multi-values' },
    { label: 'Rating', key: 'civil_service_eligibility.rating', displayKey: 'rating', className: 'min-w-[80px] border p-4', group: 'civil_service_eligibility', visible: false, type: 'multi-values' },
    { label: 'Exam Date', key: 'civil_service_eligibility.exam_date', displayKey: 'exam_date', className: 'min-w-[120px] border p-4', group: 'civil_service_eligibility', visible: false, type: 'multi-values' },
    { label: 'Exam Place', key: 'civil_service_eligibility.exam_place', displayKey: 'exam_place', className: 'min-w-[200px] border p-4', group: 'civil_service_eligibility', visible: false, type: 'multi-values' },
    { label: 'License No', key: 'civil_service_eligibility.license_no', displayKey: 'license_no', className: 'min-w-[120px] border p-4', group: 'civil_service_eligibility', visible: false, type: 'multi-values' },
    { label: 'License Validity', key: 'civil_service_eligibility.license_validity', displayKey: 'license_validity', className: 'min-w-[120px] border p-4', group: 'civil_service_eligibility', visible: false, type: 'multi-values' },

    // ========== Work Experience ==========
    { label: 'Position Title', key: 'work_experience.position_title', displayKey: 'position_title', className: 'min-w-[200px] border p-4', group: 'work_experience', visible: false, type: 'multi-values' },
    { label: 'Company Name', key: 'work_experience.company_name', displayKey: 'company_name', className: 'min-w-[200px] border p-4', group: 'work_experience', visible: false, type: 'multi-values' },
    { label: 'Company Address', key: 'work_experience.company_address', displayKey: 'company_address', className: 'min-w-[200px] border p-4', group: 'work_experience', visible: false, type: 'multi-values' },
    { label: 'Date From', key: 'work_experience.date_from', displayKey: 'date_from', className: 'min-w-[120px] border p-4', group: 'work_experience', visible: false, type: 'multi-values' },
    { label: 'Date To', key: 'work_experience.date_to', displayKey: 'date_to', className: 'min-w-[120px] border p-4', group: 'work_experience', visible: false, type: 'multi-values' },
    { label: 'Monthly Salary', key: 'work_experience.monthly_salary', displayKey: 'monthly_salary', className: 'min-w-[120px] border p-4', group: 'work_experience', visible: false, type: 'multi-values' },
    { label: 'Salary Grade/Step', key: 'work_experience.salary_grade_step', displayKey: 'salary_grade_step', className: 'min-w-[120px] border p-4', group: 'work_experience', visible: false, type: 'multi-values' },
    { label: 'Appointment Status', key: 'work_experience.status_of_appointment', displayKey: 'status_of_appointment', className: 'min-w-[150px] border p-4', group: 'work_experience', visible: false, type: 'multi-values' },
    { label: 'Government Service', key: 'work_experience.is_gov_service', displayKey: 'is_gov_service', className: 'min-w-[120px] border p-4', group: 'work_experience', visible: false, type: 'multi-values' },

    // ========== Voluntary Work ==========
    { label: 'Organization Name', key: 'voluntary_work.organization_name', displayKey: 'organization_name', className: 'min-w-[200px] border p-4', group: 'voluntary_work', visible: false, type: 'multi-values' },
    { label: 'Organization Address', key: 'voluntary_work.organization_address', displayKey: 'organization_address', className: 'min-w-[200px] border p-4', group: 'voluntary_work', visible: false, type: 'multi-values' },
    { label: 'Date From', key: 'voluntary_work.date_from', displayKey: 'date_from', className: 'min-w-[120px] border p-4', group: 'voluntary_work', visible: false, type: 'multi-values' },
    { label: 'Date To', key: 'voluntary_work.date_to', displayKey: 'date_to', className: 'min-w-[120px] border p-4', group: 'voluntary_work', visible: false, type: 'multi-values' },
    { label: 'Hours Rendered', key: 'voluntary_work.hours_rendered', displayKey: 'hours_rendered', className: 'min-w-[120px] border p-4', group: 'voluntary_work', visible: false, type: 'multi-values' },
    { label: 'Position/Nature', key: 'voluntary_work.position_or_nature', displayKey: 'position_or_nature', className: 'min-w-[150px] border p-4', group: 'voluntary_work', visible: false, type: 'multi-values' },

    // ========== Learning & Development ==========
    { label: 'Title', key: 'learning_development.title', displayKey: 'title', className: 'min-w-[200px] border p-4', group: 'learning_development', visible: false, type: 'multi-values' },
    { label: 'Date From', key: 'learning_development.date_from', displayKey: 'date_from', className: 'min-w-[120px] border p-4', group: 'learning_development', visible: false, type: 'multi-values' },
    { label: 'Date To', key: 'learning_development.date_to', displayKey: 'date_to', className: 'min-w-[120px] border p-4', group: 'learning_development', visible: false, type: 'multi-values' },
    { label: 'Hours', key: 'learning_development.hours', displayKey: 'hours', className: 'min-w-[80px] border p-4', group: 'learning_development', visible: false, type: 'multi-values' },
    { label: 'Type', key: 'learning_development.type_of_ld', displayKey: 'type_of_ld', className: 'min-w-[120px] border p-4', group: 'learning_development', visible: false, type: 'multi-values' },
    { label: 'Conducted By', key: 'learning_development.conducted_by', displayKey: 'conducted_by', className: 'min-w-[200px] border p-4', group: 'learning_development', visible: false, type: 'multi-values' },

    // ========== Other Information ==========
    { label: 'Skills/Hobbies', key: 'other_information.skill_or_hobby', className: 'min-w-[200px] border p-4', group: 'other_information', visible: false },
    { label: 'Non-Academic Distinctions', key: 'other_information.non_academic_distinctions', className: 'min-w-[200px] border p-4', group: 'other_information', visible: false },
    { label: 'Memberships', key: 'other_information.memberships', className: 'min-w-[200px] border p-4', group: 'other_information', visible: false },

    // ========== Questionnaires ==========
    { label: 'Question Number', key: 'questionnaire.question_number', displayKey: 'question_number', className: 'min-w-[120px] border p-4', group: 'questionnaire', visible: false, type: 'multi-values' },
    { label: 'Answer', key: 'questionnaire.answer', displayKey: 'answer', className: 'min-w-[80px] border p-4', group: 'questionnaire', visible: false, type: 'multi-values' },
    { label: 'Details', key: 'questionnaire.details', displayKey: 'details', className: 'min-w-[200px] border p-4', group: 'questionnaire', visible: false, type: 'multi-values' },

    // ========== References ==========
    { label: 'Reference First Name', key: 'references.first_name', displayKey: 'first_name', className: 'min-w-[150px] border p-4', group: 'references', visible: false, type: 'multi-values' },
    { label: 'Reference Middle Initial', key: 'references.middle_initial', displayKey: 'middle_initial', className: 'min-w-[80px] border p-4', group: 'references', visible: false, type: 'multi-values' },
    { label: 'Reference Surname', key: 'references.surname', displayKey: 'surname', className: 'min-w-[150px] border p-4', group: 'references', visible: false, type: 'multi-values' },
    { label: 'Reference Address', key: 'references.address', displayKey: 'address', className: 'min-w-[200px] border p-4', group: 'references', visible: false, type: 'multi-values' },
    { label: 'Reference Telephone', key: 'references.telephone_no', displayKey: 'telephone_no', className: 'min-w-[120px] border p-4', group: 'references', visible: false, type: 'multi-values' },

    // ========== Actions ==========
    { 
      label: 'Actions', 
      key: 'actions', 
      isAction: true, 
      className: 'sticky right-0 z-15 min-w-[180px] border p-4', 
      group: 'actions', 
      alwaysVisible: true,
    }
  ],

  actions: [
    { label: 'View', icon: 'Eye', className: 'cursor-pointer rounded-lg bg-sky-600 p-2 text-white hover:opacity-90', permission: 'view-employee'},
    { label: 'Edit', icon: 'Pencil', className: 'ms-2 cursor-pointer rounded-lg bg-blue-600 p-2 text-white hover:opacity-90', permission: 'edit-employee'},
    { label: 'Delete', icon: 'Trash2', route: 'employees.destroy', className:'ms-2 cursor-pointer rounded-lg bg-red-600 p-2 text-white hover:opacity-90', permission: 'delete-employee'}
  ]
};

