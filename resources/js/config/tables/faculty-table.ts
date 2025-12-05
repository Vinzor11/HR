export const FacultyTableConfig = {
  columns: [
    { label: 'Code', key: 'code', className: 'min-w-[120px] border p-4' },
    { label: 'Name', key: 'name', className: 'min-w-[220px] border p-4' },
    { label: 'Status', key: 'status_label', className: 'min-w-[140px] border p-4 capitalize' },
    { label: 'Description', key: 'description', className: 'border p-4' },
    { label: 'Actions', key: 'actions', isAction: true, className: 'border p-4' },
  ],
  actions: [
    { label: 'View', icon: 'Eye', className: 'cursor-pointer rounded-lg bg-sky-600 p-2 text-white hover:opacity-90', permission: 'view-faculty' },
    { label: 'Edit', icon: 'Pencil', className: 'ms-2 cursor-pointer rounded-lg bg-blue-600 p-2 text-white hover:opacity-90', permission: 'edit-faculty' },
    { label: 'Delete', icon: 'Trash2', route: 'faculties.destroy', className: 'ms-2 cursor-pointer rounded-lg bg-red-600 p-2 text-white hover:opacity-90', permission: 'delete-faculty' },
  ],
}


