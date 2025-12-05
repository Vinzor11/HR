import { CustomToast, toast } from '@/components/custom-toast';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CustomTextarea } from '@/components/ui/custom-textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FloatingInput } from '@/components/ui/floating-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { ApprovalStepDefinition, RequestFieldDefinition, RequestFieldOption, RequestFieldType } from '@/types/requests';
import { Head, useForm } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type BuilderField = RequestFieldDefinition & { clientKey: string };
type StepApprover = {
    clientKey: string;
    approver_type: 'user' | 'role' | 'position';
    approver_id?: number | null;
    approver_role_id?: number | null;
    approver_position_id?: number | null;
};
type BuilderApprovalStep = {
    clientKey: string;
    id?: string;
    name: string;
    description?: string | null;
    approvers: StepApprover[];
};

interface FormOptions {
    fieldTypes: Array<{ value: RequestFieldType; label: string; description: string }>;
    approvalModes: Array<{ value: 'user' | 'role' | 'position'; label: string }>;
    roles: Array<{ id: number; name: string; label?: string | null }>;
    users: Array<{ id: number; name: string; email: string }>;
    positions: Array<{ 
        id: number; 
        name: string;
        faculty_id?: number | null;
        department_id?: number | null;
        faculty?: { id: number; name: string } | null;
        department?: { id: number; name: string; type: string } | null;
    }>;
    faculties: Array<{ id: number; name: string }>;
    departments: Array<{ id: number; name: string; faculty_id?: number | null; faculty?: { id: number; name: string } | null }>;
    offices: Array<{ id: number; name: string }>;
    certificateTemplates: Array<{ id: number; name: string; description?: string | null }>;
}

interface BuilderProps {
    mode: 'create' | 'edit';
    requestType?: {
        id: number;
        name: string;
        description?: string | null;
        has_fulfillment: boolean;
        is_published?: boolean;
        certificate_template_id?: number | null;
        certificate_config?: {
            field_mappings?: Record<string, string>;
        } | null;
        fields: RequestFieldDefinition[];
        approval_steps?: ApprovalStepDefinition[];
    } | null;
    formOptions: FormOptions;
}

const breadcrumbs = (mode: 'create' | 'edit', name?: string | null): BreadcrumbItem[] => [
    { title: 'Dynamic Request Builder', href: '/request-types' },
    {
        title: mode === 'edit' ? `Edit: ${name ?? 'Request Type'}` : 'Create Request Type',
        href: mode === 'edit' ? '/request-types' : '/request-types/create',
    },
];

const generateKey = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const initialField = (type: RequestFieldType = 'text'): BuilderField => {
    const clientKey = generateKey();
    const baseLabel =
        type === 'text'
            ? 'Short Answer'
            : type === 'textarea'
            ? 'Long Answer'
            : type === 'number'
            ? 'Number'
            : type === 'date'
            ? 'Date'
            : type === 'checkbox'
            ? 'Confirmation'
            : type === 'radio'
            ? 'Radio Field'
            : type === 'dropdown'
            ? 'Dropdown Field'
            : 'Attachment';

    const needsOptions = ['dropdown', 'radio'].includes(type);

    return {
        clientKey,
        label: baseLabel,
        field_type: type,
        is_required: false,
        description: '',
        options: needsOptions ? [{ label: 'Option 1', value: 'option-1' }] : [],
    };
};

const createStepApprover = (type: 'user' | 'role' = 'user'): StepApprover => ({
    clientKey: generateKey(),
    approver_type: type,
    approver_id: undefined,
    approver_role_id: undefined,
});

const initialApprovalStep = (): BuilderApprovalStep => {
    const clientKey = generateKey();
    return {
        clientKey,
        id: clientKey,
        name: 'Supervisor Approval',
        description: '',
        approvers: [createStepApprover()],
    };
};

const mapApproversFromDefinition = (step?: ApprovalStepDefinition | (ApprovalStepDefinition & Record<string, any>)) => {
    if (step?.approvers && step.approvers.length > 0) {
        return step.approvers;
    }

    if (step && ('approver_type' in step || 'approver_id' in step || 'approver_role_id' in step || 'approver_position_id' in step)) {
        return [
            {
                approver_type: (step as any).approver_type ?? 'user',
                approver_id: (step as any).approver_id,
                approver_role_id: (step as any).approver_role_id,
                approver_position_id: (step as any).approver_position_id,
            },
        ];
    }

    return [];
};

