import { CirclePlus } from 'lucide-react'

export const DEPARTMENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  academic: 'Creating an Academic Department - A teaching department within a faculty (e.g., Computer Science, Engineering). Requires a Faculty to be selected.',
  administrative: 'Creating an Administrative Office - A non-teaching administrative department (e.g., HR, Finance, IT Office). Does not belong to a faculty.',
}

export const DepartmentModalFormConfig = {
  moduleTitle: 'Manage Departments & Offices',
  title: 'Create Department / Office',
  description: 'Create either an Academic Department (teaching unit within a faculty) or an Administrative Office (non-teaching unit).',
  addButton: {
    id: 'add-department',
    label: 'Add Department / Office',
    className: 'bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 cursor-pointer',
    icon: CirclePlus,
    type: 'button',
    variant: 'default',
    permission: 'create-department',
  },
  fields: [
    {
      id: 'dept-code',
      key: 'code',
      name: 'code',
      label: 'Code',
      type: 'text',
      placeholder: 'e.g. CS or HR',
      autocomplete: 'off',
      tabIndex: 1,
    },
    {
      id: 'dept-name',
      key: 'name',
      name: 'name',
      label: 'Name',
      type: 'text',
      placeholder: 'Enter department or office name',
      autocomplete: 'off',
      tabIndex: 2,
    },
    {
      id: 'dept-type',
      key: 'type',
      name: 'type',
      label: 'Type',
      type: 'single-select',
      options: [
        { label: 'Academic Department', value: 'academic', key: 'academic' },
        { label: 'Administrative Office', value: 'administrative', key: 'administrative' },
      ],
      tabIndex: 3,
      required: true,
    },
    {
      id: 'faculty-id',
      key: 'faculty_id',
      name: 'faculty_id',
      label: 'Faculty',
      type: 'single-select',
      placeholder: 'Select the parent faculty',
      tabIndex: 4,
    },
    {
      id: 'dept-description',
      key: 'description',
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
      tabIndex: 5,
      rows: 3,
      className: 'rounded border p-2 w-full',
    },
  ],
  buttons: [
    {
      key: 'cancel',
      type: 'button',
      label: 'Cancel',
      variant: 'ghost',
      className: 'cursor-pointer',
    },
    {
      key: 'submit',
      type: 'submit',
      label: 'Save Department',
      variant: 'default',
      className: 'cursor-pointer',
    },
  ],
}

