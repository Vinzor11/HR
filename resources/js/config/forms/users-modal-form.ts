import { CirclePlus } from "lucide-react";

export const UsersModalFormConfig = {
    moduleTitle: 'Manage Users',
    title: 'Create User',
    description: 'Fill in the details below to create a new user.',
    addButton: {
        id: 'add-user',
        label: 'Add User',
        className: 'bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 cursor-pointer',
        icon: CirclePlus,
        type: 'button',
        variant: 'default',
        permission: 'create-user',
    },
    fields: [
        {
            id: 'name',
            key: 'name',
            name: 'name',
            label: 'Username',
            type: 'text',
            placeholder: 'Enter username',
            autocomplete: 'name',
            tabIndex: 1,
        },
        {
            id: 'email',
            key: 'email',
            name: 'email',
            label: 'Email',
            type: 'text',
            placeholder: 'Enter email',
            autocomplete: 'email',
            tabIndex: 2,
        },
        {
            id: 'employee',
            key: 'employee_id',
            name: 'employee_id',
            label: 'Employee ID',
            type: 'text',
            placeholder: 'Enter employee ID',
            autocomplete: 'off',
            tabIndex: 3,
        },
        {
            id: 'password',
            key: 'password',
            name: 'password',
            label: 'Password',
            type: 'password',
            placeholder: 'Enter password',
            autocomplete: 'new-password',
            tabIndex: 4,
        },
        {
            id: 'confirm-password',
            key: 'confirm_password',
            name: 'confirm_password',
            label: 'Confirm Password',
            type: 'password',
            placeholder: 'Confirm password',
            autocomplete: 'new-password',
            tabIndex: 5,
        },
        {
            id: 'roles',
            key: 'roles',
            name: 'roles',
            label: 'Roles',
            type: 'checkbox-group',
            defaultValue: [],
            options: [], // filled by extraData
            props: {
                orientation: 'vertical',
                optionsKey: 'value',  // ✅ tells the form which key to use for the checkbox value
                labelKey: 'label',    // ✅ tells the form which key to display as the checkbox label
                showSelectAll: true,
            },
        }



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
            label: 'Save User',
            variant: 'default',
            className: 'cursor-pointer',
        },
    ],
};
