import { CirclePlus } from 'lucide-react'

export const UNIT_TYPE_OPTIONS = [
  { label: 'College', value: 'college', key: 'college' },
  { label: 'Program', value: 'program', key: 'program' },
  { label: 'Office', value: 'office', key: 'office' },
]

export const UNIT_TYPE_DESCRIPTIONS: Record<string, string> = {
  college: 'Academic unit that contains programs. Has no parent unit.',
  program: 'Academic unit under a college. Must have a parent college.',
  office: 'Administrative unit. Usually has no parent but can have one for future flexibility.',
}

export const UnitModalFormConfig = {
  moduleTitle: 'Manage Units',
  title: 'Create Unit',
  description: 'Provide the unit details below. Units can be colleges, programs, or offices.',
  addButton: {
    id: 'add-unit',
    label: 'Add Unit',
    className: 'bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 cursor-pointer',
    icon: CirclePlus,
    type: 'button',
    variant: 'default',
    permission: 'create-unit',
  },
  fields: [
    {
      id: 'unit-sector',
      key: 'sector_id',
      name: 'sector_id',
      label: 'Sector',
      type: 'single-select',
      options: [], // Will be populated dynamically
      tabIndex: 1,
      required: true,
    },
    {
      id: 'unit-type',
      key: 'unit_type',
      name: 'unit_type',
      label: 'Unit Type',
      type: 'single-select',
      options: UNIT_TYPE_OPTIONS,
      tabIndex: 2,
      required: true,
    },
    {
      id: 'unit-name',
      key: 'name',
      name: 'name',
      label: 'Unit Name',
      type: 'text',
      placeholder: 'e.g. College of Engineering, BSCE Program',
      autocomplete: 'off',
      tabIndex: 3,
      required: true,
    },
    {
      id: 'unit-code',
      key: 'code',
      name: 'code',
      label: 'Unit Code',
      type: 'text',
      placeholder: 'e.g. COE, BSCE',
      autocomplete: 'off',
      tabIndex: 4,
    },
    {
      id: 'unit-parent',
      key: 'parent_unit_id',
      name: 'parent_unit_id',
      label: 'Parent Unit (College)',
      type: 'single-select',
      options: [], // Will be populated dynamically
      tabIndex: 5,
      description: 'Required for programs. Select the parent college.',
    },
    {
      id: 'unit-is-active',
      key: 'is_active',
      name: 'is_active',
      label: 'Active',
      type: 'checkbox',
      tabIndex: 6,
      defaultValue: true,
    },
    {
      id: 'unit-description',
      key: 'description',
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description for this unit',
      tabIndex: 7,
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
      label: 'Save Unit',
      variant: 'default',
      className: 'cursor-pointer',
    },
  ],
}
