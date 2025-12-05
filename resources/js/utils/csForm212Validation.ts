/**
 * CS Form 212 Compliant Validation Rules
 * Based on Civil Service Commission Personal Data Sheet requirements
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  requiredErrors: Record<string, string>;
  formatErrors: Record<string, string>;
}

/**
 * Validates name fields (letters, spaces, hyphens only, max 100 chars)
 */
export const validateName = (value: string | undefined | null, fieldName: string): string | null => {
  if (!value || value.trim() === '') {
    return null; // Empty is handled by required validation
  }
  
  if (value.length > 100) {
    return `${fieldName} must not exceed 100 characters`;
  }
  
  // Allow letters, spaces, hyphens, apostrophes, and periods
  if (!/^[a-zA-Z\s\-'\.]+$/.test(value)) {
    return `${fieldName} can only contain letters, spaces, hyphens, apostrophes, and periods`;
  }
  
  return null;
};

/**
 * Validates PhilHealth number (12 digits or ####-#####-## format)
 */
export const validatePhilHealth = (value: string | undefined | null): string | null => {
  if (!value || value.trim() === '') {
    return null; // Optional field
  }
  
  const cleaned = value.replace(/\D/g, ''); // Remove non-digits
  
  // Check if it's exactly 12 digits
  if (cleaned.length === 12) {
    return null;
  }
  
  // Check formatted format: ####-#####-##
  if (/^\d{4}-\d{5}-\d{2}$/.test(value)) {
    return null;
  }
  
  return 'PhilHealth number must be 12 digits or in format ####-#####-##';
};

/**
 * Validates SSS number (10 digits or ##-#######-# format)
 */
export const validateSSS = (value: string | undefined | null): string | null => {
  if (!value || value.trim() === '') {
    return null; // Optional field
  }
  
  const cleaned = value.replace(/\D/g, ''); // Remove non-digits
  
  // Check if it's exactly 10 digits
  if (cleaned.length === 10) {
    return null;
  }
  
  // Check formatted format: ##-#######-#
  if (/^\d{2}-\d{7}-\d{1}$/.test(value)) {
    return null;
  }
  
  return 'SSS number must be 10 digits or in format ##-#######-#';
};

/**
 * Validates TIN number (9-12 digits or ###-###-###-### format)
 */
export const validateTIN = (value: string | undefined | null): string | null => {
  if (!value || value.trim() === '') {
    return null; // Optional field
  }
  
  const cleaned = value.replace(/\D/g, ''); // Remove non-digits
  
  // Check if it's 9-12 digits
  if (cleaned.length >= 9 && cleaned.length <= 12) {
    return null;
  }
  
  // Check formatted format: ###-###-###-### (can have 3-4 groups)
  if (/^\d{3}-\d{3}-\d{3}(-\d{3})?$/.test(value)) {
    return null;
  }
  
  return 'TIN number must be 9-12 digits or in format ###-###-###-###';
};

/**
 * Validates PAG-IBIG number (12-14 digits)
 */
export const validatePagIbig = (value: string | undefined | null): string | null => {
  if (!value || value.trim() === '') {
    return null; // Optional field
  }
  
  const cleaned = value.replace(/\D/g, ''); // Remove non-digits
  
  if (cleaned.length >= 12 && cleaned.length <= 14) {
    return null;
  }
  
  return 'PAG-IBIG number must be 12-14 digits';
};

/**
 * Validates mobile number (exactly 11 digits, PH format)
 */
export const validateMobile = (value: string | undefined | null, required: boolean = false): string | null => {
  if (!value || value.trim() === '') {
    if (required) {
      return 'Mobile number is required';
    }
    return null;
  }
  
  const cleaned = value.replace(/\D/g, ''); // Remove non-digits
  
  if (cleaned.length !== 11) {
    return 'Mobile number must be exactly 11 digits (Philippines format)';
  }
  
  // Check if it starts with 09 (Philippines mobile format)
  if (!cleaned.startsWith('09')) {
    return 'Mobile number must start with 09 (Philippines format)';
  }
  
  return null;
};

/**
 * Validates email address
 */
export const validateEmail = (value: string | undefined | null, required: boolean = true): string | null => {
  if (!value || value.trim() === '') {
    if (required) {
      return 'Email address is required';
    }
    return null;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Please enter a valid email address';
  }
  
  if (value.length > 80) {
    return 'Email address must not exceed 80 characters';
  }
  
  return null;
};

/**
 * Validates zip code (4 digits)
 */
export const validateZipCode = (value: string | undefined | null, required: boolean = false): string | null => {
  if (!value || value.trim() === '') {
    if (required) {
      return 'Zip code is required';
    }
    return null;
  }
  
  const cleaned = value.replace(/\D/g, ''); // Remove non-digits
  
  if (cleaned.length !== 4) {
    return 'Zip code must be exactly 4 digits';
  }
  
  return null;
};

/**
 * Validates date is not in the future
 */
export const validateDateNotFuture = (value: string | undefined | null, fieldName: string): string | null => {
  if (!value || value.trim() === '') {
    return null; // Empty is handled by required validation
  }
  
  // Parse date similar to validateDateRange to avoid timezone issues
  const dateParts = value.split('-').map(Number);
  if (dateParts.length !== 3) {
    return 'is not a valid date'; // Field name will be added by formatFieldName
  }
  
  // Create date at local midnight (no timezone conversion)
  const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  if (isNaN(date.getTime())) {
    return 'is not a valid date'; // Field name will be added by formatFieldName
  }
  
  // Compare dates - date should not be after today
  if (date > today) {
    return 'cannot be in the future'; // Field name will be added by formatFieldName
  }
  
  return null;
};

/**
 * Validates date range (from date must be before to date)
 * Compares dates only, ignoring time components to avoid timezone issues
 */
export const validateDateRange = (
  fromDate: string | undefined | null,
  toDate: string | undefined | null,
  fieldName: string
): string | null => {
  if (!fromDate || !toDate) {
    return null; // Empty dates are handled by required validation
  }
  
  // Parse dates - date input values are in YYYY-MM-DD format
  // Create Date objects at local midnight to avoid timezone issues
  const fromParts = fromDate.split('-').map(Number);
  const toParts = toDate.split('-').map(Number);
  
  if (fromParts.length !== 3 || toParts.length !== 3) {
    return null; // Invalid date format
  }
  
  // Create dates at local midnight (no timezone conversion)
  const from = new Date(fromParts[0], fromParts[1] - 1, fromParts[2]);
  const to = new Date(toParts[0], toParts[1] - 1, toParts[2]);
  
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return null; // Invalid dates handled elsewhere
  }
  
  // Compare dates - from should be <= to
  if (from > to) {
    return '"From" date must be before or equal to "To" date'; // Field name will be added by formatFieldName
  }
  
  return null;
};

