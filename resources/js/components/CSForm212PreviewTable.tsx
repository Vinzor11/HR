import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface CSForm212PreviewTableProps {
  importedData: Record<string, unknown>;
  onConfirm: (editedData: Record<string, unknown>) => void;
  onCancel: () => void;
  departments?: Array<{ id: number | string; name?: string; faculty_name?: string; faculty_id?: number | string | null; type?: string }>;
  positions?: Array<{ id: number | string; name?: string; pos_name?: string; department_id?: number | string | null; faculty_id?: number | string | null }>;
  faculties?: Array<{ id: number | string; name: string; code?: string | null }>;
}

type FieldStatus = 'complete' | 'missing' | 'optional';

interface PreviewField {
  label: string;
  key: string | string[];
  format?: (value: any) => string;
  required?: boolean;
  group: 'identity' | 'contact' | 'government' | 'employment' | 'optional';
  type?: 'text' | 'date' | 'select' | 'composite';
  options?: Array<{ value: string; label: string }>;
}

const formatDate = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') {
    try {
      const date = new Date(value);
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format for input
    } catch {
      return value;
    }
  }
  return String(value);
};

const formatFullName = (data: Record<string, unknown>): string => {
  const surname = data.surname || '';
  const firstName = data.first_name || '';
  const middleName = data.middle_name || '';
  const nameExtension = data.name_extension || '';
  
  const parts = [surname, firstName, middleName].filter(Boolean);
  const fullName = parts.join(', ');
  return nameExtension ? `${fullName} ${nameExtension}` : fullName;
};

const formatAddress = (data: Record<string, unknown>, type: 'residential' | 'permanent'): string => {
  const prefix = type === 'residential' ? 'res' : 'perm';
  const parts = [
    data[`${prefix}_house_no`],
    data[`${prefix}_street`],
    data[`${prefix}_subdivision`],
    data[`${prefix}_barangay`],
    data[`${prefix}_city`],
    data[`${prefix}_province`],
    data[`${prefix}_zip_code`],
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : '';
};

const previewFields: PreviewField[] = [
  // Identity & Basic Information
  { label: 'Employee Number', key: 'id', group: 'identity', required: true, type: 'text' },
  { 
    label: 'Surname', 
    key: 'surname',
    group: 'identity',
    required: true,
    type: 'text'
  },
  { 
    label: 'First Name', 
    key: 'first_name',
    group: 'identity',
    required: true,
    type: 'text'
  },
  { 
    label: 'Middle Name', 
    key: 'middle_name',
    group: 'identity',
    required: false,
    type: 'text'
  },
  { 
    label: 'Name Extension', 
    key: 'name_extension',
    group: 'identity',
    required: false,
    type: 'text'
  },
  { label: 'Date of Birth', key: 'birth_date', format: formatDate, group: 'identity', required: true, type: 'date' },
  { 
    label: 'Sex', 
    key: 'sex', 
    group: 'identity', 
    required: true, 
    type: 'select',
    options: [
      { value: 'Male', label: 'Male' },
      { value: 'Female', label: 'Female' }
    ]
  },
  { 
    label: 'Civil Status', 
    key: 'civil_status', 
    group: 'identity', 
    required: true, 
    type: 'select',
    options: [
      { value: 'Single', label: 'Single' },
      { value: 'Married', label: 'Married' },
      { value: 'Widowed', label: 'Widowed' },
      { value: 'Separated', label: 'Separated' },
      { value: 'Divorced', label: 'Divorced' },
      { value: 'Annulled', label: 'Annulled' }
    ]
  },
  
  // Contact Information
  { label: 'Email Address', key: 'email_address', group: 'contact', required: true, type: 'text' },
  { label: 'Mobile Number', key: 'mobile_no', group: 'contact', required: false, type: 'text' },
  { label: 'Telephone Number', key: 'telephone_no', group: 'contact', required: false, type: 'text' },
  
  // Government Numbers
  { label: 'GSIS No', key: 'gsis_id_no', group: 'government', required: false, type: 'text' },
  { label: 'PAG-IBIG No', key: 'pagibig_id_no', group: 'government', required: false, type: 'text' },
  { label: 'PhilHealth No', key: 'philhealth_no', group: 'government', required: false, type: 'text' },
  { label: 'SSS No', key: 'sss_no', group: 'government', required: false, type: 'text' },
  { label: 'TIN No', key: 'tin_no', group: 'government', required: false, type: 'text' },
  
  // Employment Information
  { label: 'Organization Type', key: 'organization_type', group: 'employment', required: true, type: 'select', options: [
    { value: 'academic', label: 'Academic' },
    { value: 'administrative', label: 'Administrative' }
  ]},
  { label: 'Faculty', key: 'faculty_id', group: 'employment', required: true, type: 'select' },
  { label: 'Department/Office', key: 'department_id', group: 'employment', required: true, type: 'select' },
  { label: 'Position', key: 'position_id', group: 'employment', required: true, type: 'select' },
  { 
    label: 'Employee Type', 
    key: 'employee_type', 
    group: 'employment', 
    required: true, 
    type: 'select',
    options: [
      { value: 'Teaching', label: 'Teaching' },
      { value: 'Non-Teaching', label: 'Non-Teaching' }
    ]
  },
  { 
    label: 'Status', 
    key: 'status', 
    group: 'employment', 
    required: true, 
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'on-leave', label: 'On Leave' }
    ]
  },
  { 
    label: 'Employment Status', 
    key: 'employment_status', 
    group: 'employment', 
    required: true, 
    type: 'select',
    options: [
      { value: 'Regular', label: 'Regular' },
      { value: 'Probationary', label: 'Probationary' },
      { value: 'Contractual', label: 'Contractual' },
      { value: 'Job-Order', label: 'Job-Order' }
    ]
  },
  { label: 'Date Hired', key: 'date_hired', group: 'employment', required: true, type: 'date', format: formatDate },
  { label: 'Date Regularized', key: 'date_regularized', group: 'employment', required: false, type: 'date', format: formatDate },
  
  // Optional Additional Fields
  { label: 'Agency Employee No', key: 'agency_employee_no', group: 'optional', required: false, type: 'text' },
];

