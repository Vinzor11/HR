export const DepartmentTableConfig = {
  columns: [
    { label: 'Code', key: 'code', className: 'min-w-[120px] border p-4' },
    { label: 'Name', key: 'name', className: 'min-w-[200px] border p-4' },
    { label: 'Type', key: 'type_label', className: 'min-w-[140px] border p-4 capitalize' },
    { label: 'Faculty', key: 'faculty_display', className: 'min-w-[220px] border p-4' },
    { label: 'Description', key: 'description', className: 'border p-4' },
    { label: 'Actions', key: 'actions', isAction: true, className: 'border p-4' },
  ],
  actions: [
    { label: 'View', icon: 'Eye', className: 'cursor-pointer rounded-lg bg-sky-600 p-2 text-white hover:opacity-90', permission: 'view-department' },
    { label: 'Edit', icon: 'Pencil', className: 'ms-2 cursor-pointer rounded-lg bg-blue-600 p-2 text-white hover:opacity-90', permission: 'edit-department' },
    { label: 'Delete', icon: 'Trash2', route: 'departments.destroy', className: 'ms-2 cursor-pointer rounded-lg bg-red-600 p-2 text-white hover:opacity-90', permission: 'delete-department' },
  ],
}

