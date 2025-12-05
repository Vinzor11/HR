export interface FamilyBackground {
  relation: string;
  surname: string;
  first_name: string;
  middle_name: string;
  name_extension: string;
  occupation: string;
  employer: string;
  business_address: string;
  telephone_no: string;
}

export interface Child {
  full_name: string;
  birth_date: string;
}

export interface EducationalBackground {
  level: string;
  school_name: string;
  degree_course: string;
  period_from: string;
  period_to: string;
  highest_level_units: string;
  year_graduated: string;
  honors_received: string;
}

export interface CivilServiceEligibility {
  eligibility: string;
  rating: string;
  exam_date: string;
  exam_place: string;
  license_no: string;
  license_validity: string;
}

export interface WorkExperience {
  position_title: string;
  company_name: string;
  company_address: string;
  date_from: string;
  date_to: string;
  monthly_salary: string;
  salary_grade_step: string;
  status_of_appointment: string;
  is_gov_service: boolean;
}

export interface VoluntaryWork {
  organization_name: string;
  organization_address: string;
  date_from: string;
  date_to: string;
  hours_rendered: string;
  position_or_nature: string;
}

export interface LearningAndDevelopment {
  title: string;
  date_from: string;
  date_to: string;
  hours: string;
  type_of_ld: string;
  conducted_by: string;
}

export interface OtherInformation {
  skill_or_hobby: string;
  non_academic_distinctions: string;
  memberships: string;
}

export interface Reference {
  fullname: string;
  address: string;
  telephone_no: string;
}

export interface Questionnaire {
  question_number: number;
  answer: boolean;
  details: string;
}

export interface FormData {
  id: string;
  surname: string;
  first_name: string;
  middle_name: string;
  name_extension: string;
  status: string;
  employment_status: string;
  employee_type: string;
  faculty_id: string;
  department_id: string;
  position_id: string;
  date_hired: string;
  date_regularized: string;
  birth_date: string;
  birth_place: string;
  sex: string;
  civil_status: string;
  height_m: string;
  weight_kg: string;
  blood_type: string;
  gsis_id_no: string;
  pagibig_id_no: string;
  philhealth_no: string;
  sss_no: string;
  tin_no: string;
  agency_employee_no: string;
  citizenship: string;
  dual_citizenship: boolean;
  citizenship_type: string;
  dual_citizenship_country: string;
  res_house_no: string;
  res_street: string;
  res_subdivision: string;
  res_barangay: string;
  res_city: string;
  res_province: string;
  res_zip_code: string;
  perm_house_no: string;
  perm_street: string;
  perm_subdivision: string;
  perm_barangay: string;
  perm_city: string;
  perm_province: string;
  perm_zip_code: string;
  telephone_no: string;
  mobile_no: string;
  email_address: string;
  government_issued_id: string;
  id_number: string;
  id_date_issued: string;
  id_place_of_issue: string;
  indigenous_group: string;
  pwd_id_no: string;
  solo_parent_id_no: string;
  family_background: FamilyBackground[];
  children: Child[];
  educational_background: EducationalBackground[];
  civil_service_eligibility: CivilServiceEligibility[];
  work_experience: WorkExperience[];
  voluntary_work: VoluntaryWork[];
  learning_development: LearningAndDevelopment[];
  other_information: OtherInformation;
  references: Reference[];
  questionnaire: Questionnaire[];
}

export interface CreateEmployeeProps {
  employee?: Partial<FormData>;
  departments: { id: number; faculty_name: string; faculty_id?: number | null }[];
  positions: { id: number; pos_name: string; department_id?: number | null; faculty_id?: number | null }[];
  faculties: { id: number; name: string; code?: string | null }[];
}