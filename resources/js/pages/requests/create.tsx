import { CustomToast, toast } from '@/components/custom-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CustomTextarea } from '@/components/ui/custom-textarea';
import { FloatingInput } from '@/components/ui/floating-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { RequestFieldDefinition, RequestTypeResource } from '@/types/requests';
import { Head, Link, useForm } from '@inertiajs/react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { useMemo, useCallback } from 'react';

interface LeaveBalance {
    code: string;
    balance: number;
    entitled: number;
    used: number;
    pending: number;
}

interface RequestCreateProps {
    requestType: RequestTypeResource & { prefill_answers?: Record<string, unknown> };
    leaveBalances?: Record<string, LeaveBalance>;
}

const breadcrumbs = (requestType: RequestTypeResource): BreadcrumbItem[] => [
    { title: 'HR Requests', href: '/requests' },
    { title: requestType.name, href: route('requests.create', requestType.id) },
];

const buildInitialAnswers = (fields: RequestFieldDefinition[], prefill?: Record<string, unknown>) =>
    fields.reduce<Record<string, unknown>>((acc, field) => {
        const key = field.field_key ?? `field-${field.id}`;
        const defaultValue = prefill && prefill[key] !== undefined ? prefill[key] : undefined;

        if (field.field_type === 'checkbox') {
            acc[key] = typeof defaultValue === 'boolean' ? defaultValue : false;
        } else {
            acc[key] = defaultValue ?? '';
        }
        return acc;
    }, {});

