import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/custom-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { FloatingInput } from '@/components/ui/floating-input';
import { RadioGroup } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaskedInput } from '@/components/ui/masked-input';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PageProps, type BreadcrumbItem } from '@/types';
import { ChevronLeft, ChevronRight, Check, User, MapPin, IdCard, Building2, GraduationCap, Briefcase, Award, Users, FileText, UploadCloud, AlertCircle } from 'lucide-react';
import { CSForm212PreviewTable } from '@/components/CSForm212PreviewTable';
import { validateEmployeeData } from '@/utils/csForm212Validation';

type CreateEmployeeProps = {
  employee?: {
    id: string;
    surname: string;
    first_name: string;
    middle_name: string;
    name_extension: string;
    status: string;
    employee_type: string;
    faculty_id?: string;
    department_id: string;
    position_id: string;
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
    family_background: Array<{
      relation: string;
      surname: string;
      first_name: string;
      middle_name: string;
      name_extension: string;
      occupation: string;
      employer: string;
      business_address: string;
      telephone_no: string;
    }>;
    children: Array<{
      full_name: string;
      birth_date: string;
    }>;
    educational_background: Array<{
      level: string;
      school_name: string;
      degree_course: string;
      period_from: string;
      period_to: string;
      highest_level_units: string;
      year_graduated: string;
      honors_received: string;
    }>;
    civil_service_eligibility: Array<{
      eligibility: string;
      rating: string;
      exam_date: string;
      exam_place: string;
      license_no: string;
      license_validity: string;
    }>;
    work_experience: Array<{
      position_title: string;
      company_name: string;
      company_address: string;
      date_from: string;
      date_to: string;
      monthly_salary: string;
      salary_grade_step: string;
      status_of_appointment: string;
      is_gov_service: boolean;
    }>;
    voluntary_work: Array<{
      organization_name: string;
      organization_address: string;
      date_from: string;
      date_to: string;
      hours_rendered: string;
      position_or_nature: string;
    }>;
    learning_development: Array<{
      title: string;
      date_from: string;
      date_to: string;
      hours: string;
      type_of_ld: string;
      conducted_by: string;
    }>;
    other_information: {
      skill_or_hobby: string;
      non_academic_distinctions: string;
      memberships: string;
    };
    references: Array<{
      fullname: string;
      address: string;
      telephone_no: string;
    }>;
    questionnaire: Array<{
      question_number: number;
      answer: boolean;
      details: string;
    }>;
  };
  departments: { id: number; name?: string; faculty_name?: string; faculty_id?: number | null; type?: string }[];
  positions: { id: number; name?: string; pos_name?: string; department_id: number | null; faculty_id?: number | null }[];
  faculties: { id: number; name: string; code?: string | null }[];
  mode?: 'create' | 'edit' | 'view';
};

// Helper function to format dates without time
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  if (dateString.includes('T')) {
    return dateString.split('T')[0];
  }
  return dateString;
};

