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
  { label: 'Date Hired', key: 'date_hired', group: 'employment', required: false, type: 'date', format: formatDate },
  { label: 'Date Regularized', key: 'date_regularized', group: 'employment', required: false, type: 'date', format: formatDate },
  { label: 'Start Date', key: 'start_date', group: 'employment', required: false, type: 'date', format: formatDate },
  { label: 'End Date', key: 'end_date', group: 'employment', required: false, type: 'date', format: formatDate },
  { label: 'Salary (Monthly)', key: 'salary', group: 'employment', required: true, type: 'text' },
  
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

const getFieldStatus = (data: Record<string, unknown>, field: PreviewField): FieldStatus => {
  const employmentStatus = data.employment_status as string;
  const fieldKey = Array.isArray(field.key) ? field.key[0] : field.key;
  
  // Determine if field is required based on employment status
  let isRequired = field.required;
  
  if (fieldKey === 'date_hired') {
    isRequired = employmentStatus === 'Regular' || employmentStatus === 'Contractual';
  } else if (fieldKey === 'date_regularized') {
    isRequired = employmentStatus === 'Regular';
  } else if (fieldKey === 'start_date') {
    isRequired = employmentStatus === 'Job-Order' || employmentStatus === 'Contractual';
  } else if (fieldKey === 'end_date') {
    isRequired = employmentStatus === 'Job-Order' || employmentStatus === 'Contractual';
  }
  
  if (!isRequired) {
    return hasValue(data, field) ? 'complete' : 'optional';
  }
  
  return hasValue(data, field) ? 'complete' : 'missing';
};

export const CSForm212PreviewTable: React.FC<CSForm212PreviewTableProps> = ({
  importedData,
  onConfirm,
  onCancel,
}) => {
  const [editedData, setEditedData] = useState<Record<string, unknown>>(importedData);

  // Update editedData when importedData changes
  useEffect(() => {
    setEditedData(importedData);
  }, [importedData]);

  const updateField = (key: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [key]: value || null,
    }));
  };

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
  // Fields are conditionally required based on employment_status
  const requiredFieldsComplete = previewFields
    .filter(f => {
      const status = getFieldStatus(editedData, f);
      return status === 'missing' || status === 'complete';
    })
    .every(f => {
      const status = getFieldStatus(editedData, f);
      return status === 'complete';
    });

  const missingRequiredFields = previewFields
    .filter(f => {
      const status = getFieldStatus(editedData, f);
      return status === 'missing';
    })
    .map(f => f.label);

  const fieldInputHelpers = {
    updateField,
    editedData,
  };

const renderFieldInput = (
  field: PreviewField,
  status: FieldStatus,
  helpers: typeof fieldInputHelpers
) => {
  const {
    updateField,
    editedData,
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
              const status = getFieldStatus(editedData, field);
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
              const status = getFieldStatus(editedData, field);
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
              const status = getFieldStatus(editedData, field);
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
              const status = getFieldStatus(editedData, field);
              const fieldKey = Array.isArray(field.key) ? field.key[0] : field.key;
              const employmentStatus = editedData.employment_status as string;
              
              // Conditionally show/hide fields based on employment_status
              let shouldShow = true;
              if (fieldKey === 'date_regularized') {
                shouldShow = employmentStatus === 'Regular';
              } else if (fieldKey === 'start_date' || fieldKey === 'end_date') {
                shouldShow = employmentStatus === 'Job-Order' || employmentStatus === 'Contractual';
              } else if (fieldKey === 'date_hired') {
                shouldShow = employmentStatus === 'Regular' || employmentStatus === 'Contractual' || employmentStatus === 'Probationary';
              }
              
              if (!shouldShow) {
                return null;
              }
              
              // Determine if field is required based on employment status
              const isRequired = (() => {
                if (fieldKey === 'date_hired') {
                  return employmentStatus === 'Regular' || employmentStatus === 'Contractual';
                } else if (fieldKey === 'date_regularized') {
                  return employmentStatus === 'Regular';
                } else if (fieldKey === 'start_date' || fieldKey === 'end_date') {
                  return employmentStatus === 'Job-Order' || employmentStatus === 'Contractual';
                }
                return field.required;
              })();
              
              return (
                <div key={fieldKey} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className={cn("text-sm font-medium text-gray-700 flex items-center gap-2", status === 'missing' && 'text-red-700')}>
                      {field.label}
                      {isRequired && <span className="text-red-500">*</span>}
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
                const status = getFieldStatus(editedData, field);
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