const buildApprovalStepFromDefinition = (step?: ApprovalStepDefinition): BuilderApprovalStep => {
    const clientKey = generateKey();
    const rawApprovers = mapApproversFromDefinition(step);

    return {
        clientKey,
        id: step?.id ?? clientKey,
        name: step?.name ?? 'Approval Step',
        description: step?.description ?? '',
        approvers: (rawApprovers.length ? rawApprovers : [createStepApprover()]).map((approver) => ({
            clientKey: generateKey(),
            approver_type: approver.approver_type ?? 'user',
            approver_id: approver.approver_id ?? undefined,
            approver_role_id: approver.approver_role_id ?? undefined,
            approver_position_id: approver.approver_position_id ?? undefined,
        })),
    };
};

export default function RequestTypeBuilder({ mode, requestType, formOptions }: BuilderProps) {
    const [fields, setFields] = useState<BuilderField[]>(() =>
        requestType?.fields?.length
            ? requestType.fields.map((field) => ({
                  ...field,
                  clientKey: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
                  options: field.options ?? [],
              }))
            : [initialField('text')],
    );
    const [approvalSteps, setApprovalSteps] = useState<BuilderApprovalStep[]>(() =>
        requestType?.approval_steps?.length
            ? requestType.approval_steps.map((step) => buildApprovalStepFromDefinition(step))
            : [],
    );
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    
    // Position filter states - stored per approver
    const [positionFilters, setPositionFilters] = useState<Record<string, {
        org_type?: 'academic' | 'administrative';
        faculty_id?: string;
        department_id?: string;
    }>>({});

    const { data, setData, errors, processing, post, put } = useForm({
        name: requestType?.name ?? '',
        description: requestType?.description ?? '',
        has_fulfillment: requestType?.has_fulfillment ?? false,
        is_published: requestType?.is_published ?? false,
        certificate_template_id: requestType?.certificate_template_id ?? null,
        certificate_config: requestType?.certificate_config ?? { field_mappings: {} },
        fields: requestType?.fields ?? [],
        approval_steps: requestType?.approval_steps ?? [],
    });

    useEffect(() => {
        const sanitized = fields.map((field, index) => {
            const { clientKey, ...rest } = field;
            return {
                ...rest,
                sort_order: index,
            };
        });
        setData('fields', sanitized);
    }, [fields, setData]);

    useEffect(() => {
        const sanitized = approvalSteps.map((step, index) => {
            const { clientKey, approvers, ...rest } = step;
            return {
                ...rest,
                approvers: approvers.map((approver) => ({
                    approver_type: approver.approver_type,
                    approver_id: approver.approver_type === 'user' ? approver.approver_id : null,
                    approver_role_id: approver.approver_type === 'role' ? approver.approver_role_id : null,
                    approver_position_id: approver.approver_type === 'position' ? approver.approver_position_id : null,
                })),
                sort_order: index,
            };
        });
        setData('approval_steps', sanitized);
    }, [approvalSteps, setData]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!fields.length) {
            toast.error('Add at least one form field.');
            return;
        }

        const action = mode === 'edit' && requestType ? put : post;
        const routeName = mode === 'edit' && requestType ? 'request-types.update' : 'request-types.store';
        const routeParams = mode === 'edit' && requestType ? [requestType.id] : [];

        action(
            route(routeName, routeParams),
            {
                preserveScroll: true,
                onSuccess: () => toast.success(`Request type ${mode === 'edit' ? 'updated' : 'created'} successfully.`),
                onError: () => toast.error('Please review the highlighted errors.'),
            },
        );
    };

    const addField = (type: RequestFieldType) => {
        setFields((prev) => [...prev, initialField(type)]);
    };

    const updateField = (index: number, patch: Partial<BuilderField>) => {
        setFields((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], ...patch };
            if (!['dropdown', 'radio'].includes(next[index].field_type)) {
                next[index].options = [];
            }
            return next;
        });
    };

    const addOption = (fieldIndex: number) => {
        setFields((prev) => {
            const next = [...prev];
            const options = next[fieldIndex].options ?? [];
            const optionNumber = options.length + 1;
            options.push({
                label: `Option ${optionNumber}`,
                value: `option-${optionNumber}`,
            });
            next[fieldIndex].options = [...options];
            return next;
        });
    };

    const updateOption = (fieldIndex: number, optionIndex: number, patch: Partial<RequestFieldOption>) => {
        setFields((prev) => {
            const next = [...prev];
            const options = next[fieldIndex].options ?? [];
            options[optionIndex] = { ...options[optionIndex], ...patch };
            next[fieldIndex].options = [...options];
            return next;
        });
    };

    const removeOption = (fieldIndex: number, optionIndex: number) => {
        setFields((prev) => {
            const next = [...prev];
            const options = next[fieldIndex].options ?? [];
            options.splice(optionIndex, 1);
            next[fieldIndex].options = [...options];
            return next;
        });
    };

    const removeField = (index: number) => {
        setFields((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleDragStart = (index: number) => setDraggingIndex(index);
    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => event.preventDefault();
    const handleDrop = (index: number) => {
        if (draggingIndex === null || draggingIndex === index) {
            return;
        }
        setFields((prev) => {
            const next = [...prev];
            const [moved] = next.splice(draggingIndex, 1);
            next.splice(index, 0, moved);
            return next;
        });
        setDraggingIndex(null);
    };

    const addApprovalStep = () => {
        setApprovalSteps((prev) => [...prev, initialApprovalStep()]);
    };

    const updateApprovalStep = (index: number, patch: Partial<BuilderApprovalStep>) => {
        setApprovalSteps((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], ...patch };
            return next;
        });
    };

    const removeApprovalStep = (index: number) => {
        setApprovalSteps((prev) => prev.filter((_, idx) => idx !== index));
    };

    const addApproverToStep = (stepIndex: number) => {
        setApprovalSteps((prev) => {
            const next = [...prev];
            next[stepIndex] = {
                ...next[stepIndex],
                approvers: [...next[stepIndex].approvers, createStepApprover()],
            };
            return next;
        });
    };

    const updateStepApprover = (stepIndex: number, approverIndex: number, patch: Partial<StepApprover>) => {
        setApprovalSteps((prev) => {
            const next = [...prev];
            const approvers = [...next[stepIndex].approvers];
            const updatedApprover = { ...approvers[approverIndex], ...patch };

            if (patch.approver_type === 'user') {
                updatedApprover.approver_role_id = undefined;
                updatedApprover.approver_position_id = undefined;
            }

            if (patch.approver_type === 'role') {
                updatedApprover.approver_id = undefined;
                updatedApprover.approver_position_id = undefined;
            }

            if (patch.approver_type === 'position') {
                updatedApprover.approver_id = undefined;
                updatedApprover.approver_role_id = undefined;
            }

            approvers[approverIndex] = updatedApprover;
            next[stepIndex] = { ...next[stepIndex], approvers };
            return next;
        });
    };

    const removeStepApprover = (stepIndex: number, approverIndex: number) => {
        setApprovalSteps((prev) => {
            const next = [...prev];
            const approvers = [...next[stepIndex].approvers];

            if (approvers.length <= 1) {
                return prev;
            }

            approvers.splice(approverIndex, 1);
            next[stepIndex] = { ...next[stepIndex], approvers };
            return next;
        });
    };

    const fieldError = (path: string) => (errors as Record<string, string | undefined>)[path];

    const fieldTypeLabel = (type: RequestFieldType) => formOptions.fieldTypes.find((item) => item.value === type)?.label ?? type;

    return (
        <AppLayout breadcrumbs={breadcrumbs(mode, requestType?.name)}>
            <Head title={mode === 'edit' ? `Edit ${requestType?.name}` : 'Create Request Type'} />
            <CustomToast />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-4">
                        <Card className="p-5 space-y-4">
                            <div>
                                <h2 className="text-base font-semibold text-foreground">Request Basics</h2>
                                <p className="text-sm text-muted-foreground">
                                    Name and describe this dynamic request. These details help employees pick the correct form.
                                </p>
                            </div>

                            <FloatingInput
                                label="Request name"
                                value={data.name}
                                onChange={(event) => setData('name', event.target.value)}
                                required
                                error={errors.name}
                            />

                            <div>
                                <Label className="text-sm font-medium text-foreground">Description</Label>
                                <CustomTextarea
                                    className="mt-1 min-h-[100px] text-sm"
                                    value={data.description ?? ''}
                                    onChange={(event) => setData('description', event.target.value)}
                                />
                                {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
                            </div>
                        </Card>

                        <Card className="p-5 space-y-4">
                            <div>
                                <h2 className="text-base font-semibold text-foreground">Fulfillment & Publishing</h2>
                                <p className="text-sm text-muted-foreground">
                                    Control whether HR must upload a deliverable and whether this type is already visible to employees.
                                </p>
                            </div>

                            <label className="flex items-start gap-3 rounded-lg border border-dashed p-3">
                                <Checkbox
                                    checked={data.has_fulfillment}
                                    onCheckedChange={(checked) => setData('has_fulfillment', Boolean(checked))}
                                />
                                <span>
                                    <span className="font-medium text-foreground">Requires fulfillment</span>
                                    <p className="text-sm text-muted-foreground">
                                        After approval, HR must upload a final output (e.g., certificate, document, memo) before completion.
                                    </p>
                                </span>
                            </label>

                            <label className="flex items-start gap-3 rounded-lg border border-dashed p-3">
                                <Checkbox
                                    checked={data.is_published}
                                    onCheckedChange={(checked) => setData('is_published', Boolean(checked))}
                                />
                                <span>
                                    <span className="font-medium text-foreground">Publish immediately</span>
                                    <p className="text-sm text-muted-foreground">
                                        When enabled, the request type becomes available to all eligible employees right after saving.
                                    </p>
                                </span>
                            </label>
                        </Card>

                        <Card className="p-5 space-y-4">
                            <div>
                                <h2 className="text-base font-semibold text-foreground">Certificate Generation</h2>
                                <p className="text-sm text-muted-foreground">
                                    Automatically generate certificates when requests are completed. Map your request fields to certificate text layers.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <Label htmlFor="certificate_template_id" className="text-sm font-medium">
                                        Certificate Template
                                    </Label>
                                    <Select
                                        value={data.certificate_template_id?.toString() || undefined}
                                        onValueChange={(value) => {
                                            if (value === 'none') {
                                                setData('certificate_template_id', null);
                                                setData('certificate_config', { field_mappings: {} });
                                            } else {
                                                setData('certificate_template_id', parseInt(value));
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select a certificate template (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None - No certificate generation</SelectItem>
                                            {formOptions.certificateTemplates?.map((template) => (
                                                <SelectItem key={template.id} value={template.id.toString()}>
                                                    {template.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.certificate_template_id && (
                                        <p className="mt-1 text-xs text-destructive">{errors.certificate_template_id}</p>
                                    )}
                                </div>

                                {data.certificate_template_id && (
                                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium">Field Mappings</Label>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Map your request field keys to certificate text layer names. Leave empty to use default placeholders.
                                            </p>
                                        </div>

                                        {fields.length > 0 ? (
                                            <div className="space-y-3">
                                                {fields.map((field) => {
                                                    const fieldKey = field.field_key || `field-${field.id || field.clientKey}`;
                                                    const currentMapping = data.certificate_config?.field_mappings?.[fieldKey] || '';
                                                    
                                                    return (
                                                        <div key={field.clientKey} className="flex items-center gap-3">
                                                            <div className="flex-1">
                                                                <Label className="text-xs text-muted-foreground">
                                                                    {field.label} ({fieldKey})
                                                                </Label>
                                                                <Input
                                                                    className="mt-1"
                                                                    placeholder="Certificate layer name (e.g., recipient_name)"
                                                                    value={currentMapping}
                                                                    onChange={(e) => {
                                                                        const mappings = { ...(data.certificate_config?.field_mappings || {}) };
                                                                        if (e.target.value) {
                                                                            mappings[fieldKey] = e.target.value;
                                                                        } else {
                                                                            delete mappings[fieldKey];
                                                                        }
                                                                        setData('certificate_config', {
                                                                            ...data.certificate_config,
                                                                            field_mappings: mappings,
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                Add fields to your request type first, then map them to certificate layers.
                                            </p>
                                        )}

                                        <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 text-xs text-blue-900 dark:text-blue-100">
                                            <p className="font-medium mb-1">💡 Tip:</p>
                                            <p>
                                                The certificate template has text layers with names like <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">recipient_name</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">course_title</code>, etc.
                                                Enter the layer name here to map your request field to it.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        <Card className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-semibold text-foreground">Approval Workflow</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Define who approves this request in each step. You can mix user-based and role-based approvals.
                                    </p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addApprovalStep}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add step
                                </Button>
                            </div>

                            {approvalSteps.length === 0 && (
                                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                                    No approval steps yet. Add one to start building your workflow.
                                </div>
                            )}

                            <div className="space-y-3">
                                {approvalSteps.map((step, index) => (
                                    <div key={step.clientKey} className="rounded-lg border p-3 space-y-3">
                                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                                            <span>Step {index + 1}</span>
                                            <button
                                                type="button"
                                                className="text-destructive transition hover:text-destructive/80"
                                                onClick={() => removeApprovalStep(index)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <FloatingInput
                                            label="Step name"
                                            value={step.name}
                                            onChange={(event) => updateApprovalStep(index, { name: event.target.value })}
                                            required
                                            error={fieldError(`approval_steps.${index}.name`)}
                                        />
                                        <div>
                                            <Label className="text-sm font-medium text-foreground">Instructions / Description</Label>
                                            <CustomTextarea
                                                className="mt-1 text-sm"
                                                value={step.description ?? ''}
                                                onChange={(event) => updateApprovalStep(index, { description: event.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            {step.approvers.map((approver, approverIndex) => (
                                                <div key={approver.clientKey} className="rounded-lg border border-dashed p-3 space-y-3">
                                                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                                                        <span>Approver {approverIndex + 1}</span>
                                                        {step.approvers.length > 1 && (
                                                            <button
                                                                type="button"
                                                                className="text-destructive transition hover:text-destructive/80"
                                                                onClick={() => removeStepApprover(index, approverIndex)}
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="grid gap-3 md:grid-cols-2">
                                                        <div>
                                                            <Label className="text-sm font-medium text-foreground">Approver type</Label>
                                                            <Select
                                                                value={approver.approver_type}
                                                                onValueChange={(value: 'user' | 'role' | 'position') =>
                                                                    updateStepApprover(index, approverIndex, { approver_type: value })
                                                                }
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select approver type" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {formOptions.approvalModes.map((modeOption) => (
                                                                        <SelectItem key={modeOption.value} value={modeOption.value}>
                                                                            {modeOption.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {approver.approver_type === 'user' && (
                                                            <div>
                                                                <Label className="text-sm font-medium text-foreground">Select user</Label>
                                                                <Select
                                                                    value={
                                                                        approver.approver_id !== undefined && approver.approver_id !== null
                                                                            ? String(approver.approver_id)
                                                                            : undefined
                                                                    }
                                                                    onValueChange={(value) =>
                                                                        updateStepApprover(index, approverIndex, { approver_id: Number(value) })
                                                                    }
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Choose user" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {formOptions.users.map((user) => (
                                                                            <SelectItem key={user.id} value={String(user.id)}>
                                                                                {user.name} • {user.email}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                {fieldError(`approval_steps.${index}.approvers.${approverIndex}.approver_id`) && (
                                                                    <p className="text-xs text-destructive">
                                                                        {fieldError(`approval_steps.${index}.approvers.${approverIndex}.approver_id`)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}

                                                        {approver.approver_type === 'role' && (
                                                            <div>
                                                                <Label className="text-sm font-medium text-foreground">Select role</Label>
                                                                <Select
                                                                    value={
                                                                        approver.approver_role_id !== undefined && approver.approver_role_id !== null
                                                                            ? String(approver.approver_role_id)
                                                                            : undefined
                                                                    }
                                                                    onValueChange={(value) =>
                                                                        updateStepApprover(index, approverIndex, { approver_role_id: Number(value) })
                                                                    }
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Choose role" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {formOptions.roles.map((role) => (
                                                                            <SelectItem key={role.id} value={String(role.id)}>
                                                                                {role.label ?? role.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                {fieldError(
                                                                    `approval_steps.${index}.approvers.${approverIndex}.approver_role_id`,
                                                                ) && (
                                                                    <p className="text-xs text-destructive">
                                                                        {fieldError(
                                                                            `approval_steps.${index}.approvers.${approverIndex}.approver_role_id`,
                                                                        )}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}

                                                        {approver.approver_type === 'position' && (() => {
                                                            const filterKey = `${index}-${approverIndex}`;
                                                            const filters = positionFilters[filterKey] || {};
                                                            const orgType = filters.org_type; // 'academic', 'administrative', or undefined (all)
                                                            
                                                            // Get filtered departments based on faculty (for academic only)
                                                            const getFilteredDepartments = () => {
                                                                if (!filters.faculty_id) {
                                                                    // No faculty selected - show all academic departments
                                                                    return formOptions.departments;
                                                                }
                                                                // Faculty selected - filter departments by faculty
                                                                return formOptions.departments.filter(
                                                                    d => d.faculty_id === Number(filters.faculty_id)
                                                                );
                                                            };
                                                            
                                                            const filteredDepartments = getFilteredDepartments();
                                                            
                                                            // Filter positions based on selected filters (similar to position creation logic)
                                                            const filteredPositions = formOptions.positions.filter((position) => {
                                                                // Filter by organization type (academic vs administrative)
                                                                if (orgType === 'academic') {
                                                                    // For academic: must have faculty_id and department must be academic
                                                                    if (!position.faculty_id) return false;
                                                                    if (position.department?.type !== 'academic') return false;
                                                                } else if (orgType === 'administrative') {
                                                                    // For administrative: must have department with type administrative (office)
                                                                    if (position.department?.type !== 'administrative') return false;
                                                                    // Should not have faculty_id for administrative
                                                                    if (position.faculty_id) return false;
                                                                }
                                                                
                                                                // Filter by faculty (for academic)
                                                                if (orgType === 'academic' && filters.faculty_id && position.faculty_id !== Number(filters.faculty_id)) {
                                                                    return false;
                                                                }
                                                                
                                                                // Filter by department/office
                                                                if (filters.department_id) {
                                                                    if (position.department_id !== Number(filters.department_id)) {
                                                                        return false;
                                                                    }
                                                                }
                                                                
                                                                return true;
                                                            });
                                                            
                                                            return (
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <Label className="text-sm font-medium text-foreground mb-2 block">Filter by Organization</Label>
                                                                        <div className="space-y-3">
                                                                            {/* Organization Type Filter (Academic vs Administrative) */}
                                                                            <div>
                                                                                <Label className="text-xs text-muted-foreground mb-1">Organization Type</Label>
                                                                                <Select
                                                                                    value={orgType || 'all'}
                                                                                    onValueChange={(value) => {
                                                                                        setPositionFilters(prev => ({
                                                                                            ...prev,
                                                                                            [filterKey]: {
                                                                                                ...prev[filterKey],
                                                                                                org_type: value === 'all' ? undefined : value,
                                                                                                faculty_id: undefined, // Clear faculty when type changes
                                                                                                department_id: undefined, // Clear department when type changes
                                                                                            }
                                                                                        }));
                                                                                    }}
                                                                                >
                                                                                    <SelectTrigger className="h-9">
                                                                                        <SelectValue placeholder="All Types" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="all">All Types</SelectItem>
                                                                                        <SelectItem value="academic">Academic</SelectItem>
                                                                                        <SelectItem value="administrative">Administrative</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </div>
                                                                            
                                                                            {/* Faculty Filter (only for Academic) */}
                                                                            {orgType === 'academic' && (
                                                                                <div>
                                                                                    <Label className="text-xs text-muted-foreground mb-1">
                                                                                        Faculty <span className="text-destructive">*</span>
                                                                                    </Label>
                                                                                    <Select
                                                                                        value={filters.faculty_id || ''}
                                                                                        onValueChange={(value) => {
                                                                                            setPositionFilters(prev => ({
                                                                                                ...prev,
                                                                                                [filterKey]: {
                                                                                                    ...prev[filterKey],
                                                                                                    faculty_id: value || undefined,
                                                                                                    department_id: undefined, // Clear department when faculty changes
                                                                                                }
                                                                                            }));
                                                                                        }}
                                                                                    >
                                                                                        <SelectTrigger className="h-9">
                                                                                            <SelectValue placeholder="Select Faculty" />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {formOptions.faculties.map((faculty) => (
                                                                                                <SelectItem key={faculty.id} value={String(faculty.id)}>
                                                                                                    {faculty.name}
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                            )}
                                                                            
                                                                            {/* Department Filter (only for Academic, requires Faculty) */}
                                                                            {orgType === 'academic' && (
                                                                                <div>
                                                                                    <Label className="text-xs text-muted-foreground mb-1">
                                                                                        Department <span className="text-destructive">*</span>
                                                                                    </Label>
                                                                                    <Select
                                                                                        value={filters.department_id || ''}
                                                                                        onValueChange={(value) => {
                                                                                            setPositionFilters(prev => ({
                                                                                                ...prev,
                                                                                                [filterKey]: {
                                                                                                    ...prev[filterKey],
                                                                                                    department_id: value || undefined,
                                                                                                }
                                                                                            }));
                                                                                        }}
                                                                                        disabled={!filters.faculty_id}
                                                                                    >
                                                                                        <SelectTrigger className="h-9">
                                                                                            <SelectValue placeholder={filters.faculty_id ? "Select Department" : "Select Faculty first"} />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {filteredDepartments.length === 0 ? (
                                                                                                <SelectItem value="none" disabled>
                                                                                                    No departments available
                                                                                                </SelectItem>
                                                                                            ) : (
                                                                                                filteredDepartments.map((dept) => (
                                                                                                    <SelectItem key={dept.id} value={String(dept.id)}>
                                                                                                        {dept.name}{dept.faculty ? ` (${dept.faculty.name})` : ''}
                                                                                                    </SelectItem>
                                                                                                ))
                                                                                            )}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                            )}
                                                                            
                                                                            {/* Office Filter (only for Administrative) */}
                                                                            {orgType === 'administrative' && (
                                                                                <div>
                                                                                    <Label className="text-xs text-muted-foreground mb-1">
                                                                                        Office <span className="text-destructive">*</span>
                                                                                    </Label>
                                                                                    <Select
                                                                                        value={filters.department_id || ''}
                                                                                        onValueChange={(value) => {
                                                                                            setPositionFilters(prev => ({
                                                                                                ...prev,
                                                                                                [filterKey]: {
                                                                                                    ...prev[filterKey],
                                                                                                    department_id: value || undefined,
                                                                                                }
                                                                                            }));
                                                                                        }}
                                                                                    >
                                                                                        <SelectTrigger className="h-9">
                                                                                            <SelectValue placeholder="Select Office" />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {formOptions.offices.map((office) => (
                                                                                                <SelectItem key={office.id} value={String(office.id)}>
                                                                                                    {office.name}
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div>
                                                                        <Label className="text-sm font-medium text-foreground">Select position</Label>
                                                                        <Select
                                                                            value={
                                                                                approver.approver_position_id !== undefined && approver.approver_position_id !== null
                                                                                    ? String(approver.approver_position_id)
                                                                                    : undefined
                                                                            }
                                                                            onValueChange={(value) =>
                                                                                updateStepApprover(index, approverIndex, { approver_position_id: Number(value) })
                                                                            }
                                                                        >
                                                                            <SelectTrigger>
                                                                                <SelectValue placeholder="Choose position" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {filteredPositions.length === 0 ? (
                                                                                    <SelectItem value="none" disabled>
                                                                                        No positions found with selected filters
                                                                                    </SelectItem>
                                                                                ) : (
                                                                                    filteredPositions.map((position) => (
                                                                                        <SelectItem key={position.id} value={String(position.id)}>
                                                                                            {position.name}
                                                                                        </SelectItem>
                                                                                    ))
                                                                                )}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        {fieldError(
                                                                            `approval_steps.${index}.approvers.${approverIndex}.approver_position_id`,
                                                                        ) && (
                                                                            <p className="text-xs text-destructive">
                                                                                {fieldError(
                                                                                    `approval_steps.${index}.approvers.${approverIndex}.approver_position_id`,
                                                                                )}
                                                                            </p>
                                                                        )}
                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                            {requestType?.name === 'Leave Request' 
                                                                                ? "Approvers will be automatically selected from employees in this position within the requester's faculty and department."
                                                                                : "Approvers will be automatically selected from employees in this position within the requester's faculty and department, filtered by the training's allowed faculties and departments."
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            ))}

                                            <Button type="button" variant="outline" size="sm" onClick={() => addApproverToStep(index)}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add approver
                                            </Button>
                                            {fieldError(`approval_steps.${index}.approvers`) && (
                                                <p className="text-xs text-destructive">
                                                    {fieldError(`approval_steps.${index}.approvers`)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                        <Card className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-semibold text-foreground">Dynamic Form Fields</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Arrange fields in the exact order employees will see them. Use drag-and-drop to reorder.
                                    </p>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button type="button" variant="outline">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add field
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {formOptions.fieldTypes.map((fieldType) => (
                                            <DropdownMenuItem key={fieldType.value} onClick={() => addField(fieldType.value)}>
                                                <div>
                                                    <p className="text-sm font-medium">{fieldType.label}</p>
                                                    <p className="text-xs text-muted-foreground">{fieldType.description}</p>
                                                </div>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div
                                        key={field.clientKey}
                                        className="rounded-xl border p-4 shadow-sm"
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={handleDragOver}
                                        onDrop={() => handleDrop(index)}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <GripVertical className="h-4 w-4" />
                                                <span>Field {index + 1}</span>
                                                <Badge variant="outline">{fieldTypeLabel(field.field_type)}</Badge>
                                            </div>
                                            <div className="ml-auto flex items-center gap-3 text-sm">
                                                <label className="flex items-center gap-2 text-muted-foreground">
                                                    <Checkbox
                                                        checked={field.is_required}
                                                        onCheckedChange={(checked) =>
                                                            updateField(index, { is_required: Boolean(checked) })
                                                        }
                                                    />
                                                    Required
                                                </label>
                                                <button
                                                    type="button"
                                                    className="text-destructive transition hover:text-destructive/80"
                                                    onClick={() => removeField(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                                            <FloatingInput
                                                label="Field label"
                                                value={field.label}
                                                onChange={(event) => updateField(index, { label: event.target.value })}
                                                required
                                                error={fieldError(`fields.${index}.label`)}
                                            />

                                            <div>
                                                <Label className="text-sm font-medium text-foreground">Field type</Label>
                                                <Select
                                                    value={field.field_type}
                                                    onValueChange={(value: RequestFieldType) => updateField(index, { field_type: value })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {formOptions.fieldTypes.map((option) => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {fieldError(`fields.${index}.field_type`) && (
                                                    <p className="mt-1 text-xs text-destructive">
                                                        {fieldError(`fields.${index}.field_type`)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <Label className="text-sm font-medium text-foreground">Helper text / description</Label>
                                            <CustomTextarea
                                                className="mt-1 text-sm"
                                                value={field.description ?? ''}
                                                onChange={(event) => updateField(index, { description: event.target.value })}
                                            />
                                        </div>

                                        {['dropdown', 'radio'].includes(field.field_type) && (
                                            <div className="mt-4 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm font-medium text-foreground">Options</Label>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => addOption(index)}>
                                                        Add option
                                                    </Button>
                                                </div>
                                                <div className="space-y-3">
                                                    {(field.options ?? []).map((option, optionIndex) => (
                                                        <div key={`${field.clientKey}-option-${optionIndex}`} className="grid gap-3 md:grid-cols-2">
                                                            <Input
                                                                value={option.label}
                                                                onChange={(event) => updateOption(index, optionIndex, { label: event.target.value })}
                                                                placeholder="Label"
                                                            />
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    value={option.value}
                                                                    onChange={(event) =>
                                                                        updateOption(index, optionIndex, { value: event.target.value })
                                                                    }
                                                                    placeholder="Value"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => removeOption(index, optionIndex)}
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {fieldError(`fields.${index}.options`) && (
                                                    <p className="text-xs text-destructive">{fieldError(`fields.${index}.options`)}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>

                <div className="sticky bottom-0 left-0 right-0 z-10 border-t border-border bg-background/80 backdrop-blur">
                    <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-4">
                        <Button
                            type="submit"
                            disabled={processing}
                            className="min-w-[200px]"
                        >
                            {processing ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Request Type'}
                        </Button>
                    </div>
                </div>
            </form>
            </div>
        </AppLayout>
    );
}

