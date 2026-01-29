export const StaffGradeTableConfig = {
  columns: [
    { label: 'Code', key: 'code', className: 'min-w-[100px] p-4' },
    { label: 'Name', key: 'name', className: 'min-w-[200px] p-4' },
    { label: 'Level', key: 'level', className: 'min-w-[80px] p-4' },
    { label: 'Sort Order', key: 'sort_order', className: 'min-w-[100px] p-4' },
    { label: 'Status', key: 'status_label', className: 'min-w-[100px] p-4' },
    { label: 'Actions', key: 'actions', isAction: true, className: 'p-4' },
  ],
  actions: [
    { label: 'View', icon: 'Eye', className: 'cursor-pointer rounded-lg bg-sky-600 p-2 text-white hover:opacity-90', permission: 'view-staff-grade' },
    { label: 'Edit', icon: 'Pencil', className: 'ms-2 cursor-pointer rounded-lg bg-blue-600 p-2 text-white hover:opacity-90', permission: 'edit-staff-grade' },
    { label: 'Delete', icon: 'Trash2', route: 'staff-grades.destroy', className: 'ms-2 cursor-pointer rounded-lg bg-red-600 p-2 text-white hover:opacity-90', permission: 'delete-staff-grade' },
  ],
}