/**
 * Validates questionnaire - requires details when answer is Yes/True
 */
export const validateQuestionnaire = (
  answer: boolean | string | number | undefined | null,
  details: string | undefined | null,
  questionNumber: number
): string | null => {
  // Convert to boolean
  const isYes = answer === true || answer === 1 || answer === '1' || 
                String(answer).toLowerCase() === 'true' || 
                String(answer).toLowerCase() === 'yes';
  
  if (isYes && (!details || details.trim() === '')) {
    return `Question ${questionNumber}: Details are required when answer is "Yes"`;
  }
  
  return null;
};

/**
 * Validates character limit
 */
export const validateMaxLength = (
  value: string | undefined | null,
  maxLength: number,
  fieldName: string
): string | null => {
  if (!value) {
    return null;
  }
  
  if (value.length > maxLength) {
    return `${fieldName} must not exceed ${maxLength} characters`;
  }
  
  return null;
};

/**
 * Check if a field is required (for required validation only)
 */
const isRequiredField = (key: string): boolean => {
  const requiredFields = [
    'id', 'surname', 'first_name', 'birth_date', 'birth_place', 'sex', 'civil_status',
    'email_address', 'mobile_no', 'res_city', 'res_province', 'res_zip_code',
    'faculty_id', 'department_id', 'position_id', 'employee_type', 'status', 'employment_status',
    'date_hired', 'citizenship'
  ];
  return requiredFields.includes(key);
};

