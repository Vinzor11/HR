import { CustomToast, toast } from '@/components/custom-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CustomTextarea } from '@/components/ui/custom-textarea';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { RequestSubmissionResource, RequestStatus } from '@/types/requests';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Clock4, Download, FileText, ShieldAlert } from 'lucide-react';
import { useMemo } from 'react';

interface RequestShowProps {
    submission: RequestSubmissionResource;
    can: {
        approve: boolean;
        reject: boolean;
        fulfill: boolean;
    };
    downloadRoutes: {
        fulfillment: string | null;
    };
}

const breadcrumbs = (submission: RequestSubmissionResource): BreadcrumbItem[] => [
    { title: 'HR Requests', href: '/requests' },
    { title: submission.reference_code, href: route('requests.show', submission.id) },
];

const statusBadgeStyles: Record<RequestStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    fulfillment: 'bg-sky-100 text-sky-800',
    completed: 'bg-indigo-100 text-indigo-800',
    rejected: 'bg-red-100 text-red-800',
};

const APP_TIMEZONE =
    (typeof window !== 'undefined' && (window as any)?.appTimezone) || 'Asia/Manila';

const formatDate = (value?: string | null) => {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: APP_TIMEZONE,
        timeZoneName: 'short',
    }).format(date);
};

export default function RequestShow({ submission, can, downloadRoutes }: RequestShowProps) {
    const approvalForm = useForm<{ notes: string }>({ notes: '' });
    const rejectionForm = useForm<{ notes: string }>({ notes: '' });
    const fulfillmentForm = useForm<{ file: File | null; notes: string }>({ file: null, notes: '' });

    const handleApprove = () => {
        approvalForm.post(route('requests.approve', submission.id), {
            preserveScroll: true,
            onSuccess: () => {
                approvalForm.reset();
                toast.success('Request approved.');
            },
            onError: () => toast.error('Unable to approve at this time.'),
        });
    };

    const handleReject = () => {
        rejectionForm.post(route('requests.reject', submission.id), {
            preserveScroll: true,
            onSuccess: () => {
                rejectionForm.reset();
                toast.success('Request rejected.');
            },
            onError: () => toast.error('Please provide a rejection note.'),
        });
    };

    const handleFulfill = () => {
        fulfillmentForm.post(route('requests.fulfill', submission.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                fulfillmentForm.reset();
                toast.success('Fulfillment uploaded and requester notified.');
            },
            onError: () => toast.error('Please attach the final document.'),
        });
    };

    const currentStatusLabel = submission.status.charAt(0).toUpperCase() + submission.status.slice(1);

    const timeline = useMemo(
        () =>
            submission.approval.actions.map((action) => {
                let label = 'Approver';
                
                // Get the position name - prefer from approver_position, then from approver.employee.position
                const positionName = action.approver_position?.pos_name 
                    ?? action.approver?.position?.pos_name 
                    ?? null;
                
                // Get the user's full name
                const userName = action.approver?.name ?? action.approver_name ?? null;
                
                // Format: "Position (Fullname)" - similar to training requests
                if (positionName && userName) {
                    label = `${positionName} (${userName})`;
                } else if (positionName) {
                    label = positionName;
                } else if (action.approver_role?.label || action.approver_role?.name) {
                    // Fallback to role if no position available
                    const roleName = action.approver_role.label ?? action.approver_role.name;
                    label = userName ? `${roleName} (${userName})` : roleName;
                } else if (userName) {
                    // Fallback to just name if no position or role
                    label = userName;
                }
                
                return {
                    id: action.id,
                    label,
                    status: action.status,
                    notes: action.notes,
                    acted_at: action.acted_at,
                };
            }),
        [submission.approval.actions],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs(submission)}>
            <Head title={`Request ${submission.reference_code}`} />
            <CustomToast />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Link href={route('requests.index')} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to all requests
                    </Link>
                    <Badge className={statusBadgeStyles[submission.status]}>{currentStatusLabel}</Badge>
                </div>

                <Card className="grid gap-4 p-5 md:grid-cols-3">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Reference</p>
                        <p className="text-lg font-semibold text-foreground">{submission.reference_code}</p>
                        <p className="text-sm text-muted-foreground">
                            {submission.request_type?.name || 'Unknown Request Type (Deleted)'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Requester</p>
                        <p className="text-lg font-semibold text-foreground">{submission.requester.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                            Employee ID: {submission.requester.employee_id ?? '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Timeline</p>
                        <p className="text-sm text-muted-foreground">Submitted: {formatDate(submission.submitted_at)}</p>
                        <p className="text-sm text-muted-foreground">Fulfilled: {formatDate(submission.fulfilled_at)}</p>
                    </div>
                </Card>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="p-5 md:col-span-2 space-y-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            Submitted details
                        </div>

                        <div className="space-y-4">
                            {submission.fields.map((field) => (
                                <div key={field.id} className="rounded-xl border border-border bg-card p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium text-foreground">{field.label}</p>
                                        <Badge variant="outline">{field.field_type}</Badge>
                                    </div>

                                    {field.field_type === 'file' && field.download_url ? (
                                        <Button className="mt-3" variant="outline" size="sm" asChild>
                                            <a
                                                href={field.download_url}
                                                download={field.value_json?.original_name ?? field.label}
                                            >
                                                <Download className="mr-2 h-4 w-4" />
                                                Download attachment
                                            </a>
                                        </Button>
                                    ) : (
                                        <p className="mt-2 text-sm text-foreground">
                                            {typeof field.value === 'boolean' ? (field.value ? 'Yes' : 'No') : (field.value as string) || '—'}
                                        </p>
                                    )}

                                    {field.description && <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>}
                                </div>
                            ))}
                        </div>
                    </Card>

                    <div className="space-y-4">
                        <Card className="p-5 space-y-4">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                                <Clock4 className="h-4 w-4" />
                                Approval timeline
                            </div>

                            <div className="space-y-3">
                                {timeline.length === 0 ? (
                                    <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
                                        <p>No approval steps configured for this request type.</p>
                                    </div>
                                ) : (
                                    timeline.map((item) => (
                                        <div key={item.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium text-foreground">{item.label}</p>
                                                <Badge
                                                    className={
                                                        item.status === 'approved'
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                            : item.status === 'rejected'
                                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                                    }
                                                >
                                                    {item.status}
                                                </Badge>
                                            </div>
                                            {item.acted_at ? (
                                                <p className="text-xs text-muted-foreground">Updated {formatDate(item.acted_at)}</p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">Pending approval</p>
                                            )}
                                            {item.notes && <p className="mt-2 text-sm text-foreground">{item.notes}</p>}
                                        </div>
                                    ))
                                )}
                            </div>

                            {(can.approve || can.reject) && (
                                <div className="space-y-2">
                                    <CustomTextarea
                                        className="text-sm"
                                        placeholder="Add optional approval notes..."
                                        value={approvalForm.data.notes}
                                        onChange={(event) => {
                                            approvalForm.setData('notes', event.target.value);
                                            rejectionForm.setData('notes', event.target.value);
                                        }}
                                    />
                                    {(approvalForm.errors.notes || rejectionForm.errors.notes) && (
                                        <p className="text-xs text-destructive">
                                            {approvalForm.errors.notes ?? rejectionForm.errors.notes}
                                        </p>
                                    )}
                                    <div className="flex gap-2">
                                        {can.approve && (
                                            <Button type="button" className="flex-1" onClick={handleApprove} disabled={approvalForm.processing}>
                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                Approve
                                            </Button>
                                        )}
                                        {can.reject && (
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                className="flex-1"
                                                onClick={handleReject}
                                                disabled={rejectionForm.processing}
                                            >
                                                <ShieldAlert className="mr-2 h-4 w-4" />
                                                Reject
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Card>

                        <Card className="p-5 space-y-4">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                                <Download className="h-4 w-4" />
                                Fulfillment
                            </div>

                            {submission.fulfillment ? (
                                <div className="space-y-2 text-sm text-foreground">
                                    <p>Completed {formatDate(submission.fulfillment.completed_at)}</p>
                                    {submission.fulfillment.notes && <p className="text-muted-foreground">{submission.fulfillment.notes}</p>}
                                    {submission.fulfillment.file_url && downloadRoutes.fulfillment && (
                                        <Button asChild variant="outline" size="sm" className="mt-2">
                                            <a href={downloadRoutes.fulfillment}>
                                                <Download className="mr-2 h-4 w-4" />
                                                Download deliverable
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            ) : can.fulfill ? (
                                <div className="space-y-3">
                                    <Input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                        onChange={(event) => fulfillmentForm.setData('file', event.target.files?.[0] ?? null)}
                                    />
                                    <CustomTextarea
                                        className="text-sm"
                                        placeholder="Notes (optional)"
                                        value={fulfillmentForm.data.notes}
                                        onChange={(event) => fulfillmentForm.setData('notes', event.target.value)}
                                    />
                                    <Button type="button" onClick={handleFulfill} disabled={fulfillmentForm.processing}>
                                        Mark as completed
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Fulfillment will be available after approvals.</p>
                            )}
                        </Card>
                    </div>
                </div>
                </div>
            </div>
        </AppLayout>
    );
}