export default function RequestCreate({ requestType, leaveBalances = {} }: RequestCreateProps) {
    const { data, setData, post, processing, errors, reset } = useForm<{ answers: Record<string, unknown> }>({
        answers: buildInitialAnswers(requestType.fields, requestType.prefill_answers),
    });

    const handleInputChange = (fieldKey: string, value: unknown) => {
        setData('answers', {
            ...data.answers,
            [fieldKey]: value,
        });
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        // Prevent double submission - check if already processing
        if (processing) {
            return;
        }
        
        post(route('requests.store', requestType.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Request submitted successfully.');
                reset();
            },
            onError: () => toast.error('Please fix the highlighted errors.'),
        });
    };

    const fieldError = (fieldKey: string) => {
        const raw = (errors as Record<string, string | undefined>)[`answers.${fieldKey}`];
        return typeof raw === 'string' && raw.trim().length > 0 ? raw : undefined;
    };

    const fieldKey = (field: RequestFieldDefinition) => field.field_key ?? `field-${field.id}`;

    const selectedLeaveType = data.answers?.leave_type as string | undefined;

    const readOnlyKeys = useMemo(
        () => new Set(['employee_name', 'department_office', 'position_title', 'salary', 'date_of_filing']),
        [],
    );

    const shouldShowField = useCallback(
        (field: RequestFieldDefinition) => {
            const key = fieldKey(field);

            // Always show core/common fields
            const always = [
                'leave_type',
                'start_date',
                'end_date',
                'total_days',
                'reason',
                'contact_number',
                'contact_address',
                'declaration',
            ];
            if (always.includes(key)) return true;

            // Hide conditional fields until leave type is selected
            if (!selectedLeaveType) return false;

            // Conditional visibility by leave type (CS Form No. 6)
            switch (key) {
                case 'other_leave_specify':
                    return selectedLeaveType === 'OTHER';
                case 'leave_location':
                case 'location_details':
                    // Vacation, Special Privilege, Forced Leave
                    return ['VL', 'SPL', 'FL'].includes(selectedLeaveType);
                case 'sick_leave_type':
                case 'illness_description':
                    return selectedLeaveType === 'SL';
                case 'women_special_illness':
                    return selectedLeaveType === 'WSL';
                case 'study_leave_type':
                case 'study_leave_details':
                    return selectedLeaveType === 'Study';
                case 'other_purpose_type':
                    // Monetization / Terminal leave choices
                    return ['TL', 'OTHER'].includes(selectedLeaveType);
                case 'commutation_requested':
                    // Relevant for VL/SL and monetization/terminal requests
                    return ['VL', 'SL', 'OTHER'].includes(selectedLeaveType);
                case 'medical_certificate':
                    // Only for sick leave or medically justified leaves
                    return ['SL', 'WSL', 'ML', 'VAWC', 'Rehab'].includes(selectedLeaveType);
                case 'supporting_documents':
                    // Show only for leaves that typically need attachments
                    return ['ML', 'PL', 'SoloP', 'VAWC', 'Study', 'Rehab', 'CL', 'Adopt', 'OTHER'].includes(
                        selectedLeaveType,
                    );
                default:
                    return true;
            }
        },
        [selectedLeaveType],
    );

    const formPreviewDescription = useMemo(
        () =>
            requestType.description ??
            'Please complete all required details accurately. Attach supporting documents where applicable.',
        [requestType.description],
    );

    // Helper function to safely get numeric balance value
    const getBalanceValue = useCallback((balance: LeaveBalance | undefined): number => {
        if (!balance || balance.balance === undefined || balance.balance === null) {
            return 0;
        }
        const value = typeof balance.balance === 'number' ? balance.balance : parseFloat(String(balance.balance)) || 0;
        return value;
    }, []);

    // Check if a leave type option should be disabled based on balance
    const isLeaveTypeDisabled = useCallback(
        (leaveTypeCode: string): boolean => {
            // If no leave balances provided, allow all options (fallback)
            if (!leaveBalances || Object.keys(leaveBalances).length === 0) {
                return false;
            }

            // Special leaves that don't require balances (granted on-demand)
            const specialLeavesWithoutBalance = ['ML', 'PL', 'VAWC', 'WSL', 'Study', 'Rehab', 'Adopt', 'CL', 'OTHER'];
            if (specialLeavesWithoutBalance.includes(leaveTypeCode)) {
                return false; // These are granted on-demand, not based on balance
            }

            // Forced Leave (FL) uses Vacation Leave (VL) credits
            if (leaveTypeCode === 'FL') {
                const vlBalance = leaveBalances['VL'];
                const balanceValue = getBalanceValue(vlBalance);
                return !vlBalance || balanceValue <= 0;
            }

            // Credit-based leaves (VL, SL) require balance
            if (leaveTypeCode === 'VL' || leaveTypeCode === 'SL') {
                const balance = leaveBalances[leaveTypeCode];
                const balanceValue = getBalanceValue(balance);
                return !balance || balanceValue <= 0;
            }

            // Special Privilege Leave (SPL), Solo Parent (SoloP) may have fixed entitlements
            if (leaveTypeCode === 'SPL' || leaveTypeCode === 'SoloP') {
                const balance = leaveBalances[leaveTypeCode];
                // Disable only if balance exists and is 0 or less
                if (balance !== undefined) {
                    const balanceValue = getBalanceValue(balance);
                    return balanceValue <= 0;
                }
                // If balance not found, allow it (may be granted on-demand)
                return false;
            }

            // Default: allow if balance exists and is > 0, otherwise check if it's a special leave
            const balance = leaveBalances[leaveTypeCode];
            if (balance !== undefined) {
                const balanceValue = getBalanceValue(balance);
                return balanceValue <= 0;
            }

            // If balance not found, allow it (may be a special leave granted on-demand)
            return false;
        },
        [leaveBalances, getBalanceValue],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs(requestType)}>
            <Head title={`Submit ${requestType.name}`} />
            <CustomToast />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-2 sm:p-4">
                <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
                <Card className="p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary">
                                <Sparkles className="h-4 w-4" />
                                Dynamic Form
                            </div>
                            <h1 className="mt-2 text-xl sm:text-2xl font-semibold text-foreground">{requestType.name}</h1>
                            <p className="text-xs sm:text-sm text-muted-foreground">{formPreviewDescription}</p>
                        </div>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-xs sm:text-sm">{requestType.has_fulfillment ? 'Includes fulfillment' : 'Standard approval'}</span>
                        </Badge>
                    </div>
                </Card>

                <Card className="p-4 sm:p-5 space-y-4 sm:space-y-6">
                    {requestType.fields.map((field) => {
                        if (!shouldShowField(field)) {
                            return null;
                        }

                        const key = fieldKey(field);
                        const value = data.answers[key];
                        const error = fieldError(key);

                        const isReadOnly = readOnlyKeys.has(key);

                        if (['text', 'number', 'date'].includes(field.field_type)) {
                            return (
                                <div key={field.clientKey ?? key}>
                                    <FloatingInput
                                        label={field.label}
                                        type={field.field_type === 'text' ? 'text' : field.field_type}
                                        value={(value as string) ?? ''}
                                        onChange={(event) => handleInputChange(key, event.target.value)}
                                        required={field.is_required}
                                        disabled={isReadOnly}
                                        helperText={field.description ?? undefined}
                                        error={error}
                                    />
                                </div>
                            );
                        }

                        if (field.field_type === 'textarea') {
                            return (
                                <div key={field.clientKey ?? key} className="space-y-2">
                                    <Label className="text-sm font-medium text-foreground">
                                        {field.label} {field.is_required && <span className="text-destructive">*</span>}
                                    </Label>
                                    <CustomTextarea
                                        className="min-h-[120px]"
                                        value={(value as string) ?? ''}
                                        onChange={(event) => handleInputChange(key, event.target.value)}
                                    />
                                    {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
                                    {error && <p className="text-xs text-destructive">{error}</p>}
                                </div>
                            );
                        }

                        if (field.field_type === 'checkbox') {
                            return (
                                <label
                                    key={field.clientKey ?? key}
                                    className="flex items-start gap-3 rounded-lg border border-dashed border-border p-4 hover:border-primary/50"
                                >
                                    <Checkbox
                                        checked={Boolean(value)}
                                        onCheckedChange={(checked) => handleInputChange(key, Boolean(checked))}
                                    />
                                    <span>
                                        <span className="font-medium text-foreground">{field.label}</span>
                                        {field.description && <p className="text-sm text-muted-foreground">{field.description}</p>}
                                        {error && <p className="text-xs text-destructive">{error}</p>}
                                    </span>
                                </label>
                            );
                        }

                        if (field.field_type === 'dropdown') {
                            // Special handling for leave_type field to disable options with no balance
                            const isLeaveTypeField = key === 'leave_type';
                            
                            return (
                                <div key={field.clientKey ?? key} className="space-y-2">
                                    <Label className="text-sm font-medium text-foreground">
                                        {field.label} {field.is_required && <span className="text-destructive">*</span>}
                                    </Label>
                                    <Select
                                        value={(value as string) ?? ''}
                                        onValueChange={(option) => handleInputChange(key, option)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(field.options ?? []).map((option) => {
                                                const isDisabled = isLeaveTypeField ? isLeaveTypeDisabled(option.value) : false;
                                                const balance = isLeaveTypeField && leaveBalances?.[option.value];
                                                const balanceValue = balance?.balance ?? 0;
                                                const balanceNum = typeof balanceValue === 'number' ? balanceValue : parseFloat(String(balanceValue)) || 0;
                                                const balanceText = balance !== undefined ? ` (Balance: ${balanceNum.toFixed(2)} days)` : '';
                                                
                                                return (
                                                    <SelectItem 
                                                        key={option.value} 
                                                        value={option.value}
                                                        disabled={isDisabled}
                                                        className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                                                    >
                                                        {option.label}
                                                        {isLeaveTypeField && balance !== undefined && (
                                                            <span className="text-xs text-muted-foreground ml-1">
                                                                {balanceText}
                                                            </span>
                                                        )}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                    {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
                                    {isLeaveTypeField && Object.keys(leaveBalances).length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Leave types with zero balance are disabled. Special leaves (ML, PL, VAWC, etc.) are granted on-demand and may not require balance.
                                        </p>
                                    )}
                                    {error && <p className="text-xs text-destructive">{error}</p>}
                                </div>
                            );
                        }

                        if (field.field_type === 'radio') {
                            return (
                                <div key={field.clientKey ?? key} className="space-y-1.5">
                                    <Label className="text-sm font-medium text-foreground">
                                        {field.label} {field.is_required && <span className="text-destructive">*</span>}
                                    </Label>
                                    <RadioGroup
                                        options={(field.options ?? []).map((option) => ({
                                            value: option.value,
                                            label: option.label,
                                        }))}
                                        value={(value as string) ?? ''}
                                        onChange={(option) => handleInputChange(key, option)}
                                        error={error}
                                    />
                                    {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
                                </div>
                            );
                        }

                        if (field.field_type === 'file') {
                            return (
                                <div key={field.clientKey ?? key} className="space-y-2">
                                    <Label className="text-sm font-medium text-foreground">
                                        {field.label} {field.is_required && <span className="text-destructive">*</span>}
                                    </Label>
                                    <Input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                        onChange={(event) => handleInputChange(key, event.target.files?.[0] ?? null)}
                                    />
                                    {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
                                    {error && <p className="text-xs text-destructive">{error}</p>}
                                </div>
                            );
                        }

                        return null;
                    })}
                </Card>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between pb-16 sm:pb-0">
                    <Link href={route('requests.index')} className="text-sm text-muted-foreground hover:text-foreground text-center sm:text-left">
                        Back to Request Center
                    </Link>
                    <Button type="submit" disabled={processing} className="w-full sm:w-auto sm:min-w-[200px]">
                        {processing ? 'Submitting...' : 'Submit Request'}
                    </Button>
                </div>
            </form>
            </div>
        </AppLayout>
    );
}