/**
 * Comprehensive validation for employee data (CS Form 212 compliant)
 * Returns separate required and format errors
 */
export const validateEmployeeData = (data: Record<string, any>, positions?: Array<{ id: number | string; faculty_id?: number | string | null; department_id?: number | string | null }>): ValidationResult => {
  const requiredErrors: Record<string, string> = {};
  const formatErrors: Record<string, string> = {};

  // Required Employee ID (only for create, not edit)
  // Note: In edit mode, id should already exist, but we'll validate it's present
  if (!data.id || data.id.trim() === '') {
    requiredErrors.id = 'Employee ID is required';
  } else {
    // Validate ID format (max 15 characters, alphanumeric)
    if (data.id.length > 15) {
      formatErrors.id = 'Employee ID must not exceed 15 characters';
    }
    if (!/^[a-zA-Z0-9\-_]+$/.test(data.id)) {
      formatErrors.id = 'Employee ID can only contain letters, numbers, hyphens, and underscores';
    }
  }

  // Required Personal Information Fields
  if (!data.surname || data.surname.trim() === '') {
    requiredErrors.surname = 'Surname is required';
  } else {
    const nameError = validateName(data.surname, 'Surname');
    if (nameError) formatErrors.surname = nameError;
  }

  if (!data.first_name || data.first_name.trim() === '') {
    requiredErrors.first_name = 'First name is required';
  } else {
    const nameError = validateName(data.first_name, 'First name');
    if (nameError) formatErrors.first_name = nameError;
  }

  if (data.middle_name) {
    const nameError = validateName(data.middle_name, 'Middle name');
    if (nameError) formatErrors.middle_name = nameError;
  }

  if (data.name_extension) {
    const nameError = validateName(data.name_extension, 'Name extension');
    if (nameError) formatErrors.name_extension = nameError;
  }

  if (!data.birth_date) {
    requiredErrors.birth_date = 'Date of birth is required';
  } else {
    const dateError = validateDateNotFuture(data.birth_date, 'Date of birth');
    if (dateError) formatErrors.birth_date = dateError;
  }

  if (!data.birth_place || data.birth_place.trim() === '') {
    requiredErrors.birth_place = 'Place of birth is required';
  } else {
    const lengthError = validateMaxLength(data.birth_place, 100, 'Place of birth');
    if (lengthError) formatErrors.birth_place = lengthError;
  }

  if (!data.sex) {
    requiredErrors.sex = 'Sex is required';
  } else if (!['Male', 'Female'].includes(data.sex)) {
    formatErrors.sex = 'Sex must be either Male or Female';
  }

  if (!data.civil_status || data.civil_status.trim() === '') {
    requiredErrors.civil_status = 'Civil status is required';
  }

  // Email validation (required)
  const emailError = validateEmail(data.email_address, true);
  if (emailError) {
    if (emailError.includes('required')) {
      requiredErrors.email_address = emailError;
    } else {
      formatErrors.email_address = emailError;
    }
  }

  // Mobile number validation (required)
  const mobileError = validateMobile(data.mobile_no, true);
  if (mobileError) {
    if (mobileError.includes('required')) {
      requiredErrors.mobile_no = mobileError;
    } else {
      formatErrors.mobile_no = mobileError;
    }
  }

  // Government ID validations (format only, not required)
  if (data.philhealth_no) {
    const philhealthError = validatePhilHealth(data.philhealth_no);
    if (philhealthError) formatErrors.philhealth_no = philhealthError;
  }

  if (data.sss_no) {
    const sssError = validateSSS(data.sss_no);
    if (sssError) formatErrors.sss_no = sssError;
  }

  if (data.tin_no) {
    const tinError = validateTIN(data.tin_no);
    if (tinError) formatErrors.tin_no = tinError;
  }

  if (data.pagibig_id_no) {
    const pagibigError = validatePagIbig(data.pagibig_id_no);
    if (pagibigError) formatErrors.pagibig_id_no = pagibigError;
  }

  // Address validations (required)
  if (!data.res_city || data.res_city.trim() === '') {
    requiredErrors.res_city = 'Residential city is required';
  }

  if (!data.res_province || data.res_province.trim() === '') {
    requiredErrors.res_province = 'Residential province is required';
  }

  const resZipError = validateZipCode(data.res_zip_code, true);
  if (resZipError) {
    if (resZipError.includes('required')) {
      requiredErrors.res_zip_code = resZipError;
    } else {
      formatErrors.res_zip_code = resZipError;
    }
  }

  // Permanent address (if different from residential)
  if (data.perm_city && data.perm_city.trim() !== '') {
    if (!data.perm_province || data.perm_province.trim() === '') {
      requiredErrors.perm_province = 'Permanent province is required if permanent city is provided';
    }
    
    const permZipError = validateZipCode(data.perm_zip_code, true);
    if (permZipError) {
      if (permZipError.includes('required')) {
        requiredErrors.perm_zip_code = permZipError;
      } else {
        formatErrors.perm_zip_code = permZipError;
      }
    }
  }

  // Employment required fields
  if (!data.faculty_id) {
    requiredErrors.faculty_id = 'Faculty is required';
  }
  
  // Check if selected position is faculty-level (has faculty_id but no department_id)
  let isFacultyLevelPosition = false;
  if (data.position_id && positions) {
    const selectedPosition = positions.find(pos => String(pos.id) === String(data.position_id));
    if (selectedPosition && selectedPosition.faculty_id && !selectedPosition.department_id) {
      isFacultyLevelPosition = true;
    }
  }
  
  // Department is only required if position is not faculty-level
  if (!isFacultyLevelPosition && !data.department_id) {
    requiredErrors.department_id = 'Department is required';
  }

  if (!data.position_id) {
    requiredErrors.position_id = 'Position is required';
  }

  if (!data.employee_type) {
    requiredErrors.employee_type = 'Employee type is required';
  } else if (!['Teaching', 'Non-Teaching'].includes(data.employee_type)) {
    formatErrors.employee_type = 'Employee type must be either Teaching or Non-Teaching';
  }

  if (!data.status) {
    requiredErrors.status = 'Status is required';
  } else {
    // Normalize status to lowercase for comparison
    const normalizedStatus = data.status.toLowerCase().replace(/\s+/g, '-');
    if (!['active', 'inactive', 'on-leave', 'contractual', 'job-order', 'resigned', 'retired', 'terminated'].includes(normalizedStatus)) {
      formatErrors.status = 'Status must be one of: Active, Inactive, On Leave, Contractual, Job Order, Resigned, Retired, Terminated';
    }
  }

  if (!data.employment_status || data.employment_status.trim() === '') {
    requiredErrors.employment_status = 'Employment status is required';
  } else if (!['Regular', 'Contractual', 'Job-Order', 'Probationary'].includes(data.employment_status)) {
    formatErrors.employment_status = 'Employment status must be Regular, Contractual, Job-Order, or Probationary';
  }

  if (!data.date_hired) {
    requiredErrors.date_hired = 'Date hired is required';
  } else {
    const dateHiredError = validateDateNotFuture(data.date_hired, 'Date hired');
    if (dateHiredError) {
      formatErrors.date_hired = `Date hired ${dateHiredError}`;
    }
  }

  if (data.date_regularized) {
    const dateRegularizedError = validateDateNotFuture(data.date_regularized, 'Date regularized');
    if (dateRegularizedError) {
      formatErrors.date_regularized = `Date regularized ${dateRegularizedError}`;
    }

    if (data.date_hired) {
      const rangeError = validateDateRange(data.date_hired, data.date_regularized, 'Date regularized');
      if (rangeError) {
        formatErrors.date_regularized = 'Date of regularization must be the same as or later than Date Hired';
      }
    }
  }

  // Educational background date validations
  if (data.educational_background && Array.isArray(data.educational_background)) {
    data.educational_background.forEach((edu: any, index: number) => {
      if (edu.period_from) {
        const dateError = validateDateNotFuture(edu.period_from, '');
        if (dateError) formatErrors[`educational_background.${index}.period_from`] = dateError;
      }

      if (edu.period_to) {
        const dateError = validateDateNotFuture(edu.period_to, '');
        if (dateError) formatErrors[`educational_background.${index}.period_to`] = dateError;
      }

      if (edu.period_from && edu.period_to) {
        const rangeError = validateDateRange(
          edu.period_from,
          edu.period_to,
          ''
        );
        if (rangeError) formatErrors[`educational_background.${index}.date_range`] = rangeError;
      }
    });
  }

  // Work experience date validations
  if (data.work_experience && Array.isArray(data.work_experience)) {
    data.work_experience.forEach((work: any, index: number) => {
      if (work.date_from) {
        const dateError = validateDateNotFuture(work.date_from, '');
        if (dateError) formatErrors[`work_experience.${index}.date_from`] = dateError;
      }

      if (work.date_to) {
        const dateError = validateDateNotFuture(work.date_to, '');
        if (dateError) formatErrors[`work_experience.${index}.date_to`] = dateError;
      }

      if (work.date_from && work.date_to) {
        const rangeError = validateDateRange(
          work.date_from,
          work.date_to,
          ''
        );
        if (rangeError) formatErrors[`work_experience.${index}.date_range`] = rangeError;
      }
    });
  }

  // Civil service eligibility date validations
  if (data.civil_service_eligibility && Array.isArray(data.civil_service_eligibility)) {
    data.civil_service_eligibility.forEach((eligibility: any, index: number) => {
      if (eligibility.exam_date) {
        const dateError = validateDateNotFuture(eligibility.exam_date, '');
        if (dateError) formatErrors[`civil_service_eligibility.${index}.exam_date`] = dateError;
      }
    });
  }

  // Learning & Development date validations
  if (data.learning_development && Array.isArray(data.learning_development)) {
    data.learning_development.forEach((ld: any, index: number) => {
      if (ld.date_from) {
        const dateError = validateDateNotFuture(ld.date_from, '');
        if (dateError) formatErrors[`learning_development.${index}.date_from`] = dateError;
      }

      if (ld.date_to) {
        const dateError = validateDateNotFuture(ld.date_to, '');
        if (dateError) formatErrors[`learning_development.${index}.date_to`] = dateError;
      }

      if (ld.date_from && ld.date_to) {
        const rangeError = validateDateRange(
          ld.date_from,
          ld.date_to,
          ''
        );
        if (rangeError) formatErrors[`learning_development.${index}.date_range`] = rangeError;
      }
    });
  }

  // Voluntary work date validations
  if (data.voluntary_work && Array.isArray(data.voluntary_work)) {
    data.voluntary_work.forEach((vw: any, index: number) => {
      if (vw.date_from) {
        const dateError = validateDateNotFuture(vw.date_from, '');
        if (dateError) formatErrors[`voluntary_work.${index}.date_from`] = dateError;
      }

      if (vw.date_to) {
        const dateError = validateDateNotFuture(vw.date_to, '');
        if (dateError) formatErrors[`voluntary_work.${index}.date_to`] = dateError;
      }

      if (vw.date_from && vw.date_to) {
        const rangeError = validateDateRange(
          vw.date_from,
          vw.date_to,
          ''
        );
        if (rangeError) formatErrors[`voluntary_work.${index}.date_range`] = rangeError;
      }
    });
  }

  // Questionnaire validations (require details when Yes)
  if (data.questionnaire && Array.isArray(data.questionnaire)) {
    data.questionnaire.forEach((q: any, index: number) => {
      const qError = validateQuestionnaire(q.answer, q.details, q.question_number);
      if (qError) {
        formatErrors[`questionnaire.${index}.details`] = qError;
      }
    });
  }

  // Character limit validations for optional fields
  if (data.telephone_no) {
    const telError = validateMaxLength(data.telephone_no, 20, 'Telephone number');
    if (telError) formatErrors.telephone_no = telError;
  }

  if (data.citizenship) {
    const citError = validateMaxLength(data.citizenship, 30, 'Citizenship');
    if (citError) formatErrors.citizenship = citError;
  }

  // Combine all errors
  const allErrors = { ...requiredErrors, ...formatErrors };

  return {
    isValid: Object.keys(allErrors).length === 0,
    errors: allErrors,
    requiredErrors,
    formatErrors,
  };
};
