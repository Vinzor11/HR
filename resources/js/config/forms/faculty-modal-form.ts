import { CirclePlus } from 'lucide-react'

export const FacultyModalFormConfig = {
  moduleTitle: 'Manage Faculties',
  title: 'Create Faculty',
  description: 'Provide the faculty details below.',
  addButton: {
    id: 'add-faculty',
    label: 'Add Faculty',
    className: 'bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 cursor-pointer',
    icon: CirclePlus,
    type: 'button',
    variant: 'default',
    permission: 'create-faculty',
  },
  fields: [
    {
      id: 'faculty-code',
      key: 'code',
      name: 'code',
      label: 'Faculty Code',
      type: 'text',
      placeholder: 'e.g. CAS',
      autocomplete: 'off',
      tabIndex: 1,
    },
    {
      id: 'faculty-name',
      key: 'name',
      name: 'name',
      label: 'Faculty Name',
      type: 'text',
      placeholder: 'Enter faculty name',
      autocomplete: 'off',
      tabIndex: 2,
    },
    {
      id: 'faculty-status',
      key: 'status',
      name: 'status',
      label: 'Status',
      type: 'single-select',
      options: [
        { label: 'Active', value: 'active', key: 'active' },
        { label: 'Inactive', value: 'inactive', key: 'inactive' },
      ],
      tabIndex: 3,
    },
    {
      id: 'faculty-description',
      key: 'description',
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
      tabIndex: 4,
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
      label: 'Save Faculty',
      variant: 'default',
      className: 'cursor-pointer',
    },
  ],
}


