import { CustomToast, toast } from '@/components/custom-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CustomTextarea } from '@/components/ui/custom-textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { RequestSubmissionResource, RequestStatus } from '@/types/requests';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock4, Download, FileText, MessageSquare, ShieldAlert, Undo2 } from 'lucide-react';
import { TwoFactorVerifyDialog } from '@/components/two-factor-verify-dialog';
import { Require2FAPromptDialog } from '@/components/require-2fa-prompt-dialog';
import { useMemo, useState } from 'react';

interface ApprovalComment {
    id: number;
    content: string;
    type: string;
    is_internal: boolean;
    created_at: string | null;
    user: {
        id: number;
        name: string;
    } | null;
}

interface RequestShowProps {
    submission: RequestSubmissionResource & {
        comments?: ApprovalComment[];
        withdrawn_at?: string | null;
        withdrawal_reason?: string | null;
    };
    can: {
        approve: boolean;
        reject: boolean;
        fulfill: boolean;
        withdraw?: boolean;
        comment?: boolean;
        internal_comment?: boolean;
    };
    downloadRoutes: {
        fulfillment: string | null;
    };
}

const breadcrumbs = (submission: RequestSubmissionResource): BreadcrumbItem[] => [
    { title: 'HR Requests', href: '/requests' },
    { title: submission.reference_code, href: route('requests.show', submission.id) },
];

const statusBadgeStyles: Record<RequestStatus | 'withdrawn', string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    fulfillment: 'bg-sky-100 text-sky-800',
    completed: 'bg-indigo-100 text-indigo-800',
    rejected: 'bg-red-100 text-red-800',
    withdrawn: 'bg-gray-100 text-gray-800',
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

const formatShortDate = (value?: string | null) => {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: APP_TIMEZONE,
    }).format(date);
};

