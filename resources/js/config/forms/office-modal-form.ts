import { CirclePlus } from 'lucide-react'

export const OfficeModalFormConfig = {
  moduleTitle: 'Manage Offices',
  title: 'Create Office',
  description: 'Provide the office details below.',
  addButton: {
    id: 'add-office',
    label: 'Add Office',
    className: 'bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 cursor-pointer',
    icon: CirclePlus,
    type: 'button',
    variant: 'default',
    permission: 'create-office',
  },
  fields: [
    {
      id: 'office-code',
      key: 'code',
      name: 'code',
      label: 'Office Code',
      type: 'text',
      placeholder: 'e.g. HR',
      autocomplete: 'off',
      tabIndex: 1,
    },
    {
      id: 'office-name',
      key: 'name',
      name: 'name',
      label: 'Office Name',
      type: 'text',
      placeholder: 'Enter office name',
      autocomplete: 'off',
      tabIndex: 2,
    },
    {
      id: 'office-description',
      key: 'description',
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
      tabIndex: 3,
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
      label: 'Save Office',
      variant: 'default',
      className: 'cursor-pointer',
    },
  ],
}

