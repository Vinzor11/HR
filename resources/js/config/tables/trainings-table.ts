export const TrainingsTableConfig = {
    columns: [
        { label: 'Title', key: 'training_title', className: 'p-4' },
        { label: 'Schedule', key: 'schedule', className: 'p-4' },
        { label: 'Hours', key: 'hours', className: 'p-4' },
        { label: 'Facilitator', key: 'facilitator', className: 'p-4' },
        { label: 'Venue', key: 'venue', className: 'p-4' },
        { label: 'Capacity', key: 'capacity', className: 'p-4' },
        { label: 'Sectors', key: 'allowed_sectors', className: 'p-4', type: 'multi-values', displayKey: 'name' },
        { label: 'Units', key: 'allowed_units', className: 'p-4', type: 'multi-values', displayKey: 'name' },
        { label: 'Positions', key: 'allowed_positions', className: 'p-4', type: 'multi-values', displayKey: 'pos_name' },
        { label: 'Actions', key: 'actions', isAction: true, className: 'p-4' },
    ],
    actions: [
        { label: 'View', icon: 'Eye', className: 'cursor-pointer rounded-lg bg-sky-600 p-2 text-white hover:opacity-90', permission: 'view-training' },
        { label: 'Edit', icon: 'Pencil', className: 'ms-2 cursor-pointer rounded-lg bg-blue-600 p-2 text-white hover:opacity-90', permission: 'edit-training' },
        { label: 'Delete', icon: 'Trash2', route: 'trainings.destroy', className: 'ms-2 cursor-pointer rounded-lg bg-red-600 p-2 text-white hover:opacity-90', permission: 'delete-training' },
    ],
};