export default function RequestShow({ submission, can, downloadRoutes }: RequestShowProps) {
    const page = usePage<{ auth?: { user?: { two_factor_enabled?: boolean } } }>();
    const twoFactorEnabled = page.props.auth?.user?.two_factor_enabled ?? false;

    const approvalForm = useForm<{ notes: string }>({ notes: '' });
    const rejectionForm = useForm<{ notes: string }>({ notes: '' });
    const fulfillmentForm = useForm<{ file: File | null; notes: string }>({ file: null, notes: '' });
    const withdrawForm = useForm<{ reason: string }>({ reason: '' });
    const commentForm = useForm<{ content: string; is_internal: boolean }>({ content: '', is_internal: false });
    
    const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
    const [show2FAApproveDialog, setShow2FAApproveDialog] = useState(false);
    const [showRequire2FAApproveDialog, setShowRequire2FAApproveDialog] = useState(false);

    const submitApprove = (twoFactorCode?: string) => {
        const data: Record<string, string> = { notes: approvalForm.data.notes };
        if (twoFactorCode) data.two_factor_code = twoFactorCode;
        if (twoFactorCode) {
            router.post(route('requests.approve', submission.id), data, {
                preserveScroll: true,
                onSuccess: () => {
                    approvalForm.reset();
                    setShow2FAApproveDialog(false);
                    toast.success('Request approved.');
                },
                onError: () => toast.error('Unable to approve at this time.'),
            });
        } else {
            approvalForm.post(route('requests.approve', submission.id), {
                preserveScroll: true,
                onSuccess: () => {
                    approvalForm.reset();
                    toast.success('Request approved.');
                },
                onError: () => toast.error('Unable to approve at this time.'),
            });
        }
    };

    const handleApprove = () => {
        if (approvalForm.processing) {
            return;
        }
        if (!twoFactorEnabled) {
            setShowRequire2FAApproveDialog(true);
            return;
        }
        setShow2FAApproveDialog(true);
    };

    const handle2FAApproveVerify = (code: string) => {
        submitApprove(code);
    };

    const handleReject = () => {
        if (rejectionForm.processing) {
            return;
        }
        
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
        if (fulfillmentForm.processing) {
            return;
        }
        
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

    const handleWithdraw = () => {
        if (withdrawForm.processing) {
            return;
        }
        
        withdrawForm.post(route('requests.withdraw', submission.id), {
            preserveScroll: true,
            onSuccess: () => {
                withdrawForm.reset();
                setShowWithdrawConfirm(false);
                toast.success('Request has been withdrawn.');
            },
            onError: () => toast.error('Unable to withdraw request.'),
        });
    };

    const handleAddComment = () => {
        if (commentForm.processing || !commentForm.data.content.trim()) {
            return;
        }
        
        commentForm.post(route('requests.comment', submission.id), {
            preserveScroll: true,
            onSuccess: () => {
                commentForm.reset();
                toast.success('Comment added.');
            },
            onError: () => toast.error('Unable to add comment.'),
        });
    };

    const currentStatusLabel = submission.status.charAt(0).toUpperCase() + submission.status.slice(1);

    const timeline = useMemo(
        () =>
            submission.approval.actions.map((action: any) => {
                let label = 'Approver';
                
                const positionName = action.approver_position?.pos_name 
                    ?? action.approver?.position?.pos_name 
                    ?? null;
                
                const userName = action.approver?.name ?? action.approver_name ?? null;
                
                if (positionName && userName) {
                    label = `${positionName} (${userName})`;
                } else if (positionName) {
                    label = positionName;
                } else if (action.approver_role?.label || action.approver_role?.name) {
                    const roleName = action.approver_role.label ?? action.approver_role.name;
                    label = userName ? `${roleName} (${userName})` : roleName;
                } else if (userName) {
                    label = userName;
                }
                
                return {
                    id: action.id,
                    label,
                    status: action.status,
                    notes: action.notes,
                    acted_at: action.acted_at,
                    due_at: action.due_at,
                    is_overdue: action.is_overdue,
                    is_escalated: action.is_escalated,
                    escalated_from: action.escalated_from,
                    delegated_from: action.delegated_from,
                    approval_mode: action.approval_mode,
                };
            }),
        [submission.approval.actions],
    );

    const comments = submission.comments ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs(submission)}>
            <Head title={`Request ${submission.reference_code}`} />
            <CustomToast />

            <div className="flex h-full flex-1 flex-col gap-3 md:gap-4 rounded-xl p-3 md:p-4 pb-20 sm:pb-4">
                <div className="space-y-4 md:space-y-6">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <Link href={route('requests.index')} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            Back to all requests
                        </Link>
                        <div className="flex items-center gap-2">
                            <Badge className={statusBadgeStyles[submission.status as keyof typeof statusBadgeStyles]}>{currentStatusLabel}</Badge>
                            {can.withdraw && (
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setShowWithdrawConfirm(true)}
                                >
                                    <Undo2 className="mr-2 h-4 w-4" />
                                    Withdraw
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Withdrawal Confirmation */}
                    {showWithdrawConfirm && (
                        <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <h3 className="font-medium text-foreground">Withdraw this request?</h3>
                                        <p className="text-sm text-muted-foreground">
                                            This action cannot be undone. The request will be marked as withdrawn.
                                        </p>
                                    </div>
                                    <CustomTextarea
                                        className="text-sm"
                                        placeholder="Reason for withdrawal (optional)"
                                        value={withdrawForm.data.reason}
                                        onChange={(e) => withdrawForm.setData('reason', e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => setShowWithdrawConfirm(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            variant="destructive" 
                                            size="sm"
                                            onClick={handleWithdraw}
                                            disabled={withdrawForm.processing}
                                        >
                                            Confirm Withdrawal
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Withdrawn Notice */}
                    {submission.status === 'withdrawn' && (
                        <Card className="p-4 border-gray-200 bg-gray-50 dark:bg-gray-950/20">
                            <div className="flex items-start gap-3">
                                <Undo2 className="h-5 w-5 text-gray-600 mt-0.5" />
                                <div>
                                    <h3 className="font-medium text-foreground">Request Withdrawn</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Withdrawn on {formatDate(submission.withdrawn_at)}
                                    </p>
                                    {submission.withdrawal_reason && (
                                        <p className="text-sm text-foreground mt-1">
                                            Reason: {submission.withdrawal_reason}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-xl md:text-2xl font-semibold text-foreground">Request Details</h1>
                            <p className="text-xs md:text-sm text-muted-foreground">
                                View request information and track approval status.
                            </p>
                        </div>
                    </div>

                <Card className="grid gap-4 p-4 sm:p-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
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

                <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <Card className="p-4 sm:p-5 md:col-span-2 space-y-4">
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

                        {/* Comments Section */}
                        {can.comment && (
                            <div className="border-t pt-4 space-y-4">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                                    <MessageSquare className="h-4 w-4" />
                                    Comments ({comments.length})
                                </div>

                                {comments.length > 0 && (
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {comments.map((comment) => (
                                            <div 
                                                key={comment.id} 
                                                className={`rounded-lg border p-3 text-sm ${
                                                    comment.is_internal 
                                                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200' 
                                                        : 'bg-card'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-medium text-foreground">
                                                        {comment.user?.name ?? 'System'}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {comment.is_internal && (
                                                            <Badge variant="outline" className="text-xs">Internal</Badge>
                                                        )}
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatShortDate(comment.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-foreground">{comment.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <CustomTextarea
                                        className="text-sm"
                                        placeholder="Add a comment..."
                                        value={commentForm.data.content}
                                        onChange={(e) => commentForm.setData('content', e.target.value)}
                                    />
                                    <div className="flex items-center justify-between">
                                        {can.internal_comment && (
                                            <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Checkbox
                                                    checked={commentForm.data.is_internal}
                                                    onCheckedChange={(checked) => commentForm.setData('is_internal', Boolean(checked))}
                                                />
                                                Internal note (not visible to requester)
                                            </label>
                                        )}
                                        <Button 
                                            type="button" 
                                            size="sm"
                                            onClick={handleAddComment}
                                            disabled={commentForm.processing || !commentForm.data.content.trim()}
                                        >
                                            Add Comment
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
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
                                        <div key={item.id} className={`rounded-lg border p-3 text-sm ${
                                            item.is_overdue && item.status === 'pending'
                                                ? 'border-red-200 bg-red-50 dark:bg-red-950/20'
                                                : 'border-border bg-card'
                                        }`}>
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
                                                <p className="text-xs text-muted-foreground">
                                                    Pending approval
                                                    {item.due_at && (
                                                        <span className={item.is_overdue ? ' text-red-600 font-medium' : ''}>
                                                            {item.is_overdue ? ' (OVERDUE)' : ` • Due ${formatShortDate(item.due_at)}`}
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                            {item.is_escalated && item.escalated_from && (
                                                <p className="text-xs text-amber-600 mt-1">
                                                    Escalated from {item.escalated_from.name}
                                                </p>
                                            )}
                                            {item.delegated_from && (
                                                <p className="text-xs text-blue-600 mt-1">
                                                    Acting on behalf of {item.delegated_from.name}
                                                </p>
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

            {/* 2FA required (user has no 2FA) */}
            <Require2FAPromptDialog
                open={showRequire2FAApproveDialog}
                onOpenChange={setShowRequire2FAApproveDialog}
                description="To approve requests you must enable two-factor authentication (2FA). You can set it up now in just a few steps."
                actionLabel="Let's go"
            />

            {/* 2FA verification for approve */}
            <TwoFactorVerifyDialog
                open={show2FAApproveDialog}
                onOpenChange={setShow2FAApproveDialog}
                onVerify={handle2FAApproveVerify}
                title="Verify to approve request"
                description="Enter your 6-digit verification code to confirm approval of this request."
                verifyButtonLabel="Verify and approve"
                processing={approvalForm.processing}
            />
        </AppLayout>
    );
}
