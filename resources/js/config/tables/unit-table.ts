export const UnitTableConfig = {
  columns: [
    { label: 'Code', key: 'code', className: 'min-w-[100px] p-4' },
    { label: 'Name', key: 'name', className: 'min-w-[200px] p-4' },
    { 
      label: 'Type', 
      key: 'unit_type', 
      className: 'min-w-[100px] p-4 capitalize',
      format: (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1) : '-',
    },
    { 
      label: 'Sector', 
      key: 'sector.name', 
      className: 'min-w-[120px] p-4',
      format: (value: string, row: any) => row?.sector?.name || '-',
    },
    { 
      label: 'Parent Unit', 
      key: 'parent_unit.name', 
      className: 'min-w-[150px] p-4',
      format: (value: string, row: any) => row?.parentUnit?.name || row?.parent_unit?.name || '-',
    },
    { label: 'Status', key: 'status_label', className: 'min-w-[100px] p-4' },
    { label: 'Actions', key: 'actions', isAction: true, className: 'p-4' },
  ],
  actions: [
    { label: 'View', icon: 'Eye', className: 'cursor-pointer rounded-lg bg-sky-600 p-2 text-white hover:opacity-90', permission: 'view-unit' },
    { label: 'Edit', icon: 'Pencil', className: 'ms-2 cursor-pointer rounded-lg bg-blue-600 p-2 text-white hover:opacity-90', permission: 'edit-unit' },
    { label: 'Delete', icon: 'Trash2', route: 'units.destroy', className: 'ms-2 cursor-pointer rounded-lg bg-red-600 p-2 text-white hover:opacity-90', permission: 'delete-unit' },
  ],
}