const getFieldValue = (data: Record<string, unknown>, field: PreviewField): string => {
  if (Array.isArray(field.key)) {
    return '';
  }
  
  const value = data[field.key as string];
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  if (field.type === 'date' && field.format) {
    return field.format(value);
  }
  
  return String(value);
};

const hasValue = (data: Record<string, unknown>, field: PreviewField): boolean => {
  if (Array.isArray(field.key)) {
    return field.key.some(key => {
      const value = data[key];
      return value !== null && value !== undefined && value !== '';
    });
  }
  
  const value = data[field.key as string];
  return value !== null && value !== undefined && value !== '';
};

const getFieldStatus = (data: Record<string, unknown>, field: PreviewField, positions?: Array<{ id: number | string; faculty_id?: number | string | null; department_id?: number | string | null }>): FieldStatus => {
  const organizationType = data.organization_type || 'academic';
  const isAdministrative = organizationType === 'administrative';
  
  // Faculty is not required for administrative departments
  if (field.key === 'faculty_id' && isAdministrative) {
    return hasValue(data, field) ? 'complete' : 'optional';
  }
  
  // Check if department field should be optional due to faculty-level position
  if (field.key === 'department_id' && positions && data.position_id) {
    const selectedPosition = positions.find(pos => String(pos.id) === String(data.position_id));
    if (selectedPosition && selectedPosition.faculty_id && !selectedPosition.department_id) {
      // Position is faculty-level, so department is optional
      return hasValue(data, field) ? 'complete' : 'optional';
    }
  }
  
  if (!field.required) {
    return hasValue(data, field) ? 'complete' : 'optional';
  }
  
  return hasValue(data, field) ? 'complete' : 'missing';
};

