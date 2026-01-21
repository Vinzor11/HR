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
    { label: 'Contact', value: 'contact' },
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
    { label: 'Birth Date', key: 'birth_date', className: 'min-w-[120px] border p-4', group: 'personal', visible: false, format: formatDateValue },
    { label: 'Birth Place', key: 'birth_place', className: 'min-w-[200px] border p-4', group: 'personal', visible: false },
    { label: 'Sex', key: 'sex', className: 'min-w-[80px] border p-4', group: 'personal', visible: false },
    { label: 'Civil Status', key: 'civil_status', className: 'min-w-[120px] border p-4', group: 'personal', visible: false },
    { label: 'Citizenship', key: 'citizenship', className: 'min-w-[120px] border p-4', group: 'personal', visible: false },

    // ========== Contact ==========
    { label: 'Telephone', key: 'telephone_no', className: 'min-w-[120px] border p-4', group: 'contact', visible: false },
    { label: 'Mobile', key: 'mobile_no', className: 'min-w-[120px] border p-4', group: 'contact', visible: true },
    { label: 'Email', key: 'email_address', className: 'min-w-[200px] border p-4', group: 'contact', visible: true },

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

