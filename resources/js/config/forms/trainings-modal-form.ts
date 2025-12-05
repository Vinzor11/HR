import { CirclePlus } from 'lucide-react';

const trainingFields = {
    trainingTitle: {
        id: 'training-title',
        key: 'training_title',
        name: 'training_title',
        label: 'Training Title',
        type: 'text',
        placeholder: 'Enter training title',
        autocomplete: 'off',
        tabIndex: 1,
    },
    dateFrom: {
        id: 'date-from',
        key: 'date_from',
        name: 'date_from',
        label: 'Date From',
        type: 'date',
        tabIndex: 2,
    },
    dateTo: {
        id: 'date-to',
        key: 'date_to',
        name: 'date_to',
        label: 'Date To',
        type: 'date',
        tabIndex: 3,
    },
    hours: {
        id: 'training-hours',
        key: 'hours',
        name: 'hours',
        label: 'Hours',
        type: 'number',
        placeholder: 'Enter total hours',
        tabIndex: 4,
    },
    facilitator: {
        id: 'facilitator',
        key: 'facilitator',
        name: 'facilitator',
        label: 'Facilitator',
        type: 'text',
        placeholder: 'Enter facilitator name',
        tabIndex: 5,
    },
    venue: {
        id: 'venue',
        key: 'venue',
        name: 'venue',
        label: 'Venue',
        type: 'text',
        placeholder: 'Enter venue',
        tabIndex: 6,
    },
    capacity: {
        id: 'capacity',
        key: 'capacity',
        name: 'capacity',
        label: 'Capacity',
        type: 'number',
        placeholder: 'Enter maximum participants',
        tabIndex: 7,
    },
    remarks: {
        id: 'remarks',
        key: 'remarks',
        name: 'remarks',
        label: 'Remarks',
        type: 'textarea',
        placeholder: 'Optional remarks',
        tabIndex: 8,
        rows: 3,
        className: 'rounded border p-2 w-full',
    },
    organizationType: {
        id: 'organization-type',
        key: 'organization_type',
        name: 'organization_type',
        label: 'Organization Type',
        type: 'single-select',
        placeholder: 'Select organization type',
        tabIndex: 9,
        options: [
            { label: 'Academic', value: 'academic', key: 'academic' },
            { label: 'Administrative', value: 'administrative', key: 'administrative' },
        ],
    },
    faculties: {
        id: 'faculties',
        key: 'faculties',
        name: 'faculty_ids',
        label: 'Allowed Faculties',
        type: 'checkbox-group',
        viewKey: 'allowed_faculties',
        tabIndex: 10,
        condition: {
            field: 'organization_type',
            value: 'academic',
        },
    },
    departments: {
        id: 'departments',
        key: 'departments',
        name: 'department_ids',
        label: 'Allowed Departments/Offices',
        type: 'checkbox-group',
        viewKey: 'allowed_departments',
        tabIndex: 11,
        description: (data: Record<string, any>) => {
            if (data.organization_type === 'academic') {
                if (!data.faculty_ids || data.faculty_ids.length === 0) {
                    return 'Please select at least one faculty first to view available departments.';
                }
                return 'Select the departments that are allowed to join this training.';
            } else if (data.organization_type === 'administrative') {
                return 'Select the offices that are allowed to join this training.';
            }
            return '';
        },
    },
    positions: {
        id: 'positions',
        key: 'positions',
        name: 'position_ids',
        label: 'Allowed Positions',
        type: 'checkbox-group',
        viewKey: 'allowed_positions',
        tabIndex: 12,
    },
    requiresApproval: {
        id: 'requires-approval',
        key: 'requires_approval',
        name: 'requires_approval',
        label: 'Requires Approval',
        type: 'checkbox',
        tabIndex: 13,
        description:
            'When checked, employees must request approval before joining this training. The system will automatically create an approval workflow if needed. Employees can track their application status in Training History and will receive notifications when approved or rejected.',
    },
};

const fieldList = [
    trainingFields.trainingTitle,
    trainingFields.dateFrom,
    trainingFields.dateTo,
    trainingFields.hours,
    trainingFields.facilitator,
    trainingFields.venue,
    trainingFields.capacity,
    trainingFields.remarks,
    trainingFields.organizationType,
    trainingFields.faculties,
    trainingFields.departments,
    trainingFields.positions,
    trainingFields.requiresApproval,
];

export const TrainingsModalFormConfig = {
    moduleTitle: 'Manage Trainings',
    title: 'Create Training',
    description: 'Provide the details below to create a new training schedule.',
    addButton: {
        id: 'add-training',
        label: 'Add Training',
        className: 'bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 cursor-pointer',
        icon: CirclePlus,
        type: 'button',
        variant: 'default',
        permission: 'create-training',
    },
    fields: fieldList,
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
            label: 'Save Training',
            variant: 'default',
            className: 'cursor-pointer',
        },
    ],
};

