import { CirclePlus } from 'lucide-react'

export const UNIT_TYPE_OPTIONS = [
  { label: 'College', value: 'college', key: 'college' },
  { label: 'Program', value: 'program', key: 'program' },
  { label: 'Office', value: 'office', key: 'office' },
]

export const UnitPositionModalFormConfig = {
  moduleTitle: 'Unit-Position Whitelist',
  title: 'Add Position to Whitelist',
  description: 'Define which positions can be assigned under each unit type.',
  addButton: {
    id: 'add-unit-position',
    label: 'Add to Whitelist',
    className: 'bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 cursor-pointer',
    icon: CirclePlus,
    type: 'button',
    variant: 'default',
    permission: 'create-unit-position',
  },
  fields: [
    {
      id: 'unit-type',
      key: 'unit_type',
      name: 'unit_type',
      label: 'Unit Type',
      type: 'single-select',
      options: UNIT_TYPE_OPTIONS,
      tabIndex: 1,
      required: true,
      description: 'Select the type of unit this position can be assigned to.',
    },
    {
      id: 'position-id',
      key: 'position_id',
      name: 'position_id',
      label: 'Position',
      type: 'single-select',
      options: [], // Will be populated dynamically
      tabIndex: 2,
      required: true,
    },
    {
      id: 'is-active',
      key: 'is_active',
      name: 'is_active',
      label: 'Active',
      type: 'checkbox',
      tabIndex: 3,
      defaultValue: true,
    },
    {
      id: 'description',
      key: 'description',
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional notes about this whitelist entry',
      tabIndex: 4,
      rows: 2,
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
      label: 'Add to Whitelist',
      variant: 'default',
      className: 'cursor-pointer',
    },
  ],
}
