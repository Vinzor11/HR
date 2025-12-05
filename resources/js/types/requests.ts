export type RequestFieldType =
    | 'text'
    | 'number'
    | 'date'
    | 'textarea'
    | 'checkbox'
    | 'dropdown'
    | 'radio'
    | 'file';

export interface RequestFieldOption {
    label: string;
    value: string;
}

export interface RequestFieldDefinition {
    id?: number;
    field_key?: string;
    label: string;
    field_type: RequestFieldType;
    is_required: boolean;
    description?: string | null;
    options?: RequestFieldOption[];
    sort_order?: number;
    clientKey?: string;
}

export interface ApprovalStepApprover {
    id?: string;
    approver_type: 'user' | 'role';
    approver_id?: number | null;
    approver_role_id?: number | null;
    clientKey?: string;
}

export interface ApprovalStepDefinition {
    id?: string;
    name: string;
    description?: string | null;
    approvers: ApprovalStepApprover[];
    sort_order?: number;
    clientKey?: string;
}

export interface RequestTypeResource {
    id: number;
    name: string;
    description?: string | null;
    has_fulfillment: boolean;
    is_published?: boolean;
    approval_steps?: ApprovalStepDefinition[];
    fields: RequestFieldDefinition[];
}

export type RequestStatus = 'pending' | 'approved' | 'fulfillment' | 'completed' | 'rejected';

export interface RequestSubmissionFieldValue {
    id: number;
    label: string;
    field_type: RequestFieldType;
    description?: string | null;
    value: string | boolean | null;
    value_json?: unknown;
    download_url?: string | null;
}

export interface RequestApprovalActionResource {
    id: number;
    step_index: number;
    status: 'pending' | 'approved' | 'rejected';
    notes?: string | null;
    acted_at?: string | null;
    approver?: {
        id: number;
        name: string;
        email: string;
        position?: {
            id: number;
            pos_name: string;
        } | null;
    } | null;
    approver_role?: {
        id: number;
        name: string;
        label?: string | null;
    } | null;
    approver_position?: {
        id: number;
        pos_name: string;
    } | null;
    approver_name?: string | null;
}

export interface RequestSubmissionResource {
    id: number;
    reference_code: string;
    status: RequestStatus;
    submitted_at?: string | null;
    fulfilled_at?: string | null;
    request_type: {
        id: number;
        name: string;
        has_fulfillment: boolean;
    } | null;
    requester: {
        id?: number;
        full_name: string;
        employee_id?: string | number | null;
    };
    fields: RequestSubmissionFieldValue[];
    approval: {
        actions: RequestApprovalActionResource[];
        state?: {
            steps?: Array<Record<string, unknown>>;
        };
    };
    fulfillment?: {
        file_url?: string | null;
        original_filename?: string | null;
        notes?: string | null;
        completed_at?: string | null;
        fulfilled_by?: {
            id: number;
            name: string;
            email: string;
        } | null;
    } | null;
}

