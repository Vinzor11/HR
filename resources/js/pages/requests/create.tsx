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
import { useMemo } from 'react';

interface RequestCreateProps {
    requestType: RequestTypeResource;
}

const breadcrumbs = (requestType: RequestTypeResource): BreadcrumbItem[] => [
    { title: 'HR Requests', href: '/requests' },
    { title: requestType.name, href: route('requests.create', requestType.id) },
];

const buildInitialAnswers = (fields: RequestFieldDefinition[]) =>
    fields.reduce<Record<string, unknown>>((acc, field) => {
        if (field.field_type === 'checkbox') {
            acc[field.field_key ?? `field-${field.id}`] = false;
        } else {
            acc[field.field_key ?? `field-${field.id}`] = '';
        }
        return acc;
    }, {});

export default function RequestCreate({ requestType }: RequestCreateProps) {
    const { data, setData, post, processing, errors, reset } = useForm<{ answers: Record<string, unknown> }>({
        answers: buildInitialAnswers(requestType.fields),
    });

    const handleInputChange = (fieldKey: string, value: unknown) => {
        setData('answers', {
            ...data.answers,
            [fieldKey]: value,
        });
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
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

    const fieldError = (fieldKey: string) => (errors as Record<string, string | undefined>)[`answers.${fieldKey}`];

    const fieldKey = (field: RequestFieldDefinition) => field.field_key ?? `field-${field.id}`;

    const formPreviewDescription = useMemo(
        () =>
            requestType.description ??
            'Please complete all required details accurately. Attach supporting documents where applicable.',
        [requestType.description],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs(requestType)}>
            <Head title={`Submit ${requestType.name}`} />
            <CustomToast />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <form className="space-y-6" onSubmit={handleSubmit}>
                <Card className="p-5 space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary">
                                <Sparkles className="h-4 w-4" />
                                Dynamic Form
                            </div>
                            <h1 className="mt-2 text-2xl font-semibold text-foreground">{requestType.name}</h1>
                            <p className="text-sm text-muted-foreground">{formPreviewDescription}</p>
                        </div>
                        <Badge variant="outline" className="flex items-center gap-1">
                            <ShieldCheck className="h-4 w-4" />
                            {requestType.has_fulfillment ? 'Includes fulfillment' : 'Standard approval'}
                        </Badge>
                    </div>
                </Card>

                <Card className="p-5 space-y-6">
                    {requestType.fields.map((field) => {
                        const key = fieldKey(field);
                        const value = data.answers[key];
                        const error = fieldError(key);

                        if (['text', 'number', 'date'].includes(field.field_type)) {
                            return (
                                <div key={field.clientKey ?? key}>
                                    <FloatingInput
                                        label={field.label}
                                        type={field.field_type === 'text' ? 'text' : field.field_type}
                                        value={(value as string) ?? ''}
                                        onChange={(event) => handleInputChange(key, event.target.value)}
                                        required={field.is_required}
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
                                            {(field.options ?? []).map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
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

                <div className="flex items-center justify-between">
                    <Link href={route('requests.index')} className="text-sm text-muted-foreground hover:text-foreground">
                        Back to Request Center
                    </Link>
                    <Button type="submit" disabled={processing} className="min-w-[200px]">
                        {processing ? 'Submitting...' : 'Submit Request'}
                    </Button>
                </div>
            </form>
            </div>
        </AppLayout>
    );
}

