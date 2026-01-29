export const UnitPositionTableConfig = {
  columns: [
    { 
      label: 'Unit Type', 
      key: 'unit_type', 
      className: 'min-w-[120px] p-4 capitalize',
      format: (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1) : '-',
    },
    { 
      label: 'Position Code', 
      key: 'position.pos_code', 
      className: 'min-w-[120px] p-4',
      format: (value: string, row: any) => row?.position?.pos_code || '-',
    },
    { 
      label: 'Position Name', 
      key: 'position.pos_name', 
      className: 'min-w-[200px] p-4',
      format: (value: string, row: any) => row?.position?.pos_name || '-',
    },
    { 
      label: 'Sector', 
      key: 'position.sector.name', 
      className: 'min-w-[120px] p-4',
      format: (value: string, row: any) => row?.position?.sector?.name || 'System-wide',
    },
    { 
      label: 'Authority Level', 
      key: 'position.authority_level', 
      className: 'min-w-[100px] p-4 text-center',
      format: (value: number, row: any) => row?.position?.authority_level ?? '-',
    },
    { label: 'Status', key: 'status_label', className: 'min-w-[100px] p-4' },
    { label: 'Actions', key: 'actions', isAction: true, className: 'p-4' },
  ],
  actions: [
    { label: 'View', icon: 'Eye', className: 'cursor-pointer rounded-lg bg-sky-600 p-2 text-white hover:opacity-90', permission: 'view-unit-position' },
    { label: 'Edit', icon: 'Pencil', className: 'ms-2 cursor-pointer rounded-lg bg-blue-600 p-2 text-white hover:opacity-90', permission: 'edit-unit-position' },
    { label: 'Delete', icon: 'Trash2', route: 'unit-positions.destroy', className: 'ms-2 cursor-pointer rounded-lg bg-red-600 p-2 text-white hover:opacity-90', permission: 'delete-unit-position' },
  ],
}