export const CSForm212PreviewTable: React.FC<CSForm212PreviewTableProps> = ({
  importedData,
  onConfirm,
  onCancel,
  departments = [],
  positions = [],
  faculties = [],
}) => {
  // Helper function to get field status with positions context
  const getFieldStatusWithContext = (data: Record<string, unknown>, field: PreviewField): FieldStatus => {
    return getFieldStatus(data, field, positions);
  };
  // Infer organization_type from department if not present
  const inferOrganizationType = useMemo(() => {
    return (data: Record<string, unknown>): string => {
      if (data.organization_type) {
        return String(data.organization_type);
      }
      // If department_id exists, check the department type
      if (data.department_id) {
        const dept = departments.find(d => String(d.id) === String(data.department_id));
        if (dept) {
          return dept.type || (dept.faculty_id ? 'academic' : 'administrative');
        }
      }
      return 'academic'; // Default to academic
    };
  }, [departments]);

  const initialData = useMemo(() => ({
    ...importedData,
    organization_type: inferOrganizationType(importedData),
  }), [importedData, inferOrganizationType]);

  const [editedData, setEditedData] = useState<Record<string, unknown>>(initialData);

  // Update editedData when importedData changes
  useEffect(() => {
    const updatedData = {
      ...importedData,
      organization_type: inferOrganizationType(importedData),
    };
    setEditedData(updatedData);
  }, [importedData, inferOrganizationType]);

  const departmentLookup = useMemo(() => {
    const lookup = new Map<string, (typeof departments)[number]>();
    departments.forEach((dept) => {
      lookup.set(String(dept.id), dept);
    });
    return lookup;
  }, [departments]);

  const selectedOrganizationType = editedData?.organization_type || 'academic';
  const isAcademic = selectedOrganizationType === 'academic';
  const isAdministrative = selectedOrganizationType === 'administrative';
  const selectedFacultyId = editedData?.faculty_id ? String(editedData.faculty_id) : '';
  const selectedDepartmentId = editedData?.department_id ? String(editedData.department_id) : '';
  const selectedPositionId = editedData?.position_id ? String(editedData.position_id) : '';
  
  // Check if selected position is faculty-level
  const selectedPosition = selectedPositionId 
    ? positions.find(pos => String(pos.id) === selectedPositionId)
    : null;
  const isFacultyLevelPosition = selectedPosition 
    ? (selectedPosition.faculty_id && !selectedPosition.department_id)
    : false;

  const availableDepartments = useMemo(() => {
    const allDepartments = departments || [];
    
    // For academic: require faculty selection first
    if (isAcademic) {
      if (!selectedFacultyId) {
        return []; // No departments available until faculty is selected
      }
      // Filter by organization type and selected faculties
      const selectedFacultyIdNum = Number(selectedFacultyId);
      return allDepartments.filter((dept: any) => {
        const deptType = dept.type || 'academic';
        return deptType === 'academic' && 
               dept.faculty_id && 
               Number(dept.faculty_id) === selectedFacultyIdNum;
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
  }, [departments, selectedFacultyId, isAcademic, isAdministrative]);

  const positionsFilteredByFaculty = useMemo(() => {
    if (isAdministrative) {
      // For administrative: show positions that belong to administrative departments
      if (selectedDepartmentId) {
        const departmentId = String(selectedDepartmentId);
        return positions.filter((pos) => {
          const posDeptId = pos.department_id ? String(pos.department_id) : null;
          if (posDeptId && posDeptId === departmentId) {
            // Verify the department is administrative
            const dept = departmentLookup.get(departmentId);
            return dept && dept.type === 'administrative';
          }
          return false;
        });
      }
      // If no department selected, show all positions that belong to administrative departments
      return positions.filter((pos) => {
        if (pos.department_id) {
          const dept = departmentLookup.get(String(pos.department_id));
          return dept && dept.type === 'administrative';
        }
        return false;
      });
    }
    
    // For academic: require faculty_id
    if (!selectedFacultyId) {
      return faculties.length > 0 ? [] : positions;
    }
    return positions.filter((pos) => {
      if (String(pos.faculty_id ?? '') === selectedFacultyId) {
        return true;
      }
      if (pos.department_id) {
        const relatedDept = departmentLookup.get(String(pos.department_id));
        if (relatedDept && String(relatedDept.faculty_id ?? '') === selectedFacultyId) {
          return true;
        }
      }
      return false;
    });
  }, [positions, selectedFacultyId, selectedDepartmentId, isAdministrative, faculties.length, departmentLookup]);

  const filteredPositions = useMemo(() => {
    if (isAdministrative) {
      // For administrative: just return positions filtered by department
      return positionsFilteredByFaculty;
    }
    
    // For academic: require faculty_id
    if (!selectedFacultyId) {
      return [];
    }
    
    // Get all positions for the selected faculty
    const facultyPositions = positionsFilteredByFaculty;
    
    if (selectedDepartmentId) {
      // When department is selected, show:
      // 1. Department-specific positions (where department_id matches)
      // 2. Faculty-level positions (where faculty_id matches but department_id is null)
      const departmentPositions = facultyPositions.filter(
        (pos) => String(pos.department_id ?? '') === selectedDepartmentId
      );
      
      const facultyLevelPositions = facultyPositions.filter(
        (pos) => pos.department_id === null && String(pos.faculty_id ?? '') === selectedFacultyId
      );
      
      // Combine both, avoiding duplicates
      const allPositions = [...departmentPositions, ...facultyLevelPositions];
      const uniquePositions = allPositions.filter((pos, index, self) =>
        index === self.findIndex((p) => String(p.id) === String(pos.id))
      );
      
      return uniquePositions;
    }
    
    // When no department is selected, show only faculty-level positions
    return facultyPositions.filter(
      (pos) => pos.department_id === null && String(pos.faculty_id ?? '') === selectedFacultyId
    );
  }, [positionsFilteredByFaculty, selectedDepartmentId, selectedFacultyId, isAdministrative]);

  const requiresFacultySelection = isAcademic && faculties.length > 0;
  const hasFacultySelected = isAdministrative ? true : (requiresFacultySelection ? Boolean(selectedFacultyId) : true);
  const hasDepartmentSelected = Boolean(selectedDepartmentId);
  const hasDepartmentsForFaculty = availableDepartments.length > 0;
  const hasPositionsForFaculty = positionsFilteredByFaculty.length > 0;
  const hasPositionsAvailable = filteredPositions.length > 0;

  const departmentPlaceholder = isAcademic
    ? (!hasFacultySelected
        ? 'Select a faculty first'
        : hasDepartmentsForFaculty
          ? 'Select Department'
          : 'No departments available for this faculty')
    : (hasDepartmentsForFaculty
        ? 'Select Office'
        : 'No offices available');

  const positionPlaceholder = isAdministrative
    ? (hasPositionsAvailable
        ? 'Select Position'
        : 'No positions available for this department')
    : (requiresFacultySelection && !hasFacultySelected
        ? 'Select a faculty first'
        : hasPositionsAvailable
          ? 'Select Position'
          : hasDepartmentSelected
            ? 'No positions available for this department or faculty'
            : 'No positions available for this faculty');

  const updateField = (key: string, value: string) => {
    setEditedData(prev => {
      if (key === 'organization_type') {
        return {
          ...prev,
          organization_type: value || 'academic',
          faculty_id: null,
          department_id: null,
          position_id: null,
        };
      }
      if (key === 'faculty_id') {
        return {
          ...prev,
          faculty_id: value || null,
          department_id: null,
          position_id: null,
        };
      }
      if (key === 'department_id') {
        return {
          ...prev,
          department_id: value || null,
          position_id: null,
        };
      }
      if (key === 'position_id') {
        // Check if the selected position is faculty-level
        const selectedPos = positions.find(pos => String(pos.id) === value);
        const isFacultyLevel = selectedPos 
          ? (selectedPos.faculty_id && !selectedPos.department_id)
          : false;
        
        // If faculty-level position selected, clear department before setting position
        if (isFacultyLevel) {
          return {
            ...prev,
            department_id: null, // Clear department first
            position_id: value || null,
          };
        }
      }
      return {
        ...prev,
        [key]: value || null,
      };
    });
  };

  useEffect(() => {
    if (!editedData.department_id) return;
    const dept = departmentLookup.get(String(editedData.department_id));
    if (!dept?.faculty_id) return;
    const facultyId = String(dept.faculty_id);
    if (facultyId && facultyId !== selectedFacultyId) {
      setEditedData(prev => ({
        ...prev,
        faculty_id: facultyId,
      }));
    }
  }, [editedData.department_id, departmentLookup, selectedFacultyId]);

  const groupedFields = {
    identity: previewFields.filter(f => f.group === 'identity'),
    contact: previewFields.filter(f => f.group === 'contact'),
    government: previewFields.filter(f => f.group === 'government'),
    employment: previewFields.filter(f => f.group === 'employment'),
    optional: previewFields.filter(f => f.group === 'optional'),
  };

  const getStatusIcon = (status: 'complete' | 'missing' | 'optional') => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'missing':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'optional':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  // Only check required fields in preview - no format validation
  // Use getFieldStatusWithContext to properly handle faculty-level positions
  const requiredFieldsComplete = previewFields
    .filter(f => {
      const status = getFieldStatusWithContext(editedData, f);
      return status === 'missing' || status === 'complete';
    })
    .every(f => {
      const status = getFieldStatusWithContext(editedData, f);
      return status === 'complete';
    });

  const missingRequiredFields = previewFields
    .filter(f => {
      const status = getFieldStatusWithContext(editedData, f);
      return status === 'missing';
    })
    .map(f => f.label);

  const fieldInputHelpers = {
    updateField,
    editedData,
    availableDepartments,
    filteredPositions,
    faculties,
    hasFacultySelected,
    hasDepartmentSelected,
    departmentPlaceholder,
    positionPlaceholder,
    positionsForFaculty: positionsFilteredByFaculty,
    requiresFacultySelection,
  };

const renderFieldInput = (
  field: PreviewField,
  status: FieldStatus,
  helpers: typeof fieldInputHelpers
) => {
  const {
    updateField,
    editedData,
    availableDepartments,
    filteredPositions,
    faculties,
    hasFacultySelected,
    hasDepartmentSelected,
    departmentPlaceholder,
    positionPlaceholder,
    positionsForFaculty,
    requiresFacultySelection,
  } = helpers;
  const fieldKey = Array.isArray(field.key) ? field.key[0] : field.key;
  const value = getFieldValue(editedData, field);
  const isInvalid = status === 'missing';
  const selectTriggerClasses = (extra?: string) =>
    cn(
      "h-10 bg-white",
      isInvalid && 'border-red-500 focus-visible:ring-red-500 focus-visible:ring-2',
      extra
    );
  const inputClasses = cn(
    "h-10 bg-white",
    isInvalid && 'border-red-500 focus-visible:ring-red-500 focus-visible:ring-2'
  );

  if (field.type === 'select') {
    if (field.key === 'faculty_id') {
      if (!faculties.length) {
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => updateField('faculty_id', e.target.value)}
            placeholder="Enter Faculty"
            className={inputClasses}
            aria-invalid={isInvalid ? true : undefined}
            disabled={isAdministrative}
          />
        );
      }
      return (
        <Select
          value={String(editedData.faculty_id || '')}
          onValueChange={(val) => updateField('faculty_id', val)}
          disabled={isAdministrative}
        >
          <SelectTrigger className={selectTriggerClasses()} aria-invalid={isInvalid ? true : undefined}>
            <SelectValue placeholder={isAdministrative ? "Not required for administrative" : "Select Faculty"} />
          </SelectTrigger>
          <SelectContent>
            {faculties.map((faculty) => (
              <SelectItem key={faculty.id} value={String(faculty.id)}>
                {faculty.name}
                {faculty.code ? ` (${faculty.code})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.key === 'department_id') {
      // Check if department should be disabled (faculty-level position selected or other conditions)
      const shouldDisableDepartment = isFacultyLevelPosition || 
        (isAcademic && requiresFacultySelection && (!hasFacultySelected || availableDepartments.length === 0)) ||
        (isAdministrative && availableDepartments.length === 0);
      
      return (
        <Select
          value={String(editedData.department_id || '')}
          onValueChange={(val) => updateField('department_id', val)}
          disabled={shouldDisableDepartment}
        >
          <SelectTrigger className={selectTriggerClasses()} aria-invalid={isInvalid ? true : undefined}>
            <SelectValue placeholder={departmentPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {availableDepartments.map((dept) => (
              <SelectItem key={dept.id} value={String(dept.id)}>
                {dept.name || dept.faculty_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.key === 'position_id') {
      return (
        <Select
          value={String(editedData.position_id || '')}
          onValueChange={(val) => updateField('position_id', val)}
          disabled={
            (isAcademic && requiresFacultySelection && !hasFacultySelected) ||
            filteredPositions.length === 0
          }
        >
          <SelectTrigger className={selectTriggerClasses()} aria-invalid={isInvalid ? true : undefined}>
            <SelectValue placeholder={positionPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {filteredPositions.map((pos) => (
              <SelectItem key={pos.id} value={String(pos.id)}>
                {pos.name || pos.pos_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.options) {
      return (
        <Select
          value={String(editedData[fieldKey] || '')}
          onValueChange={(val) => updateField(fieldKey, val)}
        >
          <SelectTrigger className={selectTriggerClasses()} aria-invalid={isInvalid ? true : undefined}>
            <SelectValue placeholder={`Select ${field.label}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
  }

  if (field.type === 'date') {
    return (
      <Input
        type="date"
        value={value}
        onChange={(e) => updateField(fieldKey, e.target.value)}
        className={inputClasses}
        aria-invalid={isInvalid ? true : undefined}
      />
    );
  }

  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => updateField(fieldKey, e.target.value)}
      placeholder={`Enter ${field.label.toLowerCase()}`}
      className={inputClasses}
      aria-invalid={isInvalid ? true : undefined}
    />
  );
};

  return (
    <Card className="w-full max-w-6xl mx-auto shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">CS Form 212 Import Preview</CardTitle>
            <CardDescription className="mt-2 text-sm text-gray-600">
              Review and edit the imported data before saving to the system. All fields are editable.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {requiredFieldsComplete ? (
              <Badge className="bg-green-600 text-white">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ready to Import
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Missing Required Fields
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Summary Alert - Only show required fields, not format validation */}
        {!requiredFieldsComplete && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 mb-1">Missing Required Fields</h4>
                <p className="text-sm text-red-700 mb-2">
                  The following required fields must be completed before importing:
                </p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {missingRequiredFields.map((field, idx) => (
                    <li key={idx}>{field}</li>
                  ))}
                </ul>
                <p className="text-xs text-red-600 mt-3 italic">
                  Note: Format validation will be checked after applying the data to the form.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Identity & Basic Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            1. Identity & Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedFields.identity.map((field) => {
              const status = getFieldStatusWithContext(editedData, field);
              const fieldKey = Array.isArray(field.key) ? field.key[0] : field.key;
              return (
                <div key={fieldKey} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className={cn("text-sm font-medium text-gray-700 flex items-center gap-2", status === 'missing' && 'text-red-700')}>
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {getStatusIcon(status)}
                  </div>
                  {renderFieldInput(field, status, fieldInputHelpers)}
                  {status === 'missing' && (
                    <p className="text-xs text-red-600">This field is required.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            2. Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {groupedFields.contact.map((field) => {
              const status = getFieldStatusWithContext(editedData, field);
              const fieldKey = Array.isArray(field.key) ? field.key[0] : field.key;
              return (
                <div key={fieldKey} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className={cn("text-sm font-medium text-gray-700 flex items-center gap-2", status === 'missing' && 'text-red-700')}>
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {getStatusIcon(status)}
                  </div>
                  {renderFieldInput(field, status, fieldInputHelpers)}
                  {status === 'missing' && (
                    <p className="text-xs text-red-600">This field is required.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Government Numbers */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            3. Government Identification Numbers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedFields.government.map((field) => {
              const status = getFieldStatusWithContext(editedData, field);
              const fieldKey = Array.isArray(field.key) ? field.key[0] : field.key;
              
              return (
                <div key={fieldKey} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">{field.label}</Label>
                    {getStatusIcon(status)}
                  </div>
                  {renderFieldInput(field, status, fieldInputHelpers)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Employment Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            4. Employment Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedFields.employment.map((field) => {
              const status = getFieldStatusWithContext(editedData, field);
              const fieldKey = Array.isArray(field.key) ? field.key[0] : field.key;
              
              // Check if department field should be optional due to faculty-level position
              const isDepartmentField = field.key === 'department_id';
              const isDepartmentRequired = !isDepartmentField || !isFacultyLevelPosition;
              
              return (
                <div key={fieldKey} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className={cn("text-sm font-medium text-gray-700 flex items-center gap-2", status === 'missing' && 'text-red-700')}>
                      {isDepartmentField 
                        ? (isAdministrative ? 'Office' : 'Department')
                        : field.label}
                      {field.key === 'faculty_id' && isAdministrative && (
                        <span className="text-xs text-muted-foreground ml-1">(Not required for administrative)</span>
                      )}
                      {isDepartmentRequired && field.required && <span className="text-red-500">*</span>}
                      {isDepartmentField && isFacultyLevelPosition && (
                        <span className="text-xs text-muted-foreground ml-1">(Optional for faculty-level positions)</span>
                      )}
                      {isDepartmentField && isFacultyLevelPosition && (
                        <span className="text-xs text-amber-600 ml-1">(Disabled - faculty-level position selected)</span>
                      )}
                    </Label>
                    {getStatusIcon(status)}
                  </div>
                  {renderFieldInput(field, status, fieldInputHelpers)}
                  {status === 'missing' && (
                    <p className="text-xs text-red-600">This field is required.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Optional Additional Fields */}
        {groupedFields.optional.some(f => hasValue(editedData, f) || true) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              5. Additional Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedFields.optional.map((field) => {
                const status = getFieldStatusWithContext(editedData, field);
                const fieldKey = Array.isArray(field.key) ? field.key[0] : field.key;
                
                return (
                  <div key={fieldKey} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-700">{field.label}</Label>
                      {getStatusIcon(status)}
                    </div>
                  {renderFieldInput(field, status, fieldInputHelpers)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">Verification Status:</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Complete</span>
              </span>
              <span className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>Missing Required</span>
              </span>
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-gray-400" />
                <span>Optional</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={() => onConfirm(editedData)}
              disabled={!requiredFieldsComplete}
              className={`px-6 ${
                requiredFieldsComplete
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Confirm & Apply Data
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