export default function CreateEmployee({ employee, departments, positions, faculties, mode = 'create' }: CreateEmployeeProps) {
  const { csrf, errors, importedData } = usePage<PageProps & { importedData?: Record<string, unknown> | null }>().props;
  const isEdit = !!employee;
  const isView = mode === 'view';
  const formRef = useRef<HTMLFormElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Employees', href: '/employees' },
    { 
      title: isView 
        ? `View Employee${employee ? ` - ${employee.first_name} ${employee.surname}` : ''}` 
        : isEdit 
        ? `Edit Employee${employee ? ` - ${employee.first_name} ${employee.surname}` : ''}` 
        : 'Create Employee',
      href: '#' 
    },
  ];
  
  // Multi-step wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const totalSteps = 5;
  
  // Tab states for each step
  const [step1Tab, setStep1Tab] = useState('basic'); // basic, address, government
  const [step2Tab, setStep2Tab] = useState('family'); // family, education
  const [step3Tab, setStep3Tab] = useState('eligibility'); // eligibility, experience
  const [step4Tab, setStep4Tab] = useState('voluntary'); // voluntary, learning, other
  
  // Step definitions
  const steps = [
    { id: 1, title: 'Personal Information', description: 'Basic employee details' },
    { id: 2, title: 'Family & Education', description: 'Family background and education' },
    { id: 3, title: 'Professional', description: 'Work experience and eligibility' },
    { id: 4, title: 'Additional Info', description: 'Voluntary work and development' },
    { id: 5, title: 'References & Declaration', description: 'References and final declaration' },
  ];
  
  // Scroll to top helper function
  const scrollToTop = () => {
    // Small delay to ensure DOM has updated
    setTimeout(() => {
      if (formContainerRef.current) {
        // Use scrollIntoView with scroll-margin-top CSS property to account for sticky header
        formContainerRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 150);
  };

  // Initial scroll on page load
  useEffect(() => {
    // Scroll to top immediately on mount (without smooth behavior for instant positioning)
    setTimeout(() => {
      if (formContainerRef.current) {
        // Use scrollIntoView with scroll-margin-top CSS property to account for sticky header
        formContainerRef.current.scrollIntoView({ 
          behavior: 'auto', // Instant scroll on initial load
          block: 'start',
          inline: 'nearest'
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    }, 0);
  }, []); // Run only once on mount

  // Scroll to top when step changes
  useEffect(() => {
    scrollToTop();
  }, [currentStep]);

  // Client-side validation errors - separated by type
  const [requiredErrors, setRequiredErrors] = useState<Record<string, string>>({});
  const [formatErrors, setFormatErrors] = useState<Record<string, string>>({});
  
  // Track user interaction and validation enablement
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [hasAppliedImportedData, setHasAppliedImportedData] = useState(false);
  const [shouldShowValidation, setShouldShowValidation] = useState(false);
  
  // Track which tabs have been interacted with (to avoid showing errors on first visit)
  const [interactedTabs, setInteractedTabs] = useState<Set<string>>(new Set());
  
  // Combined errors for backward compatibility
  const clientErrors = { ...requiredErrors, ...formatErrors };
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<Partial<FormState> | null>(null);

  // Track if we've already processed importedData to prevent reopening preview after close
  const hasProcessedImportedData = useRef(false);
  
  // Handle importedData from server (after file upload) - only set once when first received
  useEffect(() => {
    // Only set pendingImport if:
    // 1. importedData exists
    // 2. Not in edit mode
    // 3. pendingImport is currently null (not already set)
    // 4. We haven't already processed this importedData
    if (importedData && !isEdit && !pendingImport && !hasProcessedImportedData.current) {
      setPendingImport(importedData as Partial<FormState>);
      hasProcessedImportedData.current = true;
    }
    // Reset the flag when importedData is cleared/null (allows new uploads)
    if (!importedData) {
      hasProcessedImportedData.current = false;
    }
  }, [importedData, isEdit, pendingImport]);

  // Scroll to top when tabs change
  useEffect(() => {
    if (currentStep === 1) {
      scrollToTop();
    }
  }, [step1Tab]);

  useEffect(() => {
    if (currentStep === 2) {
      scrollToTop();
    }
  }, [step2Tab]);

  useEffect(() => {
    if (currentStep === 3) {
      scrollToTop();
    }
  }, [step3Tab]);

  useEffect(() => {
    if (currentStep === 4) {
      scrollToTop();
    }
  }, [step4Tab]);

  // Validation function to check required fields for current step/tab
  const validateCurrentStep = (): { isValid: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];
    const newClientErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (step1Tab === 'basic') {
        // Required fields: id, surname, first_name, birth_date, birth_place, sex, civil_status, department_id, position_id
        if (!data.id || data.id.trim() === '') {
          missingFields.push('Employee ID');
          newClientErrors['id'] = 'Employee ID is required';
        }
        if (!data.surname || data.surname.trim() === '') {
          missingFields.push('Surname');
          newClientErrors['surname'] = 'Surname is required';
        }
        if (!data.first_name || data.first_name.trim() === '') {
          missingFields.push('First Name');
          newClientErrors['first_name'] = 'First Name is required';
        }
        if (!data.birth_date) {
          missingFields.push('Date of Birth');
          newClientErrors['birth_date'] = 'Date of Birth is required';
        }
        if (!data.birth_place || data.birth_place.trim() === '') {
          missingFields.push('Place of Birth');
          newClientErrors['birth_place'] = 'Place of Birth is required';
        }
        if (!data.sex) {
          missingFields.push('Sex');
          newClientErrors['sex'] = 'Sex is required';
        }
        if (!data.civil_status) {
          missingFields.push('Civil Status');
          newClientErrors['civil_status'] = 'Civil Status is required';
        }
        if (data.organization_type === 'academic' && !data.faculty_id) {
          missingFields.push('Faculty');
          newClientErrors['faculty_id'] = 'Faculty is required for academic departments';
        }
        // Check if selected position is faculty-level to determine if department is required
        const selectedPos = positions.find(pos => String(pos.id) === String(data.position_id || ''));
        const isFacultyLevelPos = selectedPos ? (selectedPos.faculty_id && !selectedPos.department_id) : false;
        if (!isFacultyLevelPos && !data.department_id) {
          const orgTypeLabel = data.organization_type === 'administrative' ? 'Office' : 'Department';
          missingFields.push(orgTypeLabel);
          newClientErrors['department_id'] = `${orgTypeLabel} is required`;
        }
        if (!data.position_id) {
          missingFields.push('Position');
          newClientErrors['position_id'] = 'Position is required';
        }
        // Validate telephone and mobile length if provided
        if (data.telephone_no && data.telephone_no.trim() !== '') {
          const telLength = data.telephone_no.replace(/\D/g, '').length;
          if (telLength < 7 || telLength > 10) {
            newClientErrors['telephone_no'] = 'Telephone number must be 7-10 characters';
          }
        }
        if (data.mobile_no && data.mobile_no.trim() !== '') {
          const mobileLength = data.mobile_no.replace(/\D/g, '').length;
          if (mobileLength !== 11) {
            newClientErrors['mobile_no'] = 'Mobile number must be exactly 11 characters';
          }
        }
      } else if (step1Tab === 'address') {
        // Required fields: res_city, res_province
        if (!data.res_city || data.res_city.trim() === '') {
          missingFields.push('Residential City/Municipality');
          newClientErrors['res_city'] = 'Residential City/Municipality is required';
        }
        if (!data.res_province || data.res_province.trim() === '') {
          missingFields.push('Residential Province');
          newClientErrors['res_province'] = 'Residential Province is required';
        }
        // Permanent address required only if not same as residential
        const sameAsResidential = (data as any).same_as_residential;
        if (!sameAsResidential) {
          if (!data.perm_city || data.perm_city.trim() === '') {
            missingFields.push('Permanent City/Municipality');
            newClientErrors['perm_city'] = 'Permanent City/Municipality is required';
          }
          if (!data.perm_province || data.perm_province.trim() === '') {
            missingFields.push('Permanent Province');
            newClientErrors['perm_province'] = 'Permanent Province is required';
          }
        }
      }
      // government tab doesn't have required fields
    }
    
    if (currentStep === 2) {
      if (step2Tab === 'education') {
        // Check educational background - school_name is required if level is selected
        data.educational_background.forEach((edu, idx) => {
          if (edu.level && (!edu.school_name || edu.school_name.trim() === '')) {
            missingFields.push(`Education Record ${idx + 1} - School Name`);
            newClientErrors[`educational_background.${idx}.school_name`] = 'School Name is required';
          }
        });
      }
      // family tab doesn't have required fields
    }
    
    if (currentStep === 3) {
      if (step3Tab === 'experience') {
        // Check work experience - position_title, company_name, date_from are required if any work record exists
        data.work_experience.forEach((work, idx) => {
          const hasAnyData = work.position_title || work.company_name || work.date_from;
          if (hasAnyData && (!work.position_title || work.position_title.trim() === '')) {
            missingFields.push(`Work Experience ${idx + 1} - Position Title`);
            newClientErrors[`work_experience.${idx}.position_title`] = 'Position Title is required';
          }
          if (hasAnyData && (!work.company_name || work.company_name.trim() === '')) {
            missingFields.push(`Work Experience ${idx + 1} - Company/Agency`);
            newClientErrors[`work_experience.${idx}.company_name`] = 'Company/Agency is required';
          }
          if (hasAnyData && !work.date_from) {
            missingFields.push(`Work Experience ${idx + 1} - Date From`);
            newClientErrors[`work_experience.${idx}.date_from`] = 'Date From is required';
          }
        });
      }
      // eligibility tab doesn't have required fields
    }
    
    if (currentStep === 4) {
      if (step4Tab === 'voluntary') {
        // Check voluntary work - organization_name and date_from are required if any record exists
        data.voluntary_work.forEach((vw, idx) => {
          const hasAnyData = vw.organization_name || vw.date_from;
          if (hasAnyData && (!vw.organization_name || vw.organization_name.trim() === '')) {
            missingFields.push(`Voluntary Work ${idx + 1} - Organization Name`);
            newClientErrors[`voluntary_work.${idx}.organization_name`] = 'Organization Name is required';
          }
          if (hasAnyData && !vw.date_from) {
            missingFields.push(`Voluntary Work ${idx + 1} - Date From`);
            newClientErrors[`voluntary_work.${idx}.date_from`] = 'Date From is required';
          }
        });
      } else if (step4Tab === 'learning') {
        // Check learning & development - title and date_from are required if any record exists
        data.learning_development.forEach((ld, idx) => {
          const hasAnyData = ld.title || ld.date_from;
          if (hasAnyData && (!ld.title || ld.title.trim() === '')) {
            missingFields.push(`Learning & Development ${idx + 1} - Title`);
            newClientErrors[`learning_development.${idx}.title`] = 'Title is required';
          }
          if (hasAnyData && !ld.date_from) {
            missingFields.push(`Learning & Development ${idx + 1} - Date From`);
            newClientErrors[`learning_development.${idx}.date_from`] = 'Date From is required';
          }
        });
      }
      // other tab doesn't have required fields
    }
    
    if (currentStep === 5) {
      // Step 5 - check references if any are added
      data.references.forEach((ref, idx) => {
        const hasAnyData = ref.fullname || ref.address;
        if (hasAnyData && (!ref.fullname || ref.fullname.trim() === '')) {
          missingFields.push(`Reference ${idx + 1} - Full Name`);
          newClientErrors[`references.${idx}.fullname`] = 'Full Name is required';
        }
      });
    }
    
    // Set required errors for missing fields
    setRequiredErrors(newClientErrors);
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  };

  // Validate all required fields for the entire current step (all tabs)
  const validateCurrentStepAllTabs = (): { isValid: boolean; missingFields: string[] } => {
    const allMissingFields: string[] = [];
    const allErrors: Record<string, string> = {};

    if (currentStep === 1) {
      // Validate all tabs in step 1
      // Basic tab
      if (!data.id || data.id.trim() === '') {
        allMissingFields.push('Employee ID');
        allErrors['id'] = 'Employee ID is required';
      }
      if (!data.surname || data.surname.trim() === '') {
        allMissingFields.push('Surname');
        allErrors['surname'] = 'Surname is required';
      }
      if (!data.first_name || data.first_name.trim() === '') {
        allMissingFields.push('First Name');
        allErrors['first_name'] = 'First Name is required';
      }
      if (!data.birth_date) {
        allMissingFields.push('Date of Birth');
        allErrors['birth_date'] = 'Date of Birth is required';
      }
      if (!data.birth_place || data.birth_place.trim() === '') {
        allMissingFields.push('Place of Birth');
        allErrors['birth_place'] = 'Place of Birth is required';
      }
      if (!data.sex) {
        allMissingFields.push('Sex');
        allErrors['sex'] = 'Sex is required';
      }
      if (!data.civil_status) {
        allMissingFields.push('Civil Status');
        allErrors['civil_status'] = 'Civil Status is required';
      }
      if (data.organization_type === 'academic' && !data.faculty_id) {
        allMissingFields.push('Faculty');
        allErrors['faculty_id'] = 'Faculty is required for academic departments';
      }
      // Check if selected position is faculty-level to determine if department is required
      const selectedPosForAll = positions.find(pos => String(pos.id) === String(data.position_id || ''));
      const isFacultyLevelPosForAll = selectedPosForAll ? (selectedPosForAll.faculty_id && !selectedPosForAll.department_id) : false;
      if (!isFacultyLevelPosForAll && !data.department_id) {
        const orgTypeLabel = data.organization_type === 'administrative' ? 'Office' : 'Department';
        allMissingFields.push(orgTypeLabel);
        allErrors['department_id'] = `${orgTypeLabel} is required`;
      }
      if (!data.position_id) {
        allMissingFields.push('Position');
        allErrors['position_id'] = 'Position is required';
      }
      // Address tab
      if (!data.res_city || data.res_city.trim() === '') {
        allMissingFields.push('Residential City/Municipality');
        allErrors['res_city'] = 'Residential City/Municipality is required';
      }
      if (!data.res_province || data.res_province.trim() === '') {
        allMissingFields.push('Residential Province');
        allErrors['res_province'] = 'Residential Province is required';
      }
      if (!data.res_zip_code || data.res_zip_code.trim() === '') {
        allMissingFields.push('Residential ZIP Code');
        allErrors['res_zip_code'] = 'Residential ZIP Code is required';
      }
      // Contact info (from basic tab but required)
      if (!data.email_address || data.email_address.trim() === '') {
        allMissingFields.push('Email Address');
        allErrors['email_address'] = 'Email Address is required';
      }
      if (!data.mobile_no || data.mobile_no.trim() === '') {
        allMissingFields.push('Mobile Number');
        allErrors['mobile_no'] = 'Mobile Number is required';
      }
    }

    if (currentStep === 2) {
      // Validate education tab if any education records exist
      data.educational_background.forEach((edu, idx) => {
        if (edu.level && (!edu.school_name || edu.school_name.trim() === '')) {
          allMissingFields.push(`Education Record ${idx + 1} - School Name`);
          allErrors[`educational_background.${idx}.school_name`] = 'School Name is required';
        }
      });
    }

    if (currentStep === 3) {
      // Validate experience tab if any work records exist
      data.work_experience.forEach((work, idx) => {
        const hasAnyData = work.position_title || work.company_name || work.date_from;
        if (hasAnyData && (!work.position_title || work.position_title.trim() === '')) {
          allMissingFields.push(`Work Experience ${idx + 1} - Position Title`);
          allErrors[`work_experience.${idx}.position_title`] = 'Position Title is required';
        }
        if (hasAnyData && (!work.company_name || work.company_name.trim() === '')) {
          allMissingFields.push(`Work Experience ${idx + 1} - Company/Agency`);
          allErrors[`work_experience.${idx}.company_name`] = 'Company/Agency is required';
        }
        if (hasAnyData && !work.date_from) {
          allMissingFields.push(`Work Experience ${idx + 1} - Date From`);
          allErrors[`work_experience.${idx}.date_from`] = 'Date From is required';
        }
      });
    }

    if (currentStep === 4) {
      // Validate voluntary and learning tabs if any records exist
      data.voluntary_work.forEach((vw, idx) => {
        const hasAnyData = vw.organization_name || vw.date_from;
        if (hasAnyData && (!vw.organization_name || vw.organization_name.trim() === '')) {
          allMissingFields.push(`Voluntary Work ${idx + 1} - Organization Name`);
          allErrors[`voluntary_work.${idx}.organization_name`] = 'Organization Name is required';
        }
        if (hasAnyData && !vw.date_from) {
          allMissingFields.push(`Voluntary Work ${idx + 1} - Date From`);
          allErrors[`voluntary_work.${idx}.date_from`] = 'Date From is required';
        }
      });
      data.learning_development.forEach((ld, idx) => {
        const hasAnyData = ld.title || ld.date_from;
        if (hasAnyData && (!ld.title || ld.title.trim() === '')) {
          allMissingFields.push(`Learning & Development ${idx + 1} - Title`);
          allErrors[`learning_development.${idx}.title`] = 'Title is required';
        }
        if (hasAnyData && !ld.date_from) {
          allMissingFields.push(`Learning & Development ${idx + 1} - Date From`);
          allErrors[`learning_development.${idx}.date_from`] = 'Date From is required';
        }
      });
    }

    if (currentStep === 5) {
      // Validate references if any are added
      data.references.forEach((ref, idx) => {
        const hasAnyData = ref.fullname || ref.address;
        if (hasAnyData && (!ref.fullname || ref.fullname.trim() === '')) {
          allMissingFields.push(`Reference ${idx + 1} - Full Name`);
          allErrors[`references.${idx}.fullname`] = 'Full Name is required';
        }
      });
    }

    setRequiredErrors(allErrors);
    
    return {
      isValid: allMissingFields.length === 0,
      missingFields: allMissingFields
    };
  };

  // Scroll to first error field
  const scrollToFirstError = () => {
    setTimeout(() => {
      const firstErrorField = Object.keys(clientErrors)[0];
      if (firstErrorField) {
        // For nested fields like "educational_background.0.school_name", try multiple selectors
        const fieldName = firstErrorField.split('.').pop() || firstErrorField;
        const fieldId = firstErrorField.replace(/\./g, '-');
        
        // Try different selectors to find the field
        let element = document.getElementById(fieldId) || 
                      document.getElementById(fieldName) ||
                      document.querySelector(`[name="${firstErrorField}"]`) ||
                      document.querySelector(`input[id*="${fieldName}"]`) ||
                      document.querySelector(`label:has-text("${fieldName}")`)?.nextElementSibling as HTMLElement;
        
        // For nested fields, try to find by the last part of the field name
        if (!element && firstErrorField.includes('.')) {
          const parts = firstErrorField.split('.');
          const section = parts[0];
          const index = parts[1];
          const field = parts[2];
          
          // Try to find input with label containing the field name
          const labels = Array.from(document.querySelectorAll('label'));
          const matchingLabel = labels.find(label => 
            label.textContent?.toLowerCase().includes(field.replace(/_/g, ' ').toLowerCase())
          );
          if (matchingLabel) {
            element = matchingLabel.nextElementSibling?.querySelector('input') as HTMLElement ||
                     matchingLabel.parentElement?.querySelector('input') as HTMLElement;
          }
        }
        
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLElement).focus();
        } else {
          // Fallback: scroll to top of current step
          scrollToTop();
        }
      }
    }, 200);
  };

  // Navigation functions
  const nextStep = () => {
    // Step 1: Navigate through tabs (basic -> address -> government)
    if (currentStep === 1) {
      if (step1Tab === 'basic') {
        const validation = validateCurrentStep();
        if (!validation.isValid) {
          // Mark current tab as interacted so errors will show
          const currentTabId = getCurrentTabId();
          setInteractedTabs(prev => {
            const newSet = new Set(prev);
            newSet.add(currentTabId);
            return newSet;
          });
          setShouldShowValidation(true);
          toast.error(`Please fill in all required fields: ${validation.missingFields.join(', ')}`);
          scrollToFirstError();
          return;
        }
        setStep1Tab('address');
        scrollToTop();
        return;
      } else if (step1Tab === 'address') {
        const validation = validateCurrentStep();
        if (!validation.isValid) {
          // Mark current tab as interacted so errors will show
          const currentTabId = getCurrentTabId();
          setInteractedTabs(prev => {
            const newSet = new Set(prev);
            newSet.add(currentTabId);
            return newSet;
          });
          setShouldShowValidation(true);
          toast.error(`Please fill in all required fields: ${validation.missingFields.join(', ')}`);
          scrollToFirstError();
          return;
        }
        setStep1Tab('government');
        scrollToTop();
        return;
      } else if (step1Tab === 'government') {
        // Validate all required fields in step 1 before moving to step 2
        const validation = validateCurrentStepAllTabs();
        if (!validation.isValid) {
          // Mark all step 1 tabs as interacted so errors will show
          ['step1-basic', 'step1-address', 'step1-government'].forEach(tabId => {
            setInteractedTabs(prev => {
              const newSet = new Set(prev);
              newSet.add(tabId);
              return newSet;
            });
          });
          setShouldShowValidation(true);
          toast.error(`Please fill in all required fields before proceeding: ${validation.missingFields.join(', ')}`);
          scrollToFirstError();
          return;
        }
        // Move to step 2
      }
    }
    
    // Step 2: Navigate through tabs (family -> education)
    if (currentStep === 2) {
      if (step2Tab === 'family') {
        setStep2Tab('education');
        scrollToTop();
        return;
      }
      // If on education tab, proceed to step 3
      // Validate education tab before moving to next step
      const validation = validateCurrentStep();
      if (!validation.isValid) {
        // Mark current tab as interacted so errors will show
        const currentTabId = getCurrentTabId();
        setInteractedTabs(prev => {
          const newSet = new Set(prev);
          newSet.add(currentTabId);
          return newSet;
        });
        setShouldShowValidation(true);
        toast.error(`Please fill in all required fields: ${validation.missingFields.join(', ')}`);
        scrollToFirstError();
        return;
      }
    }
    
    // Step 3: Navigate through tabs (eligibility -> experience)
    if (currentStep === 3) {
      if (step3Tab === 'eligibility') {
        setStep3Tab('experience');
        scrollToTop();
        return;
      }
      // If on experience tab, proceed to step 4
      // Validate experience tab before moving to next step
      const validation = validateCurrentStep();
      if (!validation.isValid) {
        // Mark current tab as interacted so errors will show
        const currentTabId = getCurrentTabId();
        setInteractedTabs(prev => {
          const newSet = new Set(prev);
          newSet.add(currentTabId);
          return newSet;
        });
        setShouldShowValidation(true);
        toast.error(`Please fill in all required fields: ${validation.missingFields.join(', ')}`);
        scrollToFirstError();
        return;
      }
    }
    
    // Step 4: Navigate through tabs (voluntary -> learning -> other)
    if (currentStep === 4) {
      if (step4Tab === 'voluntary') {
        const validation = validateCurrentStep();
        if (!validation.isValid) {
          // Mark current tab as interacted so errors will show
          const currentTabId = getCurrentTabId();
          setInteractedTabs(prev => {
            const newSet = new Set(prev);
            newSet.add(currentTabId);
            return newSet;
          });
          setShouldShowValidation(true);
          toast.error(`Please fill in all required fields: ${validation.missingFields.join(', ')}`);
          scrollToFirstError();
          return;
        }
        setStep4Tab('learning');
        scrollToTop();
        return;
      } else if (step4Tab === 'learning') {
        const validation = validateCurrentStep();
        if (!validation.isValid) {
          // Mark current tab as interacted so errors will show
          const currentTabId = getCurrentTabId();
          setInteractedTabs(prev => {
            const newSet = new Set(prev);
            newSet.add(currentTabId);
            return newSet;
          });
          setShouldShowValidation(true);
          toast.error(`Please fill in all required fields: ${validation.missingFields.join(', ')}`);
          scrollToFirstError();
          return;
        }
        setStep4Tab('other');
        scrollToTop();
        return;
      }
      // If on other tab, proceed to step 5
    }
    
    // Validate all required fields for current step before moving to next step
    const validation = validateCurrentStepAllTabs();
    if (!validation.isValid) {
      // Mark current step tabs as interacted so errors will show
      const currentStepTabs: string[] = [];
      if (currentStep === 1) {
        currentStepTabs.push('step1-basic', 'step1-address', 'step1-government');
      } else if (currentStep === 2) {
        currentStepTabs.push('step2-family', 'step2-education');
      } else if (currentStep === 3) {
        currentStepTabs.push('step3-eligibility', 'step3-experience');
      } else if (currentStep === 4) {
        currentStepTabs.push('step4-voluntary', 'step4-learning', 'step4-other');
      }
      
      currentStepTabs.forEach(tabId => {
        setInteractedTabs(prev => {
          const newSet = new Set(prev);
          newSet.add(tabId);
          return newSet;
        });
      });
      
      setShouldShowValidation(true);
      toast.error(`Please fill in all required fields before proceeding: ${validation.missingFields.join(', ')}`);
      scrollToFirstError();
      return;
    }
    
    // Move to next step
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      scrollToTop();
    }
  };
  
  const prevStep = () => {
    // Step 1: Navigate back through tabs
    if (currentStep === 1) {
      if (step1Tab === 'government') {
        setStep1Tab('address');
        scrollToTop();
        return;
      } else if (step1Tab === 'address') {
        setStep1Tab('basic');
        scrollToTop();
        return;
      }
      // If on basic tab, can't go back further
      return;
    }
    
    // Step 2: Navigate back through tabs
    if (currentStep === 2) {
      if (step2Tab === 'education') {
        setStep2Tab('family');
        scrollToTop();
        return;
      }
      // If on family tab, go back to step 1
      setCurrentStep(1);
      setStep1Tab('government');
      scrollToTop();
      return;
    }
    
    // Step 3: Navigate back through tabs
    if (currentStep === 3) {
      if (step3Tab === 'experience') {
        setStep3Tab('eligibility');
        scrollToTop();
        return;
      }
      // If on eligibility tab, go back to step 2
      setCurrentStep(2);
      setStep2Tab('education');
      scrollToTop();
      return;
    }
    
    // Step 4: Navigate back through tabs
    if (currentStep === 4) {
      if (step4Tab === 'other') {
        setStep4Tab('learning');
        scrollToTop();
        return;
      } else if (step4Tab === 'learning') {
        setStep4Tab('voluntary');
        scrollToTop();
        return;
      }
      // If on voluntary tab, go back to step 3
      setCurrentStep(3);
      setStep3Tab('experience');
      scrollToTop();
      return;
    }
    
    // Step 5: Go back to step 4
    if (currentStep === 5) {
      setCurrentStep(4);
      setStep4Tab('other');
      scrollToTop();
      return;
    }
  };
  
  const goToStep = (step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
      // Reset tabs to first tab when navigating to a step
      if (step === 1) {
        setStep1Tab('basic');
      } else if (step === 2) {
        setStep2Tab('family');
      } else if (step === 3) {
        setStep3Tab('eligibility');
      } else if (step === 4) {
        setStep4Tab('voluntary');
      }
    }
  };
  
  const inferredFacultyId = (() => {
    if (employee?.faculty_id) {
      return String(employee.faculty_id);
    }
    if (employee?.department?.faculty_id) {
      return String(employee.department.faculty_id);
    }
    const employeeDeptId = employee?.department_id || employee?.department?.id;
    if (employeeDeptId) {
      const matchingDepartment = departments.find(
        (dept) => String(dept.id) === String(employeeDeptId)
      );
      if (matchingDepartment?.faculty_id) {
        return String(matchingDepartment.faculty_id);
      }
    }
    return '';
  })();

  // Infer organization_type from the selected department
  const inferredOrganizationType = (() => {
    const employeeDeptId = employee?.department_id || employee?.department?.id;
    if (employeeDeptId) {
      const matchingDepartment = departments.find(
        (dept) => String(dept.id) === String(employeeDeptId)
      );
      if (matchingDepartment) {
        // Use the type field if available, otherwise fallback to faculty_id check
        return matchingDepartment.type || (matchingDepartment.faculty_id ? 'academic' : 'administrative');
      }
    }
    // Default to academic if we can't determine
    return 'academic';
  })();

  // Format initial dates to remove time component
  const initialData = {
    id: employee?.id || '',
    surname: employee?.surname || '',
    first_name: employee?.first_name || '',
    middle_name: employee?.middle_name || '',
    name_extension: employee?.name_extension || '',
    status: employee?.status || 'active',
    employment_status: employee?.employment_status || 'Probationary',
    employee_type: employee?.employee_type || 'Teaching',
    organization_type: inferredOrganizationType || 'academic',
    faculty_id: inferredFacultyId || '',
    department_id: employee?.department_id 
      ? String(employee.department_id) 
      : (employee?.department?.id ? String(employee.department.id) : ''),
    position_id: employee?.position_id 
      ? String(employee.position_id) 
      : (employee?.position?.id ? String(employee.position.id) : ''),
    date_hired: formatDate(employee?.date_hired || ''),
    date_regularized: formatDate(employee?.date_regularized || ''),
    birth_date: formatDate(employee?.birth_date || ''),
    birth_place: employee?.birth_place || '',
    sex: employee?.sex || 'Male',
    civil_status: employee?.civil_status || '',
    height_m: employee?.height_m || '',
    weight_kg: employee?.weight_kg || '',
    blood_type: employee?.blood_type || '',
    gsis_id_no: employee?.gsis_id_no || '',
    pagibig_id_no: employee?.pagibig_id_no || '',
    philhealth_no: employee?.philhealth_no || '',
    sss_no: employee?.sss_no || '',
    tin_no: employee?.tin_no || '',
    agency_employee_no: employee?.agency_employee_no || '',
    citizenship: employee?.citizenship || 'Filipino',
    dual_citizenship: employee?.dual_citizenship || false,
    citizenship_type: employee?.citizenship_type || '',
    dual_citizenship_country: employee?.dual_citizenship_country || '',
    res_house_no: employee?.res_house_no || '',
    res_street: employee?.res_street || '',
    res_subdivision: employee?.res_subdivision || '',
    res_barangay: employee?.res_barangay || '',
    res_city: employee?.res_city || '',
    res_province: employee?.res_province || '',
    res_zip_code: employee?.res_zip_code || '',
    perm_house_no: employee?.perm_house_no || '',
    perm_street: employee?.perm_street || '',
    perm_subdivision: employee?.perm_subdivision || '',
    perm_barangay: employee?.perm_barangay || '',
    perm_city: employee?.perm_city || '',
    perm_province: employee?.perm_province || '',
    perm_zip_code: employee?.perm_zip_code || '',
    telephone_no: employee?.telephone_no || '',
    mobile_no: employee?.mobile_no || '',
    email_address: employee?.email_address || '',
    government_issued_id: employee?.government_issued_id || '',
    id_number: employee?.id_number || '',
    id_date_issued: formatDate(employee?.id_date_issued || ''),
    id_place_of_issue: employee?.id_place_of_issue || '',
    indigenous_group: employee?.indigenous_group || '',
    pwd_id_no: employee?.pwd_id_no || '',
    solo_parent_id_no: employee?.solo_parent_id_no || '',

    family_background: employee?.family_background || [
      { relation: 'Father', surname: '', first_name: '', middle_name: '', name_extension: '', occupation: '', employer: '', business_address: '', telephone_no: '' },
      { relation: 'Mother', surname: '', first_name: '', middle_name: '', name_extension: '', occupation: '', employer: '', business_address: '', telephone_no: '' }
    ],
    children: employee?.children?.map(child => ({
      full_name: child.full_name || '',
      birth_date: formatDate(child.birth_date || '')
    })) || [],
    educational_background: employee?.educational_background?.map(edu => ({
      level: edu.level || '',
      school_name: edu.school_name || '',
      degree_course: edu.degree_course || '',
      period_from: formatDate(edu.period_from || ''),
      period_to: formatDate(edu.period_to || ''),
      highest_level_units: edu.highest_level_units || '',
      year_graduated: edu.year_graduated || '',
      honors_received: edu.honors_received || '',
    })) || [],
    civil_service_eligibility: employee?.civil_service_eligibility?.map(cse => ({
      eligibility: cse.eligibility || '',
      rating: cse.rating || '',
      exam_date: formatDate(cse.exam_date || ''),
      exam_place: cse.exam_place || '',
      license_no: cse.license_no || '',
      license_validity: formatDate(cse.license_validity || ''),
    })) || [],
    work_experience: employee?.work_experience?.map(work => ({
      position_title: work.position_title || '',
      company_name: work.company_name || '',
      company_address: work.company_address || '',
      date_from: formatDate(work.date_from || ''),
      date_to: formatDate(work.date_to || ''),
      monthly_salary: work.monthly_salary || '',
      salary_grade_step: work.salary_grade_step || '',
      status_of_appointment: work.status_of_appointment || '',
      is_gov_service: work.is_gov_service || false,
    })) || [{
      position_title: '', 
      company_name: '', 
      company_address: '',
      date_from: '', 
      date_to: '', 
      monthly_salary: '', 
      salary_grade_step: '', 
      status_of_appointment: '', 
      is_gov_service: false
    }],
    voluntary_work: employee?.voluntary_work?.map(vw => ({
      organization_name: vw.organization_name || '',
      organization_address: vw.organization_address || '',
      date_from: formatDate(vw.date_from || ''),
      date_to: formatDate(vw.date_to || ''),
      hours_rendered: vw.hours_rendered || '',
      position_or_nature: vw.position_or_nature || '',
    })) || [{
      organization_name: '', 
      organization_address: '',
      date_from: '', 
      date_to: '', 
      hours_rendered: '', 
      position_or_nature: ''
    }],
    learning_development: employee?.learning_development?.map(ld => ({
      title: ld.title || '',
      date_from: formatDate(ld.date_from || ''),
      date_to: formatDate(ld.date_to || ''),
      hours: ld.hours || '',
      type_of_ld: ld.type_of_ld || '',
      conducted_by: ld.conducted_by || '',
    })) || [],
    other_information: employee?.other_information || {
      skill_or_hobby: '',
      non_academic_distinctions: '',
      memberships: ''
    },
    references: employee?.references?.map(ref => ({
      fullname: ref.fullname || '',
      address: ref.address || '',
      telephone_no: ref.telephone_no || '',
    })) || [],
    questionnaire: employee?.questionnaire || [
      { question_number: 341, answer: false, details: '' }, // 34a: within third degree
      { question_number: 342, answer: false, details: '' }, // 34b: within fourth degree
      { question_number: 351, answer: false, details: '' }, // 35a: administrative offense
      { question_number: 352, answer: false, details: '' }, // 35b: criminal charge
      { question_number: 36, answer: false, details: '' }, // 36: conviction
      { question_number: 37, answer: false, details: '' }, // 37: separation from service
      { question_number: 381, answer: false, details: '' }, // 38a: candidate in election
      { question_number: 382, answer: false, details: '' }, // 38b: resigned during election
      { question_number: 39, answer: false, details: '' }, // 39: immigrant status
      { question_number: 401, answer: false, details: '' }, // 40a: indigenous group
      { question_number: 402, answer: false, details: '' }, // 40b: person with disability
      { question_number: 403, answer: false, details: '' }, // 40c: solo parent
    ]
  };

  type FormState = typeof initialData;

  const { data, setData: originalSetData, processing, post, put, reset } = useForm(initialData);
  
  // Wrapper for setData that tracks user interaction and clears errors
  const setData = useCallback((key: any, value?: any) => {
    // Mark that user has interacted with the form (only for manual typing, not programmatic updates)
    // Skip tracking for initial data load or imported data application
    if (!hasUserInteracted && value !== undefined && typeof key === 'string') {
      // Only track if it's a direct field update (not a function)
      setHasUserInteracted(true);
    }
    
    if (value !== undefined && typeof key === 'string') {
      // Clear errors for this field when user updates it
      // This ensures that when a user fixes a field, the error is removed immediately
      // Note: For nested fields (e.g., educational_background.4.period_to), the real-time
      // validation will clear the error when it re-validates, but we clear it here too for
      // immediate feedback
      setFormatErrors(prev => {
        const newErrors = { ...prev };
        // Remove error for this specific field
        if (key in newErrors) {
          delete newErrors[key];
        }
        // Also check for nested field errors (e.g., educational_background.0.period_to)
        // When updateSection is called, it passes the section name (e.g., 'educational_background')
        // so we need to clear all errors for that section
        Object.keys(newErrors).forEach(errorKey => {
          if (errorKey.startsWith(`${key}.`) || errorKey === key) {
            delete newErrors[errorKey];
          }
        });
        return newErrors;
      });
      
      setRequiredErrors(prev => {
        const newErrors = { ...prev };
        // Remove error for this specific field
        if (key in newErrors) {
          delete newErrors[key];
        }
        // Also check for nested field errors
        Object.keys(newErrors).forEach(errorKey => {
          if (errorKey.startsWith(`${key}.`) || errorKey === key) {
            delete newErrors[errorKey];
          }
        });
        return newErrors;
      });
    }
    
    // Call the original setData
    if (value !== undefined) {
      originalSetData(key, value);
    } else if (typeof key === 'function') {
      // Handle function form: setData((prev) => ({ ...prev, field: value }))
      originalSetData(key);
    } else {
      originalSetData(key);
    }
  }, [hasUserInteracted, originalSetData, currentStep, step1Tab, step2Tab, step3Tab, step4Tab]);

  const departmentLookup = useMemo(() => {
    const lookup = new Map<string, (typeof departments)[number]>();
    departments.forEach((dept) => {
      lookup.set(String(dept.id), dept);
    });
    return lookup;
  }, [departments]);

  // Define these before they're used in useMemo hooks
  const isAcademic = data.organization_type === 'academic';
  const isAdministrative = data.organization_type === 'administrative';
  const facultySelected = Boolean(data.faculty_id);
  const departmentSelected = Boolean(data.department_id);

  const filteredDepartments = useMemo(() => {
    const allDepartments = departments || [];
    
    // For academic: require faculty selection first
    if (isAcademic) {
      if (!facultySelected) {
        return []; // No departments available until faculty is selected
      }
      // Filter by organization type and selected faculties
      const selectedFacultyId = Number(data.faculty_id);
      return allDepartments.filter((dept: any) => {
        const deptType = dept.type || 'academic';
        return deptType === 'academic' && 
               dept.faculty_id && 
               Number(dept.faculty_id) === selectedFacultyId;
      });
    }
    
    // For administrative: show only administrative departments (offices)
    if (isAdministrative) {
      return allDepartments.filter((dept: any) => {
        const deptType = dept.type || 'academic';
        return deptType === 'administrative';
      });
    }

    return [];
  }, [data.organization_type, data.faculty_id, departments, isAcademic, isAdministrative, facultySelected]);

  // Filter positions based on organization type, selected departments, and faculties
  const filteredPositions = useMemo(() => {
    const availablePositions = positions || [];
    const selectedDepartmentId = data.department_id ? String(data.department_id) : null;
    const departmentSelected = Boolean(selectedDepartmentId);

    // For academic: require faculty selection first
    if (isAcademic) {
      if (!facultySelected) {
        return []; // No positions available until faculty is selected
      }

      const selectedFacultyId = Number(data.faculty_id);

      // If departments are selected, show positions from those departments AND faculty-level positions
      if (departmentSelected) {
        return availablePositions.filter((position: any) => {
          const departmentId = position.department_id ? String(position.department_id) : null;
          const facultyId = position.faculty_id ? Number(position.faculty_id) : null;

          // Check if position belongs to a selected department
          if (departmentId && selectedDepartmentId && departmentId === selectedDepartmentId) {
            // Verify the department is academic
            const dept = departmentLookup.get(departmentId);
            if (dept && dept.type === 'academic') {
              return true;
            }
          }

          // Check if position is faculty-level (no department) and matches selected faculties
          if (!departmentId && facultyId && facultyId === selectedFacultyId) {
            return true;
          }

          return false;
        });
      }

      // If only faculty is selected (no departments), show only faculty-level positions
      return availablePositions.filter((position: any) => {
        // Must be faculty-level (no department_id) and match selected faculties
        return !position.department_id && 
               position.faculty_id && 
               Number(position.faculty_id) === selectedFacultyId;
      });
    }

    // For administrative: show positions from selected administrative departments
    if (isAdministrative) {
      if (departmentSelected && selectedDepartmentId) {
        return availablePositions.filter((position: any) => {
          const departmentId = position.department_id ? String(position.department_id) : null;
          if (departmentId && departmentId === selectedDepartmentId) {
            // Verify the department is administrative
            const dept = departmentLookup.get(departmentId);
            return dept && dept.type === 'administrative';
          }
          return false;
        });
      }
      // If no department selected, show all positions that belong to administrative departments
      return availablePositions.filter((position: any) => {
        if (position.department_id) {
          const dept = departmentLookup.get(String(position.department_id));
          return dept && dept.type === 'administrative';
        }
        return false;
      });
    }

    return [];
  }, [data.organization_type, data.faculty_id, data.department_id, positions, departmentLookup, isAcademic, isAdministrative, facultySelected]);

  const hasPositionsAvailable = filteredPositions.length > 0;
  const hasPositionsForFaculty = facultySelected && filteredPositions.length > 0;
  
  // Check if the selected position is faculty-level (has faculty_id but no department_id)
  const selectedPosition = useMemo(() => {
    if (!data.position_id) return null;
    return positions.find(pos => String(pos.id) === String(data.position_id));
  }, [positions, data.position_id]);
  
  const isFacultyLevelPosition = selectedPosition 
    ? (selectedPosition.faculty_id && !selectedPosition.department_id)
    : false;
  
  const isDepartmentRequired = !isFacultyLevelPosition;
  const positionPlaceholder = isAdministrative
    ? (hasPositionsAvailable
        ? 'Select Position'
        : 'No positions available for this department')
    : (!facultySelected
        ? 'Select a faculty first'
        : hasPositionsAvailable
          ? 'Select Position'
          : departmentSelected
            ? 'No positions available for this department or faculty'
            : 'No positions available for this faculty');
  const availableDepartments = filteredDepartments;
  const hasDepartmentsForFaculty = availableDepartments.length > 0;
  const departmentPlaceholder = isAcademic
    ? (!facultySelected
        ? 'Select a faculty first'
        : hasDepartmentsForFaculty
          ? 'Select Department'
          : 'No departments available for this faculty')
    : (hasDepartmentsForFaculty
        ? 'Select Office'
        : 'No offices available');
  const shouldShowSelectFacultyMessage = isAcademic && !facultySelected && !isView;
  const shouldShowDepartmentWarning = isAcademic && facultySelected && !hasDepartmentsForFaculty && !isView;

  const handleOrganizationTypeChange = (value: string) => {
    if (data.organization_type === value) {
      return;
    }
    setData('organization_type', value);
    // Clear related fields when switching types
    setData('faculty_id', '');
    setData('department_id', '');
    setData('position_id', '');
  };

  const handleFacultyChange = (value: string) => {
    if (data.faculty_id === value) {
      return;
    }
    setData('faculty_id', value);
    setData('department_id', '');
    setData('position_id', '');
  };

  const handleDepartmentChange = (value: string) => {
    setData('department_id', value);
    if (!value) {
      setData('position_id', '');
      return;
    }

    const isCurrentPositionValid = positions.some(
      (pos) =>
        String(pos.id) === String(data.position_id || '') &&
        String(pos.department_id ?? '') === value
    );

    if (!isCurrentPositionValid) {
      setData('position_id', '');
    }
  };

  // Update department_id and position_id when employee data is loaded (only once on mount)
  useEffect(() => {
    if (employee && isEdit) {
      // Ensure department_id is set - check multiple possible sources
      const deptId = employee.department_id || employee.department?.id;
      if (deptId) {
        const deptIdStr = String(deptId);
        if (data.department_id !== deptIdStr) {
          setData('department_id', deptIdStr);
        }
      }
      
      // Ensure position_id is set - check multiple possible sources
      const posId = employee.position_id || employee.position?.id;
      if (posId) {
        const posIdStr = String(posId);
        if (data.position_id !== posIdStr) {
          setData('position_id', posIdStr);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee, isEdit]); // Only run when employee or isEdit changes

  useEffect(() => {
    if (!data.department_id) {
      return;
    }
    const matchingDepartment = departments.find(
      (dept) => String(dept.id) === String(data.department_id)
    );
    if (matchingDepartment?.faculty_id) {
      const facultyIdStr = String(matchingDepartment.faculty_id);
      if (data.faculty_id !== facultyIdStr) {
        setData('faculty_id', facultyIdStr);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.department_id, departments]);

  const applyImportedData = useCallback((payload: Partial<FormState>) => {
    if (!payload || Object.keys(payload).length === 0) {
      return;
    }

    setData((previous) => {
      const next = { ...previous };

      const assignPrimitive = (key: keyof FormState, value: string | number | boolean) => {
        if (typeof value === 'string') {
          if (value.trim() === '') {
            return;
          }
          (next as Record<string, unknown>)[key as string] = value;
          return;
        }

        (next as Record<string, unknown>)[key as string] = value;
      };

      Object.entries(payload).forEach(([key, value]) => {
        const typedKey = key as keyof FormState;

        if (Array.isArray(value)) {
          if (value.length) {
            (next as Record<string, unknown>)[typedKey as string] = value;
          }
          return;
        }

        if (value && typeof value === 'object') {
          (next as Record<string, unknown>)[typedKey as string] = {
            ...(next as Record<string, unknown>)[typedKey as string],
            ...value,
          };
          return;
        }

        if (value === null || value === undefined) {
          return;
        }

        assignPrimitive(typedKey, value as string | number | boolean);
      });

      return next;
    });

    toast.success('Imported CS Form 212 data applied. Review before saving.');
  }, [setData]);

  // This useEffect is redundant - real-time validation already handles this
  // Removed to avoid duplicate validation calls

  // Removed duplicate useEffect - importedData is already handled by the useEffect at line 256
  // This was causing the preview to reopen after being closed

  // Scroll to first error field
  useEffect(() => {
    if (Object.keys(errors).length > 0 && formRef.current) {
      const firstError = Object.keys(errors)[0];
      const errorElement = document.getElementById(firstError);
      
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus({ preventScroll: true });
      }
    }
  }, [errors]);

  const handleSubmit = (e: React.FormEvent) => {
    if (isView) {
      e.preventDefault();
      return;
    }
    
    e.preventDefault();
    
    // Mark that user has attempted submission
    setHasAttemptedSubmit(true);
    setShouldShowValidation(true);
    
    // Client-side validation using CS Form 212 compliant rules
    // Always use UNFILTERED validation result for submission check
    const validationResult = validateEmployeeData(data, positions);
    
    // Log validation result for debugging (only if there are errors)
    if (!validationResult.isValid) {
      console.log('Validation errors found on submit:', {
        isValid: validationResult.isValid,
        requiredErrorsCount: Object.keys(validationResult.requiredErrors).length,
        formatErrorsCount: Object.keys(validationResult.formatErrors).length,
        requiredErrors: validationResult.requiredErrors,
        formatErrors: validationResult.formatErrors,
      });
    }
    
    // On submit, always show ALL errors (not filtered by tab)
    // This ensures users see all validation errors when they try to submit
    setRequiredErrors(validationResult.requiredErrors);
    setFormatErrors(validationResult.formatErrors);
    
    // Always check validation using UNFILTERED result (check all fields, not just current tab)
    if (!validationResult.isValid) {
      // Check if there are required errors first
      if (Object.keys(validationResult.requiredErrors).length > 0) {
        const requiredCount = Object.keys(validationResult.requiredErrors).length;
        toast.error(`Please fill in ${requiredCount} required field(s) before submitting.`);
        // Scroll to first required error
        const firstRequiredError = Object.keys(validationResult.requiredErrors)[0];
        scrollToErrorField(firstRequiredError);
        return;
      }
      
      // If only format errors, show them
      if (Object.keys(validationResult.formatErrors).length > 0) {
        const formatCount = Object.keys(validationResult.formatErrors).length;
        toast.error(`Please fix ${formatCount} format validation error(s). Click on error messages to navigate to fields.`);
        return;
      }
      
      return;
    }
    
    // Clear all errors if validation passes
    setRequiredErrors({});
    setFormatErrors({});
    
    // Transform questionnaire answers to ensure they are proper booleans before submission
    const transformedQuestionnaire = data.questionnaire.map((q, idx) => {
      // Log original value before transformation
      console.log(`Question ${q.question_number} (index ${idx}):`, {
        originalAnswer: q.answer,
        originalType: typeof q.answer,
        originalValueString: String(q.answer)
      });
      
      // Handle various formats: boolean, string, number
      let answerValue: boolean;
      if (typeof q.answer === 'boolean') {
        answerValue = q.answer;
      } else if (typeof q.answer === 'string') {
        answerValue = q.answer.toLowerCase() === 'true' || q.answer === '1' || q.answer === 'yes';
      } else if (typeof q.answer === 'number') {
        answerValue = q.answer === 1;
      } else {
        // Fallback: convert to boolean
        answerValue = Boolean(q.answer);
      }
      
      console.log(`Question ${q.question_number} transformed:`, {
        original: q.answer,
        transformed: answerValue,
        type: typeof answerValue
      });
      
      return {
        question_number: q.question_number,
        answer: answerValue, // Explicitly ensure it's a boolean
        details: q.details || ''
      };
    });

    // Log questionnaire data for debugging
    console.log('=== QUESTIONNAIRE SUBMISSION DEBUG ===');
    console.log('Raw questionnaire data from state:', JSON.stringify(data.questionnaire, null, 2));
    console.log('Transformed questionnaire data:', JSON.stringify(transformedQuestionnaire, null, 2));
    console.log('Questionnaire answers summary:', transformedQuestionnaire.map(q => ({ 
      question: q.question_number, 
      answer: q.answer, 
      type: typeof q.answer,
      isTrue: q.answer === true,
      isFalse: q.answer === false,
      details: q.details ? 'has details' : 'no details'
    })));

    // Prepare submission data with transformed questionnaire
    // Deep clone to avoid mutating the original data
    const submissionData = {
      ...data,
      questionnaire: transformedQuestionnaire.map(q => {
        // Explicitly convert to boolean - answer should already be boolean from transformation
        // But ensure it's definitely true or false
        const boolAnswer = q.answer === true;
        
        return {
          question_number: q.question_number,
          answer: boolAnswer, // This is already a boolean
          details: q.details || ''
        };
      })
    };
    const { faculty_id: _removedFacultyId, ...sanitizedSubmissionData } = submissionData;
    
    console.log('Full submission data questionnaire:', JSON.stringify(submissionData.questionnaire, null, 2));
    console.log('=====================================');

    const routeName = isEdit ? 'employees.update' : 'employees.store';
    const routeParams = isEdit ? { employee: employee?.id } : {};

    // Submit using router directly with transformed data
    if (isEdit) {
      router.put(route(routeName, routeParams), sanitizedSubmissionData, {
        onSuccess: () => {
          // Clear all errors on successful save
          setRequiredErrors({});
          setFormatErrors({});
          setHasAttemptedSubmit(false);
          setShouldShowValidation(false);
          toast.success('Employee updated successfully.');
        },
        onError: (errors: any) => {
          console.error('=== SUBMISSION ERRORS (UPDATE) ===');
          console.error('Submission errors:', errors);
          console.error('Form data being submitted:', sanitizedSubmissionData);
          console.error('Questionnaire answers:', transformedQuestionnaire.map(q => ({ 
            q: q.question_number, 
            answer: q.answer, 
            type: typeof q.answer 
          })));
          
          // Convert backend errors to format errors for display
          // BUT: Validate against current data state to filter out errors for fields that have been fixed
          const backendFormatErrors: Record<string, string> = {};
          const backendRequiredErrors: Record<string, string> = {};
          
          // First, run client-side validation on current data to see what's actually invalid
          const currentValidation = validateEmployeeData(data, positions);
          
          Object.entries(errors).forEach(([field, message]) => {
            const msg = Array.isArray(message) ? message[0] : message;
            const errorMessage = typeof msg === 'string' ? msg : String(msg);
            
            // Only include backend error if the field is also invalid in current client-side validation
            // This prevents showing errors for fields that have been fixed
            const isStillInvalid = 
              field in currentValidation.requiredErrors || 
              field in currentValidation.formatErrors;
            
            if (isStillInvalid) {
              // Determine if it's a required or format error based on message content
              if (errorMessage.toLowerCase().includes('required') || 
                  errorMessage.toLowerCase().includes('must be filled')) {
                backendRequiredErrors[field] = errorMessage;
              } else {
                backendFormatErrors[field] = errorMessage;
              }
            } else {
              // Field has been fixed - log it but don't show the error
              console.log(`Field ${field} was fixed but backend still reports error. Ignoring backend error.`);
            }
          });
          
          // Replace (not merge) errors in state so old errors don't persist
          // This ensures that when a user fixes an error and saves again, old errors are cleared
          setFormatErrors(backendFormatErrors);
          setRequiredErrors(backendRequiredErrors);
          setShouldShowValidation(true);
          setHasAttemptedSubmit(true);
          
          // Mark all tabs as interacted so errors show across all tabs
          const allTabs = [
            'step1-basic', 'step1-address', 'step1-government',
            'step2-family', 'step2-education',
            'step3-eligibility', 'step3-experience',
            'step4-voluntary', 'step4-learning', 'step4-other',
            'step5'
          ];
          setInteractedTabs(new Set(allTabs));
          
          // Show error summary
          const errorCount = Object.keys(errors).length;
          if (errorCount > 0) {
            const firstError = Object.entries(errors)[0];
            if (firstError) {
              const [field, message] = firstError;
              const msg = Array.isArray(message) ? message[0] : message;
              toast.error(`Validation Error: ${field} - ${msg}`);
              
              // Scroll to first error only if there are actual errors
              setTimeout(() => {
                scrollToErrorField(field);
              }, 100);
            }
            
            if (errorCount > 1) {
              toast.error(`There are ${errorCount} validation errors. Please fix them before saving.`);
            }
          } else {
            toast.error('Failed to update employee. Please check the form for errors.');
          }
        },
        preserveScroll: true,
      });
    } else {
      router.post(route(routeName, routeParams), sanitizedSubmissionData, {
        onSuccess: () => {
          // Clear all errors on successful save
          setRequiredErrors({});
          setFormatErrors({});
          setHasAttemptedSubmit(false);
          setShouldShowValidation(false);
          toast.success('Employee created successfully.');
        },
        onError: (errors: any) => {
          console.error('Submission errors:', errors);
          console.error('Form data being submitted:', sanitizedSubmissionData);
          console.error('Questionnaire answers:', transformedQuestionnaire.map(q => ({ 
            q: q.question_number, 
            answer: q.answer, 
            type: typeof q.answer 
          })));
          
          // Convert backend errors to format errors for display
          // BUT: Validate against current data state to filter out errors for fields that have been fixed
          const backendFormatErrors: Record<string, string> = {};
          const backendRequiredErrors: Record<string, string> = {};
          
          // First, run client-side validation on current data to see what's actually invalid
          const currentValidation = validateEmployeeData(data, positions);
          
          Object.entries(errors).forEach(([field, message]) => {
            const msg = Array.isArray(message) ? message[0] : message;
            const errorMessage = typeof msg === 'string' ? msg : String(msg);
            
            // Only include backend error if the field is also invalid in current client-side validation
            // This prevents showing errors for fields that have been fixed
            const isStillInvalid = 
              field in currentValidation.requiredErrors || 
              field in currentValidation.formatErrors;
            
            if (isStillInvalid) {
              // Determine if it's a required or format error based on message content
              if (errorMessage.toLowerCase().includes('required') || 
                  errorMessage.toLowerCase().includes('must be filled')) {
                backendRequiredErrors[field] = errorMessage;
              } else {
                backendFormatErrors[field] = errorMessage;
              }
            } else {
              // Field has been fixed - log it but don't show the error
              console.log(`Field ${field} was fixed but backend still reports error. Ignoring backend error.`);
            }
          });
          
          // Replace (not merge) errors in state so old errors don't persist
          // This ensures that when a user fixes an error and saves again, old errors are cleared
          setFormatErrors(backendFormatErrors);
          setRequiredErrors(backendRequiredErrors);
          setShouldShowValidation(true);
          setHasAttemptedSubmit(true);
          
          // Mark all tabs as interacted so errors show across all tabs
          const allTabs = [
            'step1-basic', 'step1-address', 'step1-government',
            'step2-family', 'step2-education',
            'step3-eligibility', 'step3-experience',
            'step4-voluntary', 'step4-learning', 'step4-other',
            'step5'
          ];
          setInteractedTabs(new Set(allTabs));
          
          // Show error summary
          const errorCount = Object.keys(errors).length;
          if (errorCount > 0) {
            const firstError = Object.entries(errors)[0];
            if (firstError) {
              const [field, message] = firstError;
              const msg = Array.isArray(message) ? message[0] : message;
              toast.error(`Validation Error: ${field} - ${msg}`);
              
              // Scroll to first error only if there are actual errors
              setTimeout(() => {
                scrollToErrorField(field);
              }, 100);
            }
            
            if (errorCount > 1) {
              toast.error(`There are ${errorCount} validation errors. Please fix them before saving.`);
            }
          } else {
            toast.error('Failed to create employee. Please check the form for errors.');
          }
        },
        preserveScroll: true,
      });
    }
  };

  const updateSection = (section: string, index: number, field: string, value: any) => {
    if (isView) return;
    
    const arr = [...(data as any)[section]];
    // Ensure boolean values are properly set for questionnaire answers
    if (section === 'questionnaire' && field === 'answer') {
      // Explicitly convert to boolean - value should already be true/false from radio button
      const boolValue = value === true || value === 'true' || value === 1 || value === '1' || value === 'yes';
      arr[index] = { ...arr[index], [field]: Boolean(boolValue) };
      
      // Debug log to verify the value is being set correctly
      console.log(`Setting questionnaire[${index}].answer to:`, {
        originalValue: value,
        originalType: typeof value,
        convertedValue: Boolean(boolValue),
        convertedType: typeof Boolean(boolValue)
      });
    } else {
      arr[index] = { ...arr[index], [field]: value };
    }
    setData(section as any, arr);
  };

  const addRow = (section: string, template: any) => {
    if (isView) return;
    
    const arr = [...(data as any)[section], template];
    setData(section as any, arr);
  };

  const removeRow = (section: string, idx: number) => {
    if (isView) return;
    
    const arr = (data as any)[section].filter((_: any, i: number) => i !== idx);
    setData(section as any, arr);
  };

  // Helper function to update family background by relation
  const updateFamilyBackground = (relation: string, field: string, value: string) => {
    if (isView) return;
    const idx = data.family_background.findIndex(fb => fb.relation === relation);
    if (idx >= 0) {
      updateSection('family_background', idx, field, value);
    } else {
      addRow('family_background', { 
        relation, [field]: value, 
        surname: '', first_name: '', middle_name: '', name_extension: '', 
        occupation: '', employer: '', business_address: '', telephone_no: '' 
      });
    }
  };

  const getFamilyMember = (relation: string) => {
    return data.family_background.find(fb => fb.relation === relation) || {
      surname: '', first_name: '', middle_name: '', name_extension: '',
      occupation: '', employer: '', business_address: '', telephone_no: ''
    };
  };

  const handleSameAsResidential = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isView) return;
    
    const checked = e.target.checked;
    setData('same_as_residential', checked);
    
    if (checked) {
      setData({
        ...data,
        same_as_residential: true,
        perm_house_no: data.res_house_no,
        perm_street: data.res_street,
        perm_subdivision: data.res_subdivision,
        perm_barangay: data.res_barangay,
        perm_city: data.res_city,
        perm_province: data.res_province,
        perm_zip_code: data.res_zip_code
      });
    }
  };

  const handleTriggerImport = () => {
    if (isView) return;
    fileInputRef.current?.click();
  };

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isView) return;

    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    router.post(route('employees.import.cs_form_212'), { pds_file: file }, {
      forceFormData: true,
      onSuccess: (page) => {
        // Set pendingImport from the server response
        const importedData = (page.props as any)?.importedData;
        if (importedData) {
          // Reset the processed flag to allow new import
          hasProcessedImportedData.current = false;
          setPendingImport(importedData as Partial<FormState>);
          hasProcessedImportedData.current = true;
          toast.success('CS Form 212 file uploaded successfully. Please review the preview below.');
        }
      },
      onError: (uploadErrors) => {
        const uploadError = uploadErrors.pds_file ?? uploadErrors.error ?? 'Failed to import CS Form 212 file.';
        const message = Array.isArray(uploadError) ? uploadError[0] : uploadError;
        toast.error(message);
      },
      onFinish: () => {
        setIsImporting(false);
        if (event.target) {
          event.target.value = '';
        }
      },
    });
  };

  const handleApplyImportedData = () => {
    if (!pendingImport) return;
    applyImportedData(pendingImport);
    setPendingImport(null);
    // Enable validation after applying imported data
    setHasAppliedImportedData(true);
    setShouldShowValidation(true);
    setHasUserInteracted(true);
    toast.success('Imported data applied to form. Validation is now enabled.');
  };

  const handleDiscardImportedData = () => {
    setPendingImport(null);
    toast.info('Imported data discarded. No changes were applied.');
  };

  // Handle citizenship change
  useEffect(() => {
    if (isView) return;
    
    if (data.citizenship !== 'Dual') {
      setData({
        ...data,
        dual_citizenship: false,
        dual_citizenship_country: '',
        citizenship_type: ''
      });
    } else {
      setData({
        ...data,
        dual_citizenship: true
      });
    }
  }, [data.citizenship]);

  // Helper function to get the current tab identifier
  const getCurrentTabId = (): string => {
    if (currentStep === 1) return `step1-${step1Tab}`;
    if (currentStep === 2) return `step2-${step2Tab}`;
    if (currentStep === 3) return `step3-${step3Tab}`;
    if (currentStep === 4) return `step4-${step4Tab}`;
    return `step${currentStep}`;
  };

  // Helper function to filter errors to only show fields in the current tab
  // AND only if the user has interacted with that tab
  // EXCEPTION: When imported data is applied, show ALL errors regardless of tab
  const filterErrorsForCurrentTab = (errors: Record<string, string>): Record<string, string> => {
    // If imported data was applied, show ALL errors (no filtering by tab)
    if (hasAppliedImportedData) {
      return errors;
    }
    
    const filtered: Record<string, string> = {};
    const currentTabId = getCurrentTabId();
    
    // Only show errors if user has interacted with this tab OR has attempted submit
    const shouldShowErrorsForTab = interactedTabs.has(currentTabId) || hasAttemptedSubmit;
    
    if (!shouldShowErrorsForTab) {
      return {}; // Don't show any errors if tab hasn't been interacted with
    }
    
    // Define which fields belong to which step/tab
    const step1BasicFields = ['id', 'surname', 'first_name', 'middle_name', 'name_extension', 'birth_date', 'birth_place', 'sex', 'civil_status', 'faculty_id', 'department_id', 'position_id', 'email_address', 'mobile_no', 'telephone_no', 'employee_type', 'status', 'employment_status', 'date_hired', 'date_regularized', 'citizenship'];
    const step1AddressFields = ['res_city', 'res_province', 'res_zip_code', 'res_house_no', 'res_street', 'res_subdivision', 'res_barangay', 'perm_city', 'perm_province', 'perm_zip_code', 'perm_house_no', 'perm_street', 'perm_subdivision', 'perm_barangay'];
    const step1GovernmentFields = ['gsis_id_no', 'pagibig_id_no', 'philhealth_no', 'sss_no', 'tin_no'];
    
    // Get fields for current step/tab
    let currentTabFields: string[] = [];
    
    if (currentStep === 1) {
      if (step1Tab === 'basic') {
        currentTabFields = step1BasicFields;
      } else if (step1Tab === 'address') {
        currentTabFields = step1AddressFields;
      } else if (step1Tab === 'government') {
        currentTabFields = step1GovernmentFields;
      }
    } else if (currentStep === 2) {
      // Step 2 fields (education, family)
      if (step2Tab === 'education') {
        // Educational background fields
        Object.keys(errors).forEach(key => {
          if (key.startsWith('educational_background.')) {
            filtered[key] = errors[key];
          }
        });
      }
      // Family tab has no required fields
    } else if (currentStep === 3) {
      // Step 3 fields (experience, eligibility)
      if (step3Tab === 'experience') {
        // Work experience fields
        Object.keys(errors).forEach(key => {
          if (key.startsWith('work_experience.')) {
            filtered[key] = errors[key];
          }
        });
      }
      // Eligibility tab has no required fields
    } else if (currentStep === 4) {
      // Step 4 fields (voluntary, learning, other)
      if (step4Tab === 'voluntary') {
        Object.keys(errors).forEach(key => {
          if (key.startsWith('voluntary_work.')) {
            filtered[key] = errors[key];
          }
        });
      } else if (step4Tab === 'learning') {
        Object.keys(errors).forEach(key => {
          if (key.startsWith('learning_development.')) {
            filtered[key] = errors[key];
          }
        });
      }
    } else if (currentStep === 5) {
      // Step 5 fields (references)
      Object.keys(errors).forEach(key => {
        if (key.startsWith('references.')) {
          filtered[key] = errors[key];
        }
      });
    }
    
    // For step 1, filter simple fields
    if (currentStep === 1 && currentTabFields.length > 0) {
      Object.keys(errors).forEach(key => {
        // Check if it's a simple field (not nested)
        if (!key.includes('.')) {
          if (currentTabFields.includes(key)) {
            filtered[key] = errors[key];
          }
        }
      });
    }
    
    return filtered;
  };

  // Helper function to get error message for a field
  // Real-time validation - only run if user has interacted or attempted submit
  useEffect(() => {
    if (isView) return; // Skip validation in view mode
    
    // Only validate if:
    // 1. User has interacted with form (typed in fields), OR
    // 2. User has attempted submission, OR
    // 3. User has applied imported data
    if (!shouldShowValidation && !hasAttemptedSubmit && !hasAppliedImportedData) {
      // Clear errors if validation shouldn't run yet
      setRequiredErrors({});
      setFormatErrors({});
      return;
    }
    
    const validationResult = validateEmployeeData(data, positions);
    // Filter errors to only show fields in the current tab (for display)
    const filteredRequiredErrors = filterErrorsForCurrentTab(validationResult.requiredErrors);
    const filteredFormatErrors = filterErrorsForCurrentTab(validationResult.formatErrors);
    
    // Update errors: 
    // 1. Clear ALL errors for fields that are now valid (across all tabs, not just current)
    // 2. Add/update errors from current validation
    // If user has attempted submit, show ALL errors (not filtered)
    // Otherwise, filter errors to current tab for display only
    // This ensures that when a user fixes a field, the error is removed immediately,
    // regardless of which tab the field is in
    
    if (hasAttemptedSubmit || hasAppliedImportedData) {
      // On submit or after import, show ALL errors (not filtered)
      setRequiredErrors(validationResult.requiredErrors);
      setFormatErrors(validationResult.formatErrors);
    } else {
      // During real-time validation, filter errors to current tab for display
      setRequiredErrors(prev => {
        const merged = { ...prev };
        // Remove errors for fields that are now valid (check against full validation result, not filtered)
        Object.keys(merged).forEach(key => {
          if (!(key in validationResult.requiredErrors)) {
            delete merged[key];
          }
        });
        // Add/update errors from current validation (filtered to current tab for display)
        Object.assign(merged, filteredRequiredErrors);
        return merged;
      });
      
      setFormatErrors(prev => {
        const merged = { ...prev };
        // Remove errors for fields that are now valid (check against full validation result, not filtered)
        Object.keys(merged).forEach(key => {
          if (!(key in validationResult.formatErrors)) {
            delete merged[key];
          }
        });
        // Add/update errors from current validation (filtered to current tab for display)
        Object.assign(merged, filteredFormatErrors);
        return merged;
      });
    }
  }, [data, positions, isView, shouldShowValidation, hasAttemptedSubmit, hasAppliedImportedData, currentStep, step1Tab, step2Tab, step3Tab, step4Tab]);

  // Function to scroll to error field
  const scrollToErrorField = (errorKey: string) => {
    let errorElement: HTMLElement | null = null;
    let needsNavigation = false;
    let targetStep = currentStep;
    let targetTab = step1Tab;
    
    // Handle nested field errors (e.g., educational_background.5.period_to)
    if (errorKey.includes('.')) {
      const parts = errorKey.split('.');
      const section = parts[0];
      const index = parts[1];
      const field = parts[2] || 'date_range'; // Handle date_range case
      
      // Map field names to ID patterns (convert snake_case to kebab-case)
      const fieldToId: Record<string, string> = {
        'period_from': 'period-from',
        'period_to': 'period-to',
        'date_from': 'date-from',
        'date_to': 'date-to',
        'date_range': 'date-to', // date_range errors should point to date_to field
        'exam_date': 'exam-date',
      };
      
      const fieldId = fieldToId[field] || field.replace(/_/g, '-');
      
      // Map section names to field ID patterns and navigation
      const sectionConfig: Record<string, { idPattern: string; step: number; tab: string }> = {
        'educational_background': { 
          idPattern: `edu-${fieldId}-${index}`, 
          step: 2, 
          tab: 'education' 
        },
        'work_experience': { 
          idPattern: `work-${fieldId}-${index}`, 
          step: 3, 
          tab: 'experience' 
        },
        'learning_development': { 
          idPattern: `ld-${fieldId}-${index}`, 
          step: 4, 
          tab: 'learning' 
        },
        'voluntary_work': { 
          idPattern: `vw-${fieldId}-${index}`, 
          step: 4, 
          tab: 'voluntary' 
        },
        'civil_service_eligibility': {
          idPattern: `elig-${fieldId}-${index}`,
          step: 3,
          tab: 'eligibility'
        },
      };
      
      const config = sectionConfig[section];
      if (config) {
        // Navigate to the correct step/tab first
        if (currentStep !== config.step) {
          setCurrentStep(config.step);
          needsNavigation = true;
        }
        if (config.step === 2 && step2Tab !== config.tab) {
          setStep2Tab(config.tab as any);
          needsNavigation = true;
        } else if (config.step === 3 && step3Tab !== config.tab) {
          setStep3Tab(config.tab as any);
          needsNavigation = true;
        } else if (config.step === 4 && step4Tab !== config.tab) {
          setStep4Tab(config.tab as any);
          needsNavigation = true;
        }
        
        // Wait for navigation, then find the element by exact ID
        const findField = (attempt = 0) => {
          // Try exact ID first - this is the most reliable (e.g., "ld-date-to-5")
          errorElement = document.getElementById(config.idPattern);
          
          if (!errorElement) {
            // Try with querySelector using exact ID
            errorElement = document.querySelector(`input#${config.idPattern}`) as HTMLElement;
          }
          
          if (!errorElement) {
            // Try finding by type="date" with the exact ID (in case it's a date input)
            errorElement = document.querySelector(`input[type="date"]#${config.idPattern}`) as HTMLElement;
          }
          
          if (!errorElement) {
            // Find by matching the exact pattern: prefix-fieldId-index
            // e.g., for work-date-to-9, find input with id ending in -9 and containing date-to
            const prefix = config.idPattern.split('-')[0]; // e.g., "work" or "ld"
            const allSectionInputs = Array.from(document.querySelectorAll(`input[id^="${prefix}-"]`)) as HTMLElement[];
            
            // Find the input that exactly matches our pattern
            for (const input of allSectionInputs) {
              const inputId = input.id;
              // Match pattern: prefix-fieldId-index (e.g., "work-date-to-9" or "ld-date-to-5")
              const idRegex = new RegExp(`^${prefix}-${fieldId}-${index}$`);
              if (idRegex.test(inputId)) {
                errorElement = input;
                break;
              }
            }
          }
          
          // Also try finding by the pattern without escaping (direct string match)
          if (!errorElement) {
            const allInputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLElement[];
            for (const input of allInputs) {
              if (input.id === config.idPattern) {
                errorElement = input;
                break;
              }
            }
          }
          
          // If still not found, try finding by name attribute (format: section[index][field])
          if (!errorElement) {
            const namePattern = `${section}[${index}][${field}]`;
            errorElement = document.querySelector(`input[name="${namePattern}"]`) as HTMLElement;
          }
          
          // If still not found, try finding by FloatingInput's auto-generated ID pattern
          // FloatingInput generates: floating-input-${label.toLowerCase().replace(/\s+/g, '-')}
          if (!errorElement) {
            // Map field to label text
            const fieldToLabel: Record<string, string> = {
              'date_from': 'Date From',
              'date_to': 'Date To',
              'date_range': 'Date To', // date_range errors point to date_to
              'period_from': 'Period From',
              'period_to': 'Period To',
              'exam_date': 'Exam Date',
            };
            
            const labelText = fieldToLabel[field] || field.replace(/_/g, ' ');
            if (labelText) {
              const normalizedLabel = labelText.toLowerCase().replace(/\s+/g, '-');
              const floatingInputId = `floating-input-${normalizedLabel}`;
              
              // Find all inputs with this FloatingInput ID pattern
              const allFloatingInputs = Array.from(document.querySelectorAll(`input[id="${floatingInputId}"], input[id^="${floatingInputId}-"]`)) as HTMLElement[];
              
              // If there are multiple (because of repeating sections), find the one in the correct index
              // Look for the input that's in the section with the matching index
              // We can find it by looking for the parent container that contains the index
              if (allFloatingInputs.length > 0) {
                // Find the section container (usually has a key or data attribute with the index)
                const sectionContainers = Array.from(document.querySelectorAll(`[data-section="${section}"], [data-index="${index}"]`));
                
                for (const input of allFloatingInputs) {
                  // Check if this input is within a container that matches our index
                  let parent = input.closest('.space-y-4, .space-y-6, .p-4, .border');
                  let foundMatch = false;
                  
                  // Try to find the index by looking at surrounding elements
                  // Check if there's a label or text that indicates this is the right record
                  const container = input.closest('div[class*="space-y"], div[class*="border"]');
                  if (container) {
                    // Look for text that might indicate the record number
                    const containerText = container.textContent || '';
                    // This is a heuristic - we'll try to match by position in the array
                    // Count how many similar sections come before this one
                    const allSimilarContainers = Array.from(document.querySelectorAll(`input[id="${floatingInputId}"], input[id^="${floatingInputId}-"]`));
                    const currentIndex = allSimilarContainers.indexOf(input);
                    if (currentIndex === parseInt(index)) {
                      foundMatch = true;
                    }
                  }
                  
                  if (foundMatch || allFloatingInputs.length === 1) {
                    errorElement = input;
                    break;
                  }
                }
                
                // If we still haven't found it and there are multiple, just use the one at the index position
                if (!errorElement && allFloatingInputs.length > parseInt(index)) {
                  errorElement = allFloatingInputs[parseInt(index)];
                } else if (!errorElement && allFloatingInputs.length > 0) {
                  // Last resort: use the first one
                  errorElement = allFloatingInputs[0];
                }
              }
            }
          }
          
          // If still not found, try finding by label text and then finding nearby input
          if (!errorElement) {
            const fieldToLabel: Record<string, string> = {
              'date_from': 'Date From',
              'date_to': 'Date To',
              'date_range': 'Date To',
              'period_from': 'Period From',
              'period_to': 'Period To',
              'exam_date': 'Exam Date',
            };
            
            const labelText = fieldToLabel[field] || field.replace(/_/g, ' ');
            if (labelText) {
              const labels = Array.from(document.querySelectorAll('label'));
              const matchingLabels = labels.filter(label => {
                const text = label.textContent?.trim() || '';
                return text.toLowerCase().includes(labelText.toLowerCase());
              });
              
              // If we found labels, try to find the input at the correct index
              if (matchingLabels.length > 0) {
                const targetIndex = parseInt(index);
                if (matchingLabels.length > targetIndex) {
                  const targetLabel = matchingLabels[targetIndex];
                  const labelFor = targetLabel.getAttribute('for');
                  if (labelFor) {
                    errorElement = document.getElementById(labelFor) as HTMLElement;
                  } else {
                    // Find input near the label
                    const parent = targetLabel.closest('.relative, div');
                    if (parent) {
                      errorElement = parent.querySelector('input[type="date"], input') as HTMLElement;
                    }
                  }
                }
              }
            }
          }
          
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Small delay before focus to ensure scroll completes
            setTimeout(() => {
              errorElement?.focus();
            }, 100);
          } else if (attempt < 5) {
            // Retry if element not found yet (DOM might still be updating)
            setTimeout(() => findField(attempt + 1), 300);
          } else {
            // Last resort: try to find by data attribute or scroll to section
            console.warn(`Could not find field with ID: ${config.idPattern}. Attempted to navigate to ${section} record ${parseInt(index) + 1}`);
            scrollToTop();
          }
        };
        
        // Wait longer if navigation is needed to ensure DOM is updated
        if (needsNavigation) {
          // Wait for React to re-render after state changes
          setTimeout(findField, 600);
        } else {
          setTimeout(findField, 100);
        }
        return;
      }
    } else {
      // Simple field - map to step and tab, then navigate
      const fieldToStepTab: Record<string, { step: number; tab: string }> = {
        // Step 1 - Basic tab
        'id': { step: 1, tab: 'basic' },
        'surname': { step: 1, tab: 'basic' },
        'first_name': { step: 1, tab: 'basic' },
        'middle_name': { step: 1, tab: 'basic' },
        'name_extension': { step: 1, tab: 'basic' },
        'birth_date': { step: 1, tab: 'basic' },
        'birth_place': { step: 1, tab: 'basic' },
        'sex': { step: 1, tab: 'basic' },
        'civil_status': { step: 1, tab: 'basic' },
        'faculty_id': { step: 1, tab: 'basic' },
        'department_id': { step: 1, tab: 'basic' },
        'position_id': { step: 1, tab: 'basic' },
        'email_address': { step: 1, tab: 'basic' },
        'mobile_no': { step: 1, tab: 'basic' },
        'telephone_no': { step: 1, tab: 'basic' },
        'employee_type': { step: 1, tab: 'basic' },
        'status': { step: 1, tab: 'basic' },
        'employment_status': { step: 1, tab: 'basic' },
        'date_hired': { step: 1, tab: 'basic' },
        'date_regularized': { step: 1, tab: 'basic' },
        'citizenship': { step: 1, tab: 'basic' },
        // Step 1 - Address tab
        'res_city': { step: 1, tab: 'address' },
        'res_province': { step: 1, tab: 'address' },
        'res_zip_code': { step: 1, tab: 'address' },
        'res_house_no': { step: 1, tab: 'address' },
        'res_street': { step: 1, tab: 'address' },
        'res_subdivision': { step: 1, tab: 'address' },
        'res_barangay': { step: 1, tab: 'address' },
        'perm_city': { step: 1, tab: 'address' },
        'perm_province': { step: 1, tab: 'address' },
        'perm_zip_code': { step: 1, tab: 'address' },
        // Step 1 - Government tab
        'gsis_id_no': { step: 1, tab: 'government' },
        'pagibig_id_no': { step: 1, tab: 'government' },
        'philhealth_no': { step: 1, tab: 'government' },
        'sss_no': { step: 1, tab: 'government' },
        'tin_no': { step: 1, tab: 'government' },
      };
      
      const stepTabConfig = fieldToStepTab[errorKey];
      
      if (stepTabConfig) {
        // Navigate to the correct step/tab first
        if (currentStep !== stepTabConfig.step) {
          setCurrentStep(stepTabConfig.step);
          needsNavigation = true;
        }
        
        if (stepTabConfig.step === 1 && step1Tab !== stepTabConfig.tab) {
          setStep1Tab(stepTabConfig.tab as any);
          needsNavigation = true;
        }
        
        // Wait for navigation, then find the field
        const findField = (attempt = 0) => {
          // Map field keys to their label text for finding FloatingInput components
          const fieldToLabel: Record<string, string> = {
            'surname': 'Surname',
            'first_name': 'First Name',
            'middle_name': 'Middle Name',
            'name_extension': 'Name Extension',
            'birth_date': 'Date of Birth',
            'birth_place': 'Place of Birth',
            'sex': 'Sex',
            'civil_status': 'Civil Status',
            'faculty_id': 'Faculty',
            'department_id': 'Department',
            'position_id': 'Position',
            'email_address': 'Email Address',
            'mobile_no': 'Mobile No.',
            'telephone_no': 'Telephone Number',
            'employee_type': 'Employee Type',
            'status': 'Status',
            'employment_status': 'Employment Status',
            'date_hired': 'Date Hired',
            'date_regularized': 'Date Regularized',
            'citizenship': 'Citizenship',
            'res_city': 'City/Municipality',
            'res_province': 'Province',
            'res_zip_code': 'ZIP Code',
            'res_house_no': 'House/Block/Lot No.',
            'res_street': 'Street',
            'res_subdivision': 'Subdivision/Village',
            'res_barangay': 'Barangay',
            'perm_city': 'City/Municipality',
            'perm_province': 'Province',
            'perm_zip_code': 'ZIP Code',
          };
          
          const labelText = fieldToLabel[errorKey];
          
          // Try multiple selectors to find the field
          // 1. Try exact ID match
          errorElement = document.getElementById(errorKey);
          
          // 2. Try name attribute
          if (!errorElement) {
            errorElement = document.querySelector(`[name="${errorKey}"]`) as HTMLElement;
          }
          
          // 3. Try FloatingInput auto-generated ID pattern (if label is known)
          // FloatingInput generates: floating-input-${label.toLowerCase().replace(/\s+/g, '-')}
          if (!errorElement && labelText) {
            const normalizedLabel = labelText.toLowerCase().replace(/\s+/g, '-');
            const floatingInputId = `floating-input-${normalizedLabel}`;
            errorElement = document.getElementById(floatingInputId);
            
            // If not found, try without special characters (like periods)
            if (!errorElement) {
              const cleanLabel = normalizedLabel.replace(/[^a-z0-9-]/g, '');
              if (cleanLabel !== normalizedLabel) {
                errorElement = document.getElementById(`floating-input-${cleanLabel}`);
              }
            }
          }
          
          // 4. Try finding by label text (for FloatingInput and RadioGroup components)
          if (!errorElement && labelText) {
            const labels = Array.from(document.querySelectorAll('label'));
            const matchingLabel = labels.find(label => {
              const text = label.textContent?.trim() || '';
              // Check if label text matches (ignoring asterisks and extra whitespace)
              const cleanText = text.replace(/\s*\*?\s*$/, '').toLowerCase();
              const cleanLabelText = labelText.toLowerCase();
              return cleanText === cleanLabelText ||
                     cleanText.includes(cleanLabelText) ||
                     cleanLabelText.includes(cleanText);
            });
            
            if (matchingLabel) {
              const labelFor = matchingLabel.getAttribute('for');
              if (labelFor) {
                errorElement = document.getElementById(labelFor) as HTMLElement;
              } else {
                // For RadioGroup: find the first radio button in the group
                if (errorKey === 'civil_status' || errorKey === 'sex') {
                  const radioGroup = matchingLabel.closest('.space-y-2');
                  if (radioGroup) {
                    errorElement = radioGroup.querySelector('input[type="radio"]') as HTMLElement;
                  }
                }
                
                // For FloatingInput: try to find input near the label
                if (!errorElement) {
                  const parent = matchingLabel.closest('.relative');
                  if (parent) {
                    errorElement = parent.querySelector('input, select') as HTMLElement;
                  }
                }
                
                if (!errorElement) {
                  errorElement = matchingLabel.nextElementSibling?.querySelector('input, select') as HTMLElement ||
                                matchingLabel.parentElement?.querySelector('input, select') as HTMLElement;
                }
              }
            }
          }
          
          // 5. Special handling for RadioGroup fields (civil_status, sex)
          if (!errorElement && (errorKey === 'civil_status' || errorKey === 'sex')) {
            // Find RadioGroup by looking for label with matching text
            const allLabels = Array.from(document.querySelectorAll('label'));
            const radioLabel = allLabels.find(label => {
              const text = label.textContent?.trim() || '';
              const cleanText = text.replace(/\s*\*?\s*$/, '').toLowerCase();
              return (errorKey === 'civil_status' && (cleanText === 'civil status' || cleanText.includes('civil status'))) ||
                     (errorKey === 'sex' && (cleanText === 'sex' || cleanText.includes('sex')));
            });
            
            if (radioLabel) {
              // Find the RadioGroup container (has class 'space-y-2')
              const radioGroupContainer = radioLabel.closest('.space-y-2');
              if (radioGroupContainer) {
                // Try to find the first radio button
                const firstRadio = radioGroupContainer.querySelector('input[type="radio"]') as HTMLElement;
                if (firstRadio) {
                  errorElement = firstRadio;
                } else {
                  // If no radio found, scroll to the container itself
                  errorElement = radioGroupContainer as HTMLElement;
                }
              }
            }
          }
          
          // 6. Try finding by field name in a more flexible way
          if (!errorElement) {
            const fieldName = errorKey.replace(/_/g, '-');
            errorElement = document.querySelector(`input[id*="${fieldName}"], select[id*="${fieldName}"], input[name*="${fieldName}"]`) as HTMLElement;
          }
          
          // 7. For FloatingInput - generate ID from label (FloatingInput uses: floating-input-${label.toLowerCase().replace(/\s+/g, '-')})
          if (!errorElement && labelText) {
            // Generate the exact ID that FloatingInput would create
            // FloatingInput generates: floating-input-${label.toLowerCase().replace(/\s+/g, '-')}
            const normalizedLabel = labelText.toLowerCase().replace(/\s+/g, '-');
            const floatingInputId = `floating-input-${normalizedLabel}`;
            errorElement = document.getElementById(floatingInputId);
            
            // Also try variations (with/without period, etc.)
            if (!errorElement) {
              const labelVariations = [
                normalizedLabel,
                normalizedLabel.replace(/\./g, ''),
                normalizedLabel.replace(/\./g, '-'),
                normalizedLabel.replace(/[^a-z0-9-]/g, ''),
              ];
              
              for (const variation of labelVariations) {
                const variationId = `floating-input-${variation}`;
                errorElement = document.getElementById(variationId);
                if (errorElement) break;
              }
            }
          }
          
          // 8. Last resort: Try to find by searching all inputs with matching name or id containing the field key
          if (!errorElement) {
            const fieldNameVariations = [
              errorKey,
              errorKey.replace(/_/g, '-'),
              errorKey.replace(/_/g, ''),
            ];
            
            for (const variation of fieldNameVariations) {
              // Try name attribute
              errorElement = document.querySelector(`input[name="${variation}"], input[name*="${variation}"]`) as HTMLElement;
              if (errorElement) break;
              
              // Try id containing the variation
              errorElement = document.querySelector(`input[id*="${variation}"], input[id*="${variation.toLowerCase()}"]`) as HTMLElement;
              if (errorElement) break;
            }
          }
          
          // If element found, scroll and focus
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              errorElement?.focus();
            }, 100);
          } else if (attempt < 5) {
            // Retry if element not found yet (DOM might still be updating, especially after tab navigation)
            setTimeout(() => findField(attempt + 1), 300);
          } else {
            // Last resort: scroll to top and log warning
            console.warn(`Could not find field after ${attempt + 1} attempts: ${errorKey}. Label: ${labelText || 'N/A'}`);
            scrollToTop();
          }
        };
        
        if (needsNavigation) {
          // Wait longer for React to render the new tab
          setTimeout(() => findField(0), 800);
        } else {
          // Even if no navigation needed, give a small delay to ensure DOM is ready
          setTimeout(() => findField(0), 200);
        }
      } else {
        // Field not in mapping - try to find it directly
        errorElement = document.getElementById(errorKey) ||
                      document.querySelector(`[name="${errorKey}"]`) as HTMLElement;
        
        if (errorElement) {
          setTimeout(() => {
            errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorElement?.focus();
          }, 100);
        } else {
          console.warn(`Could not find field: ${errorKey}`);
          scrollToTop();
        }
      }
    }
  };

  // Helper function to format field names for display
  const formatFieldName = (fieldKey: string): string => {
    // Handle nested field errors
    if (fieldKey.includes('.')) {
      const parts = fieldKey.split('.');
      const section = parts[0];
      const index = parts[1];
      const field = parts[2] || 'date_range';
      
      const sectionNames: Record<string, string> = {
        'educational_background': 'Education',
        'work_experience': 'Work Experience',
        'learning_development': 'Learning & Development',
        'voluntary_work': 'Voluntary Work',
        'civil_service_eligibility': 'Civil Service Eligibility',
      };
      
      const fieldNames: Record<string, string> = {
        'period_from': 'Period From',
        'period_to': 'Period To',
        'date_from': 'Date From',
        'date_to': 'Date To',
        'date_range': 'Date Range',
        'exam_date': 'Exam Date',
      };
      
      const sectionName = sectionNames[section] || section;
      const fieldName = fieldNames[field] || field.replace(/_/g, ' ');
      
      return `${sectionName} ${parseInt(index) + 1} - ${fieldName}`;
    }
    
    // Format simple field names
    return fieldKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getError = (field: string) => {
    // Show both required and format errors in form fields
    return requiredErrors[field] || formatErrors[field] || errors[field];
  };

  // Helper function to get error for nested array fields (e.g., educational_background.0.school_name)
  const getNestedError = (section: string, index: number, field: string) => {
    const key = `${section}.${index}.${field}`;
    // Show both required and format errors
    return requiredErrors[key] || formatErrors[key] || errors[key];
  };

  // Input mask patterns
  const maskPatterns = {
    sss: '999-9999-9999',
    tin: '999-999-999-000',
    gsis: '999-9999-999',
    philhealth: '99-999999999-9',
    pagibig: '9999-9999-9999',
    mobile: '0999-999-9999',
    telephone: '999-9999',
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={isView ? "View Employee" : isEdit ? "Edit Employee" : "Create Employee"} />
      <div ref={formContainerRef} style={{ scrollMarginTop: '64px' }}>
      <form ref={formRef} onSubmit={handleSubmit} className="p-4 max-w-7xl mx-auto" method="POST">
        {/* CSRF Token */}
        <input type="hidden" name="_token" value={csrf} />

        {/* Upload section - show upload button when no pending import, show re-upload when pending exists */}
        {!isEdit && (
          <div className="mb-8 flex flex-col gap-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">
                {pendingImport ? 'CS Form 212 Imported' : 'Import CS Form 212 (Excel) → Auto-Fill'}
              </p>
              <p className="text-sm text-muted-foreground">
                {pendingImport 
                  ? 'Review the preview below, then apply the data to the form or re-upload a different file.'
                  : 'Use the official template to extract every field, including repeating sections.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportFileChange}
              />
              <Button
                type="button"
                variant={pendingImport ? "outline" : "secondary"}
                onClick={handleTriggerImport}
                disabled={isView || isImporting}
              >
                {isImporting ? 'Uploading...' : pendingImport ? 'Re-upload File' : 'Upload & Auto-Fill'}
                <UploadCloud className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {pendingImport && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="mb-4">
              <p className="font-semibold text-amber-900 mb-1">Preview Imported CS Form 212 Data</p>
              <p className="text-sm text-amber-800">Review the extracted values below, then click "Confirm and Apply Data" to apply them to the form, or "Cancel" to discard.</p>
            </div>
            {/* Preview table always shown when pendingImport exists */}
            <div className="mt-4">
              <CSForm212PreviewTable
                importedData={pendingImport}
                departments={departments}
                positions={positions}
                faculties={faculties}
                onConfirm={(editedData) => {
                  // Apply the edited imported data to the form
                  if (editedData) {
                    // First, clear all existing errors to start fresh
                    setRequiredErrors({});
                    setFormatErrors({});
                    
                    // Build the complete updated data object FIRST (before setting state)
                    const updatedData: any = { ...data };
                    Object.keys(editedData).forEach((key) => {
                      if (editedData[key] !== undefined && editedData[key] !== null) {
                        updatedData[key] = editedData[key];
                      }
                    });
                    
                    // Apply all data updates using the function form of setData to update all at once
                    // This ensures all updates happen in a single state update
                    setData((prev: any) => {
                      const next = { ...prev };
                      Object.keys(editedData).forEach((key) => {
                        if (editedData[key] !== undefined && editedData[key] !== null) {
                          next[key] = editedData[key];
                        }
                      });
                      return next;
                    });
                    
                    // Mark ALL tabs as interacted so ALL errors will show (not just current tab)
                    const allTabs = [
                      'step1-basic', 'step1-address', 'step1-government',
                      'step2-family', 'step2-education',
                      'step3-eligibility', 'step3-experience',
                      'step4-voluntary', 'step4-learning', 'step4-other',
                      'step5'
                    ];
                    setInteractedTabs(new Set(allTabs));
                    
                    // Enable validation after applying imported data
                    setHasAppliedImportedData(true);
                    setShouldShowValidation(true);
                    setHasUserInteracted(true);
                    
                    // Run validation immediately with the updatedData object (not the state)
                    // This ensures we validate against the actual imported data, not stale state
                    const validationResult = validateEmployeeData(updatedData, positions);
                    // Replace (not merge) errors to ensure we have the latest validation state
                    setRequiredErrors(validationResult.requiredErrors);
                    setFormatErrors(validationResult.formatErrors);
                    
                    const errorCount = Object.keys(validationResult.requiredErrors).length + Object.keys(validationResult.formatErrors).length;
                    if (errorCount > 0) {
                      toast.warning(`Imported data applied. Found ${errorCount} validation error(s). Please review and fix them.`);
                    } else {
                      toast.success('Imported data applied successfully. All fields are valid.');
                    }
                    
                    // Always close the preview after confirm
                    setPendingImport(null);
                  } else {
                    // Always close the preview after confirm, regardless of whether data was applied
                    setPendingImport(null);
                  }
                }}
                onCancel={() => {
                  setPendingImport(null);
                  toast.info('Import cancelled. No data was applied to the form.');
                }}
              />
            </div>
          </div>
        )}

        {/* Format Validation Errors - Clickable List - Only show if validation is enabled */}
        {shouldShowValidation && Object.keys(formatErrors).length > 0 && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 mb-2">
                  Format Validation Errors ({Object.keys(formatErrors).length})
                </h4>
                <p className="text-sm text-red-700 mb-3">
                  Click on any error below to navigate to the field:
                </p>
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                  {Object.entries(formatErrors).map(([field, message]) => (
                    <li key={field}>
                      <button
                        type="button"
                        onClick={() => scrollToErrorField(field)}
                        className="text-left text-sm text-red-700 hover:text-red-900 hover:underline cursor-pointer w-full text-start"
                      >
                        <span className="font-medium">{formatFieldName(field)}:</span> {message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Required Fields Errors - Only show if validation is enabled */}
        {shouldShowValidation && Object.keys(requiredErrors).length > 0 && (
          <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 mb-2">
                  Missing Required Fields ({Object.keys(requiredErrors).length})
                </h4>
                <p className="text-sm text-orange-700 mb-3">
                  The following required fields must be filled:
                </p>
                <ul className="space-y-1">
                  {Object.entries(requiredErrors).map(([field, message]) => (
                    <li key={field}>
                      <button
                        type="button"
                        onClick={() => scrollToErrorField(field)}
                        className="text-left text-sm text-orange-700 hover:text-orange-900 hover:underline cursor-pointer"
                      >
                        {formatFieldName(field)}: {message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <button
                    type="button"
                    onClick={() => !isView && goToStep(step.id)}
                    disabled={isView}
                    className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      currentStep === step.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : completedSteps.has(step.id)
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-background border-border text-muted-foreground'
                    } ${!isView ? 'cursor-pointer hover:border-primary' : 'cursor-default'}`}
                  >
                    {completedSteps.has(step.id) && currentStep !== step.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{step.id}</span>
                    )}
                  </button>
                  <div className="mt-2 text-center">
                    <p className={`text-xs font-medium ${currentStep === step.id ? 'text-primary' : 'text-muted-foreground'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${completedSteps.has(step.id) ? 'bg-green-500' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <Tabs value={step1Tab} onValueChange={(value) => { setStep1Tab(value); scrollToTop(); }} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="government">Government IDs</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="p-6">
                <div className="space-y-8">
                  <div className="space-y-8 py-4">
                        {/* Personal Information Section */}
                        <div className="space-y-6">
                          <div className="flex items-center gap-3 pb-2 border-b border-border">
                            <User className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FloatingInput
                              label="Employee ID"
                              value={data.id}
                              onChange={e => setData('id', e.target.value)}
                              error={getError('id')}
                              disabled={isEdit || isView}
                              required
                              helperText={isEdit ? "Cannot be changed" : undefined}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FloatingInput
                              label="Surname"
                              value={data.surname}
                              onChange={e => setData('surname', e.target.value)}
                              error={getError('surname')}
                              readOnly={isView}
                              required
                            />
                            <div className="md:col-span-2">
                              <FloatingInput
                                label="First Name"
                                value={data.first_name}
                                onChange={e => setData('first_name', e.target.value)}
                                error={getError('first_name')}
                                readOnly={isView}
                                required
                              />
                            </div>
                            <FloatingInput
                              label="Name Extension"
                              value={data.name_extension}
                              onChange={e => setData('name_extension', e.target.value)}
                              error={getError('name_extension')}
                              readOnly={isView}
                              helperText="e.g., Jr., Sr."
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                              <FloatingInput
                                label="Middle Name"
                                value={data.middle_name}
                                onChange={e => setData('middle_name', e.target.value)}
                                error={getError('middle_name')}
                                readOnly={isView}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FloatingInput
                              label="Date of Birth"
                              type="date"
                              value={data.birth_date || ''}
                              onChange={e => setData('birth_date', e.target.value)}
                              error={getError('birth_date')}
                              readOnly={isView}
                              required
                            />
                            <div className="md:col-span-3">
                              <FloatingInput
                                label="Place of Birth"
                                value={data.birth_place}
                                onChange={e => setData('birth_place', e.target.value)}
                                error={getError('birth_place')}
                                readOnly={isView}
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <RadioGroup
                              label="Sex"
                              value={data.sex || ''}
                              onChange={value => setData('sex', value)}
                              options={[
                                { value: 'Male', label: 'Male' },
                                { value: 'Female', label: 'Female' }
                              ]}
                              error={getError('sex')}
                              disabled={isView}
                              required
                            />
                            <RadioGroup
                              label="Civil Status"
                              value={data.civil_status || ''}
                              onChange={value => setData('civil_status', value)}
                              options={[
                                { value: 'Single', label: 'Single' },
                                { value: 'Married', label: 'Married' },
                                { value: 'Separated', label: 'Separated' },
                                { value: 'Widowed', label: 'Widowed' },
                                { value: 'Annulled', label: 'Annulled' }
                              ]}
                              error={getError('civil_status')}
                              disabled={isView}
                              orientation="vertical"
                              required
                            />
                            <FloatingInput
                              label="Height (m)"
                              type="number"
                              step="0.01"
                              value={data.height_m}
                              onChange={e => setData('height_m', e.target.value)}
                              error={getError('height_m')}
                              readOnly={isView}
                              helperText="e.g., 1.75"
                            />
                            <FloatingInput
                              label="Weight (kg)"
                              type="number"
                              step="0.1"
                              value={data.weight_kg}
                              onChange={e => setData('weight_kg', e.target.value)}
                              error={getError('weight_kg')}
                              readOnly={isView}
                              helperText="e.g., 70.5"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FloatingInput
                              label="Blood Type"
                              value={data.blood_type}
                              onChange={e => setData('blood_type', e.target.value)}
                              error={getError('blood_type')}
                              readOnly={isView}
                              helperText="e.g., O+, A-, B+"
                            />
                          </div>
                        </div>

                        {/* Employment Details Section */}
                        <div className="space-y-6 pt-6 border-t border-border">
                          <div className="flex items-center gap-3 pb-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold text-foreground">Employment Details</h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <div>
                              <Label htmlFor="organization_type" className="text-sm font-medium mb-2 block">
                                Organization Type <span className="text-destructive">*</span>
                              </Label>
                              <select
                                id="organization_type"
                                value={data.organization_type || 'academic'}
                                onChange={(e) => handleOrganizationTypeChange(e.target.value)}
                                className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isView}
                              >
                                <option value="academic">Academic</option>
                                <option value="administrative">Administrative</option>
                              </select>
                              {getError('organization_type') && (
                                <p className="mt-1.5 text-xs text-destructive px-1">{getError('organization_type')}</p>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="faculty_id" className="text-sm font-medium mb-2 block">
                                Faculty {isAcademic && <span className="text-destructive">*</span>}
                              </Label>
                              <select
                                id="faculty_id"
                                value={data.faculty_id || ''}
                                onChange={(e) => handleFacultyChange(e.target.value)}
                                className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isView || isAdministrative}
                              >
                                <option value="">Select Faculty</option>
                                {faculties.map((faculty) => (
                                  <option key={faculty.id} value={String(faculty.id)}>
                                    {faculty.name}
                                    {faculty.code ? ` (${faculty.code})` : ''}
                                  </option>
                                ))}
                              </select>
                              {getError('faculty_id') && (
                                <p className="mt-1.5 text-xs text-destructive px-1">{getError('faculty_id')}</p>
                              )}
                              {shouldShowSelectFacultyMessage && isAcademic && (
                                <p className="mt-1.5 text-xs text-muted-foreground px-1">
                                  Select a faculty to load its departments and positions.
                                </p>
                              )}
                              {isAdministrative && (
                                <p className="mt-1.5 text-xs text-muted-foreground px-1">
                                  Faculty selection is not required for administrative departments.
                                </p>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="department_id" className="text-sm font-medium mb-2 block">
                                {isAdministrative ? 'Office' : 'Department'} {isDepartmentRequired && <span className="text-destructive">*</span>}
                                {isFacultyLevelPosition && (
                                  <span className="text-xs text-muted-foreground ml-1">(Optional for faculty-level positions)</span>
                                )}
                              </Label>
                              <select
                                id="department_id"
                                value={data.department_id || ''}
                                onChange={(e) => handleDepartmentChange(e.target.value)}
                                className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isView || isFacultyLevelPosition || (isAcademic && !facultySelected)}
                              >
                                <option value="">{departmentPlaceholder}</option>
                                {availableDepartments.map(dept => (
                                  <option key={dept.id} value={String(dept.id)}>
                                    {dept.name || dept.faculty_name || (isAdministrative ? 'Unnamed Office' : 'Unnamed Department')}
                                  </option>
                                ))}
                              </select>
                              {getError('department_id') && (
                                <p className="mt-1.5 text-xs text-destructive px-1">{getError('department_id')}</p>
                              )}
                              {isAcademic && facultySelected && !hasDepartmentsForFaculty && !isView && (
                                <p className="mt-1.5 text-xs text-amber-600 px-1">
                                  No departments found under this faculty. Add one under Org Structure → Departments.
                                </p>
                              )}
                              {isAdministrative && !hasDepartmentsForFaculty && !isView && (
                                <p className="mt-1.5 text-xs text-amber-600 px-1">
                                  No offices available. Add one under Org Structure → Departments.
                                </p>
                              )}
                              {isAcademic && !facultySelected && !isView && (
                                <p className="mt-1.5 text-xs text-muted-foreground px-1">
                                  Select a faculty first to view available departments.
                                </p>
                              )}
                              {isAdministrative && !isView && (
                                <p className="mt-1.5 text-xs text-muted-foreground px-1">
                                  Select the office where this employee belongs.
                                </p>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="position_id" className="text-sm font-medium mb-2 block">
                                Position <span className="text-destructive">*</span>
                              </Label>
                              <select
                                id="position_id"
                                value={data.position_id || ''}
                                onChange={e => {
                                  const positionId = e.target.value;
                                  setData('position_id', positionId);
                                  // Clear department if faculty-level position is selected
                                  if (positionId) {
                                    const selectedPos = positions.find(pos => String(pos.id) === String(positionId));
                                    if (selectedPos && selectedPos.faculty_id && !selectedPos.department_id) {
                                      // Faculty-level position selected, clear department and department error
                                      setData('department_id', '');
                                      setRequiredErrors(prev => {
                                        const newErrors = { ...prev };
                                        delete newErrors['department_id'];
                                        return newErrors;
                                      });
                                    }
                                  }
                                }}
                                className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isView || (isAcademic && !facultySelected) || !hasPositionsAvailable}
                              >
                                <option value="">{positionPlaceholder}</option>
                                {filteredPositions.map(pos => (
                                  <option key={pos.id} value={String(pos.id)}>
                                    {pos.name || pos.pos_name || 'Unnamed Position'}
                                  </option>
                                ))}
                              </select>
                              {getError('position_id') && (
                                <p className="mt-1.5 text-xs text-destructive px-1">{getError('position_id')}</p>
                              )}
                              {!hasPositionsAvailable && facultySelected && !isView && (
                                <p className="mt-1.5 text-xs text-amber-600 px-1">
                                  {departmentSelected 
                                    ? 'No positions found for this department or faculty. Add new positions under Org Structure → Positions.'
                                    : 'No positions available for this faculty. Add positions under Org Structure → Positions.'}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            <RadioGroup
                              label="Employee State"
                              value={data.status || 'active'}
                              onChange={value => setData('status', value)}
                              options={[
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                                { value: 'on-leave', label: 'On Leave' }
                              ]}
                              error={getError('status')}
                              disabled={isView}
                              orientation="vertical"
                            />
                            <RadioGroup
                              label="Employment Status"
                              value={data.employment_status || 'Probationary'}
                              onChange={value => setData('employment_status', value)}
                              options={[
                                { value: 'Regular', label: 'Regular' },
                                { value: 'Probationary', label: 'Probationary' },
                                { value: 'Contractual', label: 'Contractual' },
                                { value: 'Job-Order', label: 'Job-Order' }
                              ]}
                              error={getError('employment_status')}
                              disabled={isView}
                              orientation="vertical"
                            />
                            <div>
                              <Label htmlFor="employee_type" className="text-sm font-medium mb-2 block">
                                Employee Type <span className="text-destructive">*</span>
                              </Label>
                              <select
                                id="employee_type"
                                value={data.employee_type}
                                onChange={e => setData('employee_type', e.target.value)}
                                className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isView}
                                required
                              >
                                <option value="">Select Type</option>
                                <option value="Teaching">Teaching</option>
                                <option value="Non-Teaching">Non-Teaching</option>
                              </select>
                              {getError('employee_type') && (
                                <p className="mt-1.5 text-xs text-destructive px-1">{getError('employee_type')}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FloatingInput
                              label="Date Hired"
                              type="date"
                              value={data.date_hired || ''}
                              onChange={e => setData('date_hired', e.target.value)}
                              error={getError('date_hired')}
                              readOnly={isView}
                              required
                            />
                            <FloatingInput
                              label="Date Regularized"
                              type="date"
                              value={data.date_regularized || ''}
                              onChange={e => setData('date_regularized', e.target.value)}
                              error={getError('date_regularized')}
                              readOnly={isView}
                              min={data.date_hired || undefined}
                              helperText="Must be on or after Date Hired"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                              <RadioGroup
                                label="Citizenship"
                                value={data.citizenship || 'Filipino'}
                                onChange={value => {
                                  setData('citizenship', value);
                                  setData('dual_citizenship', value === 'Dual');
                                }}
                                options={[
                                  { value: 'Filipino', label: 'Filipino' },
                                  { value: 'Dual', label: 'Dual Citizenship' },
                                  { value: 'Other', label: 'Other' }
                                ]}
                                error={getError('citizenship')}
                                disabled={isView}
                              />
                            </div>
                          </div>

                          {data.dual_citizenship && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                              <FloatingInput
                                label="Dual Citizenship Country"
                                value={data.dual_citizenship_country}
                                onChange={e => setData('dual_citizenship_country', e.target.value)}
                                error={getError('dual_citizenship_country')}
                                readOnly={isView}
                              />
                              <div>
                                <Label htmlFor="citizenship_type" className="text-sm font-medium mb-2 block">
                                  Citizenship Type
                                </Label>
                                <select
                                  id="citizenship_type"
                                  value={data.citizenship_type}
                                  onChange={e => setData('citizenship_type', e.target.value)}
                                  className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                                  disabled={isView}
                                >
                                  <option value="">Select type</option>
                                  <option value="By birth">By birth</option>
                                  <option value="By naturalization">By naturalization</option>
                                </select>
                                {getError('citizenship_type') && (
                                  <p className="mt-1.5 text-xs text-destructive px-1">{getError('citizenship_type')}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                </div>
              </TabsContent>
              
              <TabsContent value="address" className="p-6">
                <div className="space-y-8">
                  {/* Residential Address Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Residential Address</h3>
                      </div>
                      {!isView && (
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={data.same_as_residential || false}
                            onChange={handleSameAsResidential}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                          />
                          <span className="text-muted-foreground">Same as Permanent Address</span>
                        </label>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <FloatingInput
                        label="House/Block/Lot No."
                        value={data.res_house_no}
                        onChange={e => setData('res_house_no', e.target.value)}
                        error={getError('res_house_no')}
                        readOnly={isView}
                      />
                      <FloatingInput
                        label="Street"
                        value={data.res_street}
                        onChange={e => setData('res_street', e.target.value)}
                        error={getError('res_street')}
                        readOnly={isView}
                      />
                      <FloatingInput
                        label="Subdivision/Village"
                        value={data.res_subdivision}
                        onChange={e => setData('res_subdivision', e.target.value)}
                        error={getError('res_subdivision')}
                        readOnly={isView}
                      />
                      <FloatingInput
                        label="Barangay"
                        value={data.res_barangay}
                        onChange={e => setData('res_barangay', e.target.value)}
                        error={getError('res_barangay')}
                        readOnly={isView}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <FloatingInput
                        label="City/Municipality"
                        value={data.res_city}
                        onChange={e => setData('res_city', e.target.value)}
                        error={getError('res_city')}
                        readOnly={isView}
                        required
                      />
                      <FloatingInput
                        label="Province"
                        value={data.res_province}
                        onChange={e => setData('res_province', e.target.value)}
                        error={getError('res_province')}
                        readOnly={isView}
                        required
                      />
                      <MaskedInput
                        label="ZIP Code"
                        mask="0000"
                        value={data.res_zip_code || ''}
                        onChange={e => setData('res_zip_code', e.target.value)}
                        error={getError('res_zip_code')}
                        disabled={isView}
                        placeholder="1234"
                        helperText="e.g., 1234"
                      />
                    </div>
                  </div>

                  {/* Permanent Address Section */}
                  <div className="space-y-6 pt-6 border-t border-border">
                    <div className="flex items-center gap-3 pb-2 border-b border-border">
                      <MapPin className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Permanent Address</h3>
                    </div>
                    
                    {!data.same_as_residential && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <FloatingInput
                            label="House/Block/Lot No."
                            value={data.perm_house_no}
                            onChange={e => setData('perm_house_no', e.target.value)}
                            error={getError('perm_house_no')}
                            readOnly={isView}
                          />
                          <FloatingInput
                            label="Street"
                            value={data.perm_street}
                            onChange={e => setData('perm_street', e.target.value)}
                            error={getError('perm_street')}
                            readOnly={isView}
                          />
                          <FloatingInput
                            label="Subdivision/Village"
                            value={data.perm_subdivision}
                            onChange={e => setData('perm_subdivision', e.target.value)}
                            error={getError('perm_subdivision')}
                            readOnly={isView}
                          />
                          <FloatingInput
                            label="Barangay"
                            value={data.perm_barangay}
                            onChange={e => setData('perm_barangay', e.target.value)}
                            error={getError('perm_barangay')}
                            readOnly={isView}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <FloatingInput
                            label="City/Municipality"
                            value={data.perm_city}
                            onChange={e => setData('perm_city', e.target.value)}
                            error={getError('perm_city')}
                            readOnly={isView}
                            required
                          />
                          <FloatingInput
                            label="Province"
                            value={data.perm_province}
                            onChange={e => setData('perm_province', e.target.value)}
                            error={getError('perm_province')}
                            readOnly={isView}
                            required
                          />
                          <MaskedInput
                            label="ZIP Code"
                            mask="0000"
                            value={data.perm_zip_code || ''}
                            onChange={e => setData('perm_zip_code', e.target.value)}
                            error={getError('perm_zip_code')}
                            disabled={isView}
                            placeholder="1234"
                            helperText="e.g., 1234"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-6 pt-6 border-t border-border">
                    <div className="flex items-center gap-3 pb-2">
                      <User className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Contact Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <FloatingInput
                        label="Telephone No."
                        value={data.telephone_no || ''}
                        onChange={e => setData('telephone_no', e.target.value)}
                        error={getError('telephone_no')}
                        readOnly={isView}
                        placeholder="123-4567"
                        helperText="7-10 characters"
                        minLength={7}
                        maxLength={10}
                      />
                      <FloatingInput
                        label="Mobile No."
                        value={data.mobile_no || ''}
                        onChange={e => setData('mobile_no', e.target.value)}
                        error={getError('mobile_no')}
                        readOnly={isView}
                        placeholder="09123456789"
                        helperText="Exactly 11 digits starting with 09 (Philippines format)"
                        maxLength={11}
                        required
                      />
                      <FloatingInput
                        label="Email Address"
                        type="email"
                        value={data.email_address}
                        onChange={e => setData('email_address', e.target.value)}
                        error={getError('email_address')}
                        readOnly={isView}
                        helperText="e.g., name@example.com"
                        required
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="government" className="p-6">
                <div className="space-y-8">
                  {/* Government IDs Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b border-border">
                      <IdCard className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Government Identification Numbers</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <FloatingInput
                        label="SSS No."
                        value={data.sss_no || ''}
                        onChange={e => setData('sss_no', e.target.value)}
                        error={getError('sss_no')}
                        readOnly={isView}
                        placeholder="000-0000-0000"
                      />
                      <FloatingInput
                        label="TIN No."
                        value={data.tin_no || ''}
                        onChange={e => setData('tin_no', e.target.value)}
                        error={getError('tin_no')}
                        readOnly={isView}
                        placeholder="000-000-000-000"
                      />
                      <FloatingInput
                        label="GSIS ID No."
                        value={data.gsis_id_no || ''}
                        onChange={e => setData('gsis_id_no', e.target.value)}
                        error={getError('gsis_id_no')}
                        readOnly={isView}
                        placeholder="000-0000-000"
                      />
                      <FloatingInput
                        label="Pag-IBIG ID No."
                        value={data.pagibig_id_no || ''}
                        onChange={e => setData('pagibig_id_no', e.target.value)}
                        error={getError('pagibig_id_no')}
                        readOnly={isView}
                        placeholder="0000-0000-0000"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <FloatingInput
                        label="PhilHealth No."
                        value={data.philhealth_no || ''}
                        onChange={e => setData('philhealth_no', e.target.value)}
                        error={getError('philhealth_no')}
                        readOnly={isView}
                        placeholder="00-000000000-0"
                      />
                      <FloatingInput
                        label="Agency Employee No."
                        value={data.agency_employee_no}
                        onChange={e => setData('agency_employee_no', e.target.value)}
                        error={getError('agency_employee_no')}
                        readOnly={isView}
                      />
                    </div>
                  </div>

                  {/* Government Issued ID Section */}
                  <div className="space-y-6 pt-6 border-t border-border">
                    <div className="flex items-center gap-3 pb-2">
                      <IdCard className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Government Issued ID</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <FloatingInput
                        label="ID Type"
                        value={data.government_issued_id}
                        onChange={e => setData('government_issued_id', e.target.value)}
                        error={getError('government_issued_id')}
                        readOnly={isView}
                        helperText="e.g., Passport, Driver's License"
                      />
                      <FloatingInput
                        label="ID Number"
                        value={data.id_number}
                        onChange={e => setData('id_number', e.target.value)}
                        error={getError('id_number')}
                        readOnly={isView}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FloatingInput
                        label="Date of Issuance"
                        type="date"
                        value={data.id_date_issued || ''}
                        onChange={e => setData('id_date_issued', e.target.value)}
                        error={getError('id_date_issued')}
                        readOnly={isView}
                        helperText="mm/dd/yyyy"
                      />
                      <FloatingInput
                        label="Place of Issuance"
                        value={data.id_place_of_issue}
                        onChange={e => setData('id_place_of_issue', e.target.value)}
                        error={getError('id_place_of_issue')}
                        readOnly={isView}
                      />
                    </div>
                  </div>

                  {/* Additional IDs Section */}
                  <div className="space-y-6 pt-6 border-t border-border">
                    <div className="flex items-center gap-3 pb-2">
                      <IdCard className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Additional Identification</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <FloatingInput
                        label="Indigenous Group"
                        value={data.indigenous_group}
                        onChange={e => setData('indigenous_group', e.target.value)}
                        error={getError('indigenous_group')}
                        readOnly={isView}
                        helperText="If applicable"
                      />
                      <FloatingInput
                        label="PWD ID No."
                        value={data.pwd_id_no}
                        onChange={e => setData('pwd_id_no', e.target.value)}
                        error={getError('pwd_id_no')}
                        readOnly={isView}
                        helperText="If applicable"
                      />
                      <FloatingInput
                        label="Solo Parent ID No."
                        value={data.solo_parent_id_no}
                        onChange={e => setData('solo_parent_id_no', e.target.value)}
                        error={getError('solo_parent_id_no')}
                        readOnly={isView}
                        helperText="If applicable"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step 2: Family & Education */}
        {currentStep === 2 && (
          <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <Tabs value={step2Tab} onValueChange={(value) => { setStep2Tab(value); scrollToTop(); }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="family">Family Background</TabsTrigger>
                <TabsTrigger value="education">Educational Background</TabsTrigger>
              </TabsList>
              
              <TabsContent value="family" className="mt-6">
                <div className="space-y-8">
                  {/* Spouse Information - Only show if civil status is "Married" */}
                  {data.civil_status === 'Married' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2 border-b border-border">
                        <Users className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Spouse Information</h3>
                      </div>
                      {(() => {
                        const spouse = getFamilyMember('Spouse');
                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <FloatingInput
                                label="Surname"
                                value={spouse.surname}
                                onChange={e => updateFamilyBackground('Spouse', 'surname', e.target.value)}
                                readOnly={isView}
                              />
                              <div className="md:col-span-2">
                                <FloatingInput
                                  label="First Name"
                                  value={spouse.first_name}
                                  onChange={e => updateFamilyBackground('Spouse', 'first_name', e.target.value)}
                                  readOnly={isView}
                                />
                              </div>
                              <FloatingInput
                                label="Middle Name"
                                value={spouse.middle_name}
                                onChange={e => updateFamilyBackground('Spouse', 'middle_name', e.target.value)}
                                readOnly={isView}
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <FloatingInput
                                label="Name Extension"
                                value={spouse.name_extension}
                                onChange={e => updateFamilyBackground('Spouse', 'name_extension', e.target.value)}
                                readOnly={isView}
                                helperText="e.g., Jr., Sr."
                              />
                              <FloatingInput
                                label="Occupation"
                                value={spouse.occupation}
                                onChange={e => updateFamilyBackground('Spouse', 'occupation', e.target.value)}
                                readOnly={isView}
                              />
                              <FloatingInput
                                label="Employer/Business Name"
                                value={spouse.employer}
                                onChange={e => updateFamilyBackground('Spouse', 'employer', e.target.value)}
                                readOnly={isView}
                              />
                              <FloatingInput
                                label="Telephone No."
                                value={spouse.telephone_no}
                                onChange={e => updateFamilyBackground('Spouse', 'telephone_no', e.target.value)}
                                readOnly={isView}
                                placeholder="123-4567"
                                helperText="7-10 characters"
                                minLength={7}
                                maxLength={10}
                              />
                            </div>
                            <FloatingInput
                              label="Business Address"
                              value={spouse.business_address}
                              onChange={e => updateFamilyBackground('Spouse', 'business_address', e.target.value)}
                              readOnly={isView}
                            />
                          </>
                        );
                      })()}
                    </div>
                  )}
                  
                  {/* Children Information */}
                  <div className="space-y-6 pt-6 border-t border-border">
                    <div className="flex items-center gap-3 pb-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Children</h3>
                    </div>
                    
                    {data.children.length === 0 && !isView && (
                      <p className="text-sm text-muted-foreground">No children added yet.</p>
                    )}
                    
                    {data.children.map((child, idx) => (
                      <div key={idx} className="p-4 border border-border rounded-lg bg-muted/20 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">Child {idx + 1}</span>
                          {!isView && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRow('children', idx)}
                              className="text-destructive hover:text-destructive"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FloatingInput
                            label="Full Name"
                            value={child.full_name}
                            onChange={e => updateSection('children', idx, 'full_name', e.target.value)}
                            readOnly={isView}
                          />
                          <FloatingInput
                            label="Date of Birth"
                            type="date"
                            value={child.birth_date || ''}
                            onChange={e => updateSection('children', idx, 'birth_date', e.target.value)}
                            readOnly={isView}
                          />
                        </div>
                      </div>
                    ))}
                    
                    {!isView && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addRow('children', { full_name: '', birth_date: '' })}
                        className="w-full"
                      >
                        + Add Child
                      </Button>
                    )}
                  </div>
                  
                  {/* Father Information */}
                  <div className="space-y-6 pt-6 border-t border-border">
                    <div className="flex items-center gap-3 pb-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Father's Information</h3>
                    </div>
                    {(() => {
                      const father = getFamilyMember('Father');
                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FloatingInput
                              label="Surname"
                              value={father.surname}
                              onChange={e => updateFamilyBackground('Father', 'surname', e.target.value)}
                              readOnly={isView}
                            />
                            <div className="md:col-span-2">
                              <FloatingInput
                                label="First Name"
                                value={father.first_name}
                                onChange={e => updateFamilyBackground('Father', 'first_name', e.target.value)}
                                readOnly={isView}
                              />
                            </div>
                            <FloatingInput
                              label="Middle Name"
                              value={father.middle_name}
                              onChange={e => updateFamilyBackground('Father', 'middle_name', e.target.value)}
                              readOnly={isView}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FloatingInput
                              label="Name Extension"
                              value={father.name_extension}
                              onChange={e => updateFamilyBackground('Father', 'name_extension', e.target.value)}
                              readOnly={isView}
                              helperText="e.g., Jr., Sr."
                            />
                            <FloatingInput
                              label="Occupation"
                              value={father.occupation}
                              onChange={e => updateFamilyBackground('Father', 'occupation', e.target.value)}
                              readOnly={isView}
                            />
                            <FloatingInput
                              label="Employer/Business Name"
                              value={father.employer}
                              onChange={e => updateFamilyBackground('Father', 'employer', e.target.value)}
                              readOnly={isView}
                            />
                            <FloatingInput
                              label="Telephone No."
                              value={father.telephone_no}
                              onChange={e => updateFamilyBackground('Father', 'telephone_no', e.target.value)}
                              readOnly={isView}
                              placeholder="123-4567"
                              helperText="7-10 characters"
                              minLength={7}
                              maxLength={10}
                            />
                          </div>
                          <FloatingInput
                            label="Business Address"
                            value={father.business_address}
                            onChange={e => updateFamilyBackground('Father', 'business_address', e.target.value)}
                            readOnly={isView}
                          />
                        </>
                      );
                    })()}
                  </div>

                  {/* Mother Information */}
                  <div className="space-y-6 pt-6 border-t border-border">
                    <div className="flex items-center gap-3 pb-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Mother's Maiden Name</h3>
                    </div>
                    {(() => {
                      const mother = getFamilyMember('Mother');
                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FloatingInput
                              label="Surname"
                              value={mother.surname}
                              onChange={e => updateFamilyBackground('Mother', 'surname', e.target.value)}
                              readOnly={isView}
                            />
                            <div className="md:col-span-2">
                              <FloatingInput
                                label="First Name"
                                value={mother.first_name}
                                onChange={e => updateFamilyBackground('Mother', 'first_name', e.target.value)}
                                readOnly={isView}
                              />
                            </div>
                            <FloatingInput
                              label="Middle Name"
                              value={mother.middle_name}
                              onChange={e => updateFamilyBackground('Mother', 'middle_name', e.target.value)}
                              readOnly={isView}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FloatingInput
                              label="Occupation"
                              value={mother.occupation}
                              onChange={e => updateFamilyBackground('Mother', 'occupation', e.target.value)}
                              readOnly={isView}
                            />
                            <FloatingInput
                              label="Employer/Business Name"
                              value={mother.employer}
                              onChange={e => updateFamilyBackground('Mother', 'employer', e.target.value)}
                              readOnly={isView}
                            />
                            <FloatingInput
                              label="Business Address"
                              value={mother.business_address}
                              onChange={e => updateFamilyBackground('Mother', 'business_address', e.target.value)}
                              readOnly={isView}
                            />
                            <FloatingInput
                              label="Telephone No."
                              value={mother.telephone_no}
                              onChange={e => updateFamilyBackground('Mother', 'telephone_no', e.target.value)}
                              readOnly={isView}
                              placeholder="123-4567"
                              helperText="7-10 characters"
                              minLength={7}
                              maxLength={10}
                            />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="education" className="mt-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Educational Background</h3>
                  </div>
                  
                  {data.educational_background.length === 0 && !isView && (
                    <p className="text-sm text-muted-foreground">No educational records added yet.</p>
                  )}
                  
                  <div className="space-y-4">
                    {data.educational_background.map((edu, idx) => (
                      <div key={idx} className="p-6 border border-border rounded-lg bg-muted/20 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">Education Record {idx + 1}</span>
                          {!isView && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRow('educational_background', idx)}
                              className="text-destructive hover:text-destructive"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <Label htmlFor={`edu-level-${idx}`} className="text-sm font-medium mb-2 block">
                              Level <span className="text-destructive">*</span>
                            </Label>
                            <select
                              id={`edu-level-${idx}`}
                              value={edu.level || 'Elementary'}
                              onChange={e => updateSection('educational_background', idx, 'level', e.target.value)}
                              className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={isView}
                              required
                            >
                              <option value="Elementary">Elementary</option>
                              <option value="Secondary">Secondary</option>
                              <option value="Vocational">Vocational/Trade Course</option>
                              <option value="College">College</option>
                              <option value="Graduate Studies">Graduate Studies</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <FloatingInput
                              label="School Name"
                              value={edu.school_name}
                              onChange={e => updateSection('educational_background', idx, 'school_name', e.target.value)}
                              readOnly={isView}
                              required
                              error={getNestedError('educational_background', idx, 'school_name')}
                            />
                          </div>
                          <FloatingInput
                            label="Degree/Course"
                            value={edu.degree_course}
                            onChange={e => updateSection('educational_background', idx, 'degree_course', e.target.value)}
                            readOnly={isView}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <FloatingInput
                            label="Period From"
                            type="date"
                            value={edu.period_from || ''}
                            onChange={e => updateSection('educational_background', idx, 'period_from', e.target.value)}
                            readOnly={isView}
                            id={`edu-period-from-${idx}`}
                            error={getNestedError('educational_background', idx, 'period_from')}
                          />
                          <FloatingInput
                            label="Period To"
                            type="date"
                            value={edu.period_to || ''}
                            onChange={e => updateSection('educational_background', idx, 'period_to', e.target.value)}
                            readOnly={isView}
                            id={`edu-period-to-${idx}`}
                            error={getNestedError('educational_background', idx, 'period_to') || getNestedError('educational_background', idx, 'date_range')}
                          />
                          <FloatingInput
                            label="Highest Level/Units"
                            value={edu.highest_level_units}
                            onChange={e => updateSection('educational_background', idx, 'highest_level_units', e.target.value)}
                            readOnly={isView}
                            helperText="If not graduated"
                          />
                          <FloatingInput
                            label="Year Graduated"
                            value={edu.year_graduated}
                            onChange={e => updateSection('educational_background', idx, 'year_graduated', e.target.value)}
                            readOnly={isView}
                            helperText="e.g., 2020"
                          />
                        </div>
                        
                        <FloatingInput
                          label="Scholarship/Academic Honors"
                          value={edu.honors_received}
                          onChange={e => updateSection('educational_background', idx, 'honors_received', e.target.value)}
                          readOnly={isView}
                        />
                      </div>
                    ))}
                  </div>
                  
                  {!isView && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addRow('educational_background', {
                        level: 'Elementary', school_name: '', degree_course: '', period_from: '', period_to: '', 
                        highest_level_units: '', year_graduated: '', honors_received: ''
                      })}
                      className="w-full"
                    >
                      + Add Education Record
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step 3: Professional */}
        {currentStep === 3 && (
          <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <Tabs value={step3Tab} onValueChange={(value) => { setStep3Tab(value); scrollToTop(); }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="eligibility">Civil Service Eligibility</TabsTrigger>
                <TabsTrigger value="experience">Work Experience</TabsTrigger>
              </TabsList>
              
              <TabsContent value="eligibility" className="mt-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <Award className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Civil Service Eligibility</h3>
                  </div>
                  
                  {data.civil_service_eligibility.length === 0 && !isView && (
                    <p className="text-sm text-muted-foreground">No eligibility records added yet.</p>
                  )}
                  
                  <div className="space-y-4">
                    {data.civil_service_eligibility.map((elig, idx) => (
                      <div key={idx} className="p-6 border border-border rounded-lg bg-muted/20 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">Eligibility Record {idx + 1}</span>
                          {!isView && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRow('civil_service_eligibility', idx)}
                              className="text-destructive hover:text-destructive"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <FloatingInput
                            label="Career Service/RA 1080/CES/CSEE"
                            value={elig.eligibility}
                            onChange={e => updateSection('civil_service_eligibility', idx, 'eligibility', e.target.value)}
                            readOnly={isView}
                            required
                          />
                          <FloatingInput
                            label="Rating"
                            value={elig.rating}
                            onChange={e => updateSection('civil_service_eligibility', idx, 'rating', e.target.value)}
                            readOnly={isView}
                          />
                          <FloatingInput
                            label="Date of Examination"
                            type="date"
                            value={elig.exam_date || ''}
                            onChange={e => updateSection('civil_service_eligibility', idx, 'exam_date', e.target.value)}
                            readOnly={isView}
                            id={`elig-exam-date-${idx}`}
                            error={getNestedError('civil_service_eligibility', idx, 'exam_date')}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <FloatingInput
                            label="Place of Examination"
                            value={elig.exam_place}
                            onChange={e => updateSection('civil_service_eligibility', idx, 'exam_place', e.target.value)}
                            readOnly={isView}
                          />
                          <FloatingInput
                            label="License Number"
                            value={elig.license_no}
                            onChange={e => updateSection('civil_service_eligibility', idx, 'license_no', e.target.value)}
                            readOnly={isView}
                          />
                          <FloatingInput
                            label="Validity"
                            value={elig.license_validity}
                            onChange={e => updateSection('civil_service_eligibility', idx, 'license_validity', e.target.value)}
                            readOnly={isView}
                            helperText="e.g., Lifetime, Until 2025"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {!isView && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addRow('civil_service_eligibility', {
                        eligibility: '', rating: '', exam_date: '', exam_place: '', license_no: '', license_validity: ''
                      })}
                      className="w-full"
                    >
                      + Add Eligibility Record
                    </Button>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="experience" className="mt-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Work Experience</h3>
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    (Include private employment. Start from your recent work) Description of duties should be indicated in the attached Work Experience sheet.
                  </p>
                  
                  {data.work_experience.length === 0 && !isView && (
                    <p className="text-sm text-muted-foreground">No work experience records added yet.</p>
                  )}
                  
                  <div className="space-y-4">
                    {data.work_experience.map((work, idx) => (
                      <div key={idx} className="p-6 border border-border rounded-lg bg-muted/20 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">Work Experience {idx + 1}</span>
                          {!isView && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRow('work_experience', idx)}
                              className="text-destructive hover:text-destructive"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <FloatingInput
                            label="Position Title"
                            value={work.position_title}
                            onChange={e => updateSection('work_experience', idx, 'position_title', e.target.value)}
                            readOnly={isView}
                            required
                            error={getNestedError('work_experience', idx, 'position_title')}
                          />
                          <FloatingInput
                            label="Company/Agency"
                            value={work.company_name}
                            onChange={e => updateSection('work_experience', idx, 'company_name', e.target.value)}
                            readOnly={isView}
                            required
                            error={getNestedError('work_experience', idx, 'company_name')}
                          />
                          <FloatingInput
                            label="Date From"
                            type="date"
                            value={work.date_from || ''}
                            onChange={e => updateSection('work_experience', idx, 'date_from', e.target.value)}
                            readOnly={isView}
                            required
                            id={`work-date-from-${idx}`}
                            error={getNestedError('work_experience', idx, 'date_from')}
                          />
                          <FloatingInput
                            label="Date To"
                            type="date"
                            value={work.date_to || ''}
                            onChange={e => updateSection('work_experience', idx, 'date_to', e.target.value)}
                            readOnly={isView}
                            helperText="Leave empty if current"
                            id={`work-date-to-${idx}`}
                            error={getNestedError('work_experience', idx, 'date_to') || getNestedError('work_experience', idx, 'date_range')}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <FloatingInput
                            label="Company Address"
                            value={work.company_address}
                            onChange={e => updateSection('work_experience', idx, 'company_address', e.target.value)}
                            readOnly={isView}
                          />
                          <FloatingInput
                            label="Monthly Salary"
                            type="number"
                            step="0.01"
                            value={work.monthly_salary}
                            onChange={e => updateSection('work_experience', idx, 'monthly_salary', e.target.value)}
                            readOnly={isView}
                            helperText="e.g., 50000.00"
                          />
                          <FloatingInput
                            label="Salary Grade/Step"
                            value={work.salary_grade_step}
                            onChange={e => updateSection('work_experience', idx, 'salary_grade_step', e.target.value)}
                            readOnly={isView}
                            helperText="e.g., SG 15, Step 3"
                          />
                          <FloatingInput
                            label="Appointment Status"
                            value={work.status_of_appointment}
                            onChange={e => updateSection('work_experience', idx, 'status_of_appointment', e.target.value)}
                            readOnly={isView}
                            helperText="e.g., Permanent, Temporary"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Government Service</Label>
                            <select
                              value={work.is_gov_service ? 'Y' : 'N'}
                              onChange={e => updateSection('work_experience', idx, 'is_gov_service', e.target.value === 'Y')}
                              className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={isView}
                            >
                              <option value="N">No</option>
                              <option value="Y">Yes</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {!isView && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addRow('work_experience', {
                        position_title: '', company_name: '', company_address: '', date_from: '', date_to: '', 
                        monthly_salary: '', salary_grade_step: '', status_of_appointment: '', is_gov_service: false
                      })}
                      className="w-full"
                    >
                      + Add Work Experience
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step 4: Additional Info */}
        {currentStep === 4 && (
          <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <Tabs value={step4Tab} onValueChange={(value) => { setStep4Tab(value); scrollToTop(); }} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                <TabsTrigger value="voluntary">Voluntary Work</TabsTrigger>
                <TabsTrigger value="learning">Learning & Development</TabsTrigger>
                <TabsTrigger value="other">Other Information</TabsTrigger>
              </TabsList>
              
              <TabsContent value="voluntary" className="mt-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Voluntary Work</h3>
                  </div>
                  
                  {data.voluntary_work.length === 0 && !isView && (
                    <p className="text-sm text-muted-foreground">No voluntary work records added yet.</p>
                  )}
                  
                  <div className="space-y-4">
                    {data.voluntary_work.map((vw, idx) => (
                      <div key={idx} className="p-6 border border-border rounded-lg bg-muted/20 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">Voluntary Work {idx + 1}</span>
                          {!isView && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRow('voluntary_work', idx)}
                              className="text-destructive hover:text-destructive"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <FloatingInput
                            label="Organization Name"
                            value={vw.organization_name}
                            onChange={e => updateSection('voluntary_work', idx, 'organization_name', e.target.value)}
                            readOnly={isView}
                            required
                            error={getNestedError('voluntary_work', idx, 'organization_name')}
                          />
                          <FloatingInput
                            label="Organization Address"
                            value={vw.organization_address}
                            onChange={e => updateSection('voluntary_work', idx, 'organization_address', e.target.value)}
                            readOnly={isView}
                          />
                          <FloatingInput
                            label="Date From"
                            type="date"
                            value={vw.date_from || ''}
                            onChange={e => updateSection('voluntary_work', idx, 'date_from', e.target.value)}
                            readOnly={isView}
                            required
                            id={`vw-date-from-${idx}`}
                            error={getNestedError('voluntary_work', idx, 'date_from')}
                          />
                          <FloatingInput
                            label="Date To"
                            type="date"
                            value={vw.date_to || ''}
                            onChange={e => updateSection('voluntary_work', idx, 'date_to', e.target.value)}
                            readOnly={isView}
                            helperText="Leave empty if current"
                            id={`vw-date-to-${idx}`}
                            error={getNestedError('voluntary_work', idx, 'date_to') || getNestedError('voluntary_work', idx, 'date_range')}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FloatingInput
                            label="Hours Rendered"
                            type="number"
                            value={vw.hours_rendered}
                            onChange={e => updateSection('voluntary_work', idx, 'hours_rendered', e.target.value)}
                            readOnly={isView}
                            helperText="Total hours"
                          />
                          <FloatingInput
                            label="Position/Nature of Work"
                            value={vw.position_or_nature}
                            onChange={e => updateSection('voluntary_work', idx, 'position_or_nature', e.target.value)}
                            readOnly={isView}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {!isView && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addRow('voluntary_work', {
                        organization_name: '', organization_address: '', date_from: '', date_to: '', 
                        hours_rendered: '', position_or_nature: ''
                      })}
                      className="w-full"
                    >
                      + Add Voluntary Work
                    </Button>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="learning" className="mt-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Learning & Development</h3>
                  </div>
                  
                  {data.learning_development.length === 0 && !isView && (
                    <p className="text-sm text-muted-foreground">No training programs added yet.</p>
                  )}
                  
                  <div className="space-y-4">
                    {data.learning_development.map((ld, idx) => (
                      <div key={idx} className="p-6 border border-border rounded-lg bg-muted/20 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">Training Program {idx + 1}</span>
                          {!isView && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRow('learning_development', idx)}
                              className="text-destructive hover:text-destructive"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <FloatingInput
                            label="Title"
                            value={ld.title}
                            onChange={e => updateSection('learning_development', idx, 'title', e.target.value)}
                            readOnly={isView}
                            required
                            error={getNestedError('learning_development', idx, 'title')}
                          />
                          <FloatingInput
                            label="Date From"
                            type="date"
                            value={ld.date_from || ''}
                            onChange={e => updateSection('learning_development', idx, 'date_from', e.target.value)}
                            readOnly={isView}
                            required
                            error={getNestedError('learning_development', idx, 'date_from')}
                            id={`ld-date-from-${idx}`}
                          />
                          <FloatingInput
                            label="Date To"
                            type="date"
                            value={ld.date_to || ''}
                            onChange={e => updateSection('learning_development', idx, 'date_to', e.target.value)}
                            readOnly={isView}
                            helperText="Leave empty if ongoing"
                            error={getNestedError('learning_development', idx, 'date_to') || getNestedError('learning_development', idx, 'date_range')}
                            id={`ld-date-to-${idx}`}
                          />
                          <FloatingInput
                            label="Hours"
                            type="number"
                            value={ld.hours}
                            onChange={e => updateSection('learning_development', idx, 'hours', e.target.value)}
                            readOnly={isView}
                            helperText="Total hours"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Type of L&D</Label>
                            <select
                              value={ld.type_of_ld}
                              onChange={e => updateSection('learning_development', idx, 'type_of_ld', e.target.value)}
                              className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={isView}
                            >
                              <option value="Managerial">Managerial</option>
                              <option value="Supervisory">Supervisory</option>
                              <option value="Technical">Technical</option>
                              <option value="Foundation">Foundation</option>
                              <option value="Others">Others</option>
                            </select>
                          </div>
                          <FloatingInput
                            label="Conducted By"
                            value={ld.conducted_by}
                            onChange={e => updateSection('learning_development', idx, 'conducted_by', e.target.value)}
                            readOnly={isView}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {!isView && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addRow('learning_development', {
                        title: '', date_from: '', date_to: '', hours: '', type_of_ld: 'Technical', conducted_by: ''
                      })}
                      className="w-full"
                    >
                      + Add Training Program
                    </Button>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="other" className="mt-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Other Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Special Skills and Hobbies</Label>
                      <textarea 
                        value={data.other_information.skill_or_hobby} 
                        onChange={e => setData('other_information', { ...data.other_information, skill_or_hobby: e.target.value })} 
                        className="w-full min-h-[100px] rounded-lg border border-border bg-background px-4 py-3 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 resize-none" 
                        rows={4}
                        readOnly={isView}
                        placeholder="List your special skills and hobbies"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Non-Academic Distinctions</Label>
                      <textarea 
                        value={data.other_information.non_academic_distinctions} 
                        onChange={e => setData('other_information', { ...data.other_information, non_academic_distinctions: e.target.value })} 
                        className="w-full min-h-[100px] rounded-lg border border-border bg-background px-4 py-3 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 resize-none" 
                        rows={4}
                        readOnly={isView}
                        placeholder="List any non-academic distinctions or awards"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Memberships</Label>
                      <textarea 
                        value={data.other_information.memberships} 
                        onChange={e => setData('other_information', { ...data.other_information, memberships: e.target.value })} 
                        className="w-full min-h-[100px] rounded-lg border border-border bg-background px-4 py-3 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 resize-none" 
                        rows={4}
                        readOnly={isView}
                        placeholder="List professional or organizational memberships"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step 5: References & Declaration */}
        {currentStep === 5 && (
          <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-border">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Questionnaire</h2>
                </div>
                {data.questionnaire.map((q, idx) => {
                  const getQuestionText = () => {
                    switch (q.question_number) {
                      case 341: return '34. a. Are you related by consanguinity or affinity to the appointing or recommending authority, or to the chief of bureau or office or to the person who has immediate supervision over you in the Office, Bureau or Department where you will be appointed, within the third degree?';
                      case 342: return '34. b. Are you related by consanguinity or affinity to the appointing or recommending authority, or to the chief of bureau or office or to the person who has immediate supervision over you in the Office, Bureau or Department where you will be appointed, within the fourth degree (for Local Government Unit - Career Employees)?';
                      case 351: return '35. a. Have you ever been found guilty of any administrative offense?';
                      case 352: return '35. b. Have you been criminally charged before any court?';
                      case 36: return '36. Have you ever been convicted of any crime or violation of any law, decree, ordinance or regulation by any court or tribunal?';
                      case 37: return '37. Have you ever been separated from the service in any of the following modes: resignation, retirement, dropped from the rolls, dismissal, termination, end of term, finished contract or phased out (abolition) in the public or private sector?';
                      case 381: return '38. a. Have you ever been a candidate in a national or local election held within the last year (except Barangay election)?';
                      case 382: return '38. b. Have you resigned from the government service during the three (3)-month period before the last election to promote/actively campaign for a national or local candidate?';
                      case 39: return '39. Have you acquired the status of an immigrant or permanent resident of another country?';
                      case 401: return '40. a. Are you a member of any indigenous group?';
                      case 402: return '40. b. Are you a person with disability?';
                      case 403: return '40. c. Are you a solo parent?';
                      default: return `Question ${q.question_number}`;
                    }
                  };

                  return (
                  <div key={idx} className="p-4 border border-border rounded-lg bg-muted/20 space-y-4">
                    <Label className="text-sm font-medium text-foreground block mb-2">
                      {getQuestionText()}
                    </Label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`questionnaire-${idx}`}
                          checked={q.answer === true}
                          onChange={() => !isView && updateSection('questionnaire', idx, 'answer', true)}
                          disabled={isView}
                          className="h-4 w-4 text-primary border-border focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        />
                        <span className="text-sm text-foreground">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`questionnaire-${idx}`}
                          checked={q.answer === false}
                          onChange={() => !isView && updateSection('questionnaire', idx, 'answer', false)}
                          disabled={isView}
                          className="h-4 w-4 text-primary border-border focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        />
                        <span className="text-sm text-foreground">No</span>
                      </label>
                    </div>
                    {q.answer === true && (
                      <FloatingInput
                        label="If YES, give details"
                        value={q.details || ''}
                        onChange={e => updateSection('questionnaire', idx, 'details', e.target.value)}
                        readOnly={isView}
                      />
                    )}
                  </div>
                  );
                })}
              </div>
              
              <div className="space-y-6 pt-6 border-t border-border">
                <div className="flex items-center gap-3 pb-2 border-b border-border">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">References</h2>
                </div>
                <p className="text-sm text-muted-foreground">Person not related by consanguinity or affinity to applicant/appointee</p>
                
                {data.references.length === 0 && !isView && (
                  <p className="text-sm text-muted-foreground">No references added yet.</p>
                )}
                
                <div className="space-y-4">
                  {data.references.map((ref, idx) => (
                    <div key={idx} className="p-6 border border-border rounded-lg bg-muted/20 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Reference {idx + 1}</span>
                        {!isView && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRow('references', idx)}
                            className="text-destructive hover:text-destructive"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FloatingInput
                          label="Full Name"
                          value={ref.fullname}
                          onChange={e => updateSection('references', idx, 'fullname', e.target.value)}
                          readOnly={isView}
                          required
                          error={getNestedError('references', idx, 'fullname')}
                        />
                        <FloatingInput
                          label="Address"
                          value={ref.address}
                          onChange={e => updateSection('references', idx, 'address', e.target.value)}
                          readOnly={isView}
                        />
                        <FloatingInput
                          label="Telephone Number"
                          value={ref.telephone_no}
                          onChange={e => updateSection('references', idx, 'telephone_no', e.target.value)}
                          readOnly={isView}
                          helperText="e.g., +63 912 345 6789"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {!isView && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addRow('references', {
                      fullname: '', address: '', telephone_no: ''
                    })}
                    className="w-full"
                  >
                    + Add Reference
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || isView}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={isView}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              !isView && (
                <Button type="submit" disabled={processing} className="flex items-center gap-2">
                  {isEdit ? 'Update Employee' : 'Save Employee'}
                </Button>
              )
            )}
          </div>
        </div>
      </form>
      </div>
    </AppLayout>
  );
}