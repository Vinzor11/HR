export const OfficeTableConfig = {
  columns: [
    { label: 'Code', key: 'code', className: 'min-w-[120px] border p-4' },
    { label: 'Name', key: 'name', className: 'min-w-[220px] border p-4' },
    { label: 'Description', key: 'description', className: 'border p-4' },
    { label: 'Actions', key: 'actions', isAction: true, className: 'border p-4' },
  ],
  actions: [
    { label: 'View', icon: 'Eye', className: 'cursor-pointer rounded-lg bg-sky-600 p-2 text-white hover:opacity-90', permission: 'view-office' },
    { label: 'Edit', icon: 'Pencil', className: 'ms-2 cursor-pointer rounded-lg bg-blue-600 p-2 text-white hover:opacity-90', permission: 'edit-office' },
    { label: 'Delete', icon: 'Trash2', route: 'offices.destroy', className: 'ms-2 cursor-pointer rounded-lg bg-red-600 p-2 text-white hover:opacity-90', permission: 'delete-office' },
  ],
}

