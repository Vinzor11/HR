import { CustomToast } from '@/components/custom-toast';
import { TableToolbar } from '@/components/table-toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TablePagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import type { RequestStatus } from '@/types/requests';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Calendar, ChevronRight, ClipboardList, Download, FileCheck2, Filter, Plus, UserCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface RequestSummary {
    id: number;
    reference_code: string;
    status: RequestStatus;
    submitted_at?: string | null;
    fulfilled_at?: string | null;
    created_at?: string | null;
    request_type: {
        id: number;
        name: string;
        has_fulfillment: boolean;
    } | null;
    user: {
        id: number;
        name: string;
        email: string;
        employee_id?: string | null;
        employee?: {
            id?: string | null;
            first_name?: string | null;
            middle_name?: string | null;
            surname?: string | null;
        } | null;
    };
    fulfillment?: {
        completed_at?: string | null;
    } | null;
}

interface Paginated<T> {
    data: T[];
    links: Array<{ label: string; url: string | null; active: boolean }>;
    from: number;
    to: number;
    total: number;
}

interface RequestIndexProps {
    submissions: Paginated<RequestSummary>;
    filters: {
        search?: string;
        status?: string;
        request_type_id?: number | null;
        scope?: string;
        perPage?: number;
        date_from?: string | null;
        date_to?: string | null;
    };
    requestTypes: Array<{ id: number; name: string; description?: string | null; is_published: boolean }>;
    statusOptions: RequestStatus[];
    scopeOptions: Array<{ value: string; label: string }>;
    canManage: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR Requests', href: '/requests' },
];

const statusBadgeStyles: Record<RequestStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    fulfillment: 'bg-sky-100 text-sky-800',
    completed: 'bg-indigo-100 text-indigo-800',
    rejected: 'bg-red-100 text-red-800',
};

const formatDate = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleString();
};

const formatDateHeading = (value?: string | null) => {
    const date = value ? new Date(value) : new Date();
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const formatEmployeeName = (user: RequestSummary['user']) => {
    const parts = [
        user?.employee?.first_name,
        user?.employee?.middle_name,
        user?.employee?.surname,
    ].filter(Boolean);
    return parts.length ? parts.join(' ') : user?.name;
};

const formatEmployeeId = (user: RequestSummary['user']) =>
    user?.employee?.id ?? user?.employee_id ?? '—';

export default function RequestsIndex({
    submissions,
    filters,
    requestTypes,
    statusOptions,
    scopeOptions,
    canManage,
}: RequestIndexProps) {
    const [searchTerm, setSearchTerm] = useState(filters?.search ?? '');
    const [status, setStatus] = useState(filters?.status ?? '');
    const [requestTypeId, setRequestTypeId] = useState(filters?.request_type_id ? String(filters.request_type_id) : '');
    const [scope, setScope] = useState(filters?.scope ?? 'mine');
    const [perPage, setPerPage] = useState(String(filters?.perPage ?? 10));
    const [dateFrom, setDateFrom] = useState(filters?.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters?.date_to ?? '');
    const [isSearching, setIsSearching] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    const triggerFetch = (params: Record<string, unknown> = {}) => {
        router.get(
            route('requests.index'),
            {
                search: searchTerm,
                status,
                request_type_id: requestTypeId,
                scope,
                perPage,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                ...params,
            },
            {
                preserveState: true,
                replace: true,
                preserveScroll: true,
                onStart: () => setIsSearching(true),
                onFinish: () => setIsSearching(false),
            },
        );
    };

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }
        searchTimeout.current = setTimeout(() => {
            triggerFetch({ search: value });
        }, 300);
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        triggerFetch({ perPage: value });
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);
        triggerFetch({ status: value });
    };

    const handleTypeFilterChange = (value: string) => {
        setRequestTypeId(value);
        triggerFetch({ request_type_id: value });
    };

    const handleScopeChange = (value: string) => {
        const nextScope = value === 'all' && !canManage ? 'mine' : value;
        setScope(nextScope);
        triggerFetch({ scope: nextScope });
    };

    const handleDateChange = (key: 'date_from' | 'date_to', value: string) => {
        if (key === 'date_from') {
            setDateFrom(value);
        } else {
            setDateTo(value);
        }
        triggerFetch({ [key]: value || undefined });
    };

    const handleExport = () => {
        const exportUrl = route('requests.export', {
            search: searchTerm || undefined,
            status: status || undefined,
            request_type_id: requestTypeId || undefined,
            scope,
            perPage,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        });
        window.location.href = exportUrl;
    };

    const startNewRequest = (typeId: number) => {
        router.get(route('requests.create', typeId));
    };

    useEffect(() => {
        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, []);

    const publishedTypes = useMemo(() => requestTypes.filter((type) => type.is_published), [requestTypes]);

    const summaryStats = useMemo(() => {
        const pending = submissions.data.filter((item) => item.status === 'pending').length;
        const fulfillment = submissions.data.filter((item) => item.status === 'fulfillment').length;
        const completed = submissions.data.filter((item) => item.status === 'completed' || item.status === 'approved').length;
        return { pending, fulfillment, completed };
    }, [submissions.data]);

    const groupedSubmissions = useMemo(() => {
        return submissions.data.reduce((acc, submission) => {
            const dateKey = formatDateHeading(submission.submitted_at || submission.fulfilled_at || submission.created_at);
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(submission);
            return acc;
        }, {} as Record<string, RequestSummary[]>);
    }, [submissions.data]);

    const sortedSubmissionDates = useMemo(() => {
        return Object.keys(groupedSubmissions).sort(
            (a, b) => new Date(b).getTime() - new Date(a).getTime()
        );
    }, [groupedSubmissions]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="HR Requests" />
            <CustomToast />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="space-y-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">HR Request Center</h1>
                        <p className="text-sm text-muted-foreground">
                            Submit new requests, monitor approvals, and track fulfillment — all in one place.
                        </p>
                    </div>

                    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                New Request
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Select Request Type</DialogTitle>
                                <DialogDescription>
                                    Choose a request type to start creating your request. Each type has specific fields and approval workflows.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-3 py-4">
                                {publishedTypes.length === 0 ? (
                                    <div className="rounded-lg border border-border bg-card p-6 text-center">
                                        <p className="text-sm text-muted-foreground">No published request types available yet.</p>
                                    </div>
                                ) : (
                                    publishedTypes.map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => {
                                                startNewRequest(type.id);
                                                setModalOpen(false);
                                            }}
                                            className="group rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 space-y-1">
                                                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                        {type.name}
                                                    </h3>
                                                    {type.description ? (
                                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                                            {type.description}
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground italic">
                                                            No description provided
                                                        </p>
                                                    )}
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="p-4 flex items-center gap-3">
                        <div className="rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Awaiting approval</p>
                            <p className="text-2xl font-semibold text-foreground">{summaryStats.pending}</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3">
                        <div className="rounded-full bg-sky-100 p-2 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                            <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">In fulfillment</p>
                            <p className="text-2xl font-semibold text-foreground">{summaryStats.fulfillment}</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3">
                        <div className="rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <FileCheck2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Completed</p>
                            <p className="text-2xl font-semibold text-foreground">{summaryStats.completed}</p>
                        </div>
                    </Card>
                </div>

                <Card className="space-y-4 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <TableToolbar
                            searchValue={searchTerm}
                            onSearchChange={handleSearchChange}
                            perPage={perPage}
                            onPerPageChange={handlePerPageChange}
                            isSearching={isSearching}
                            searchPlaceholder="Search by reference code, request type, or requester"
                            searchDescription="Try typing a reference code (REQ-001), request title, or employee name."
                            actionSlot={
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-muted-foreground" />
                                        <select
                                            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                                            value={status}
                                            onChange={(event) => handleStatusChange(event.target.value)}
                                        >
                                            <option value="">All statuses</option>
                                            {statusOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option.charAt(0).toUpperCase() + option.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <select
                                        className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                                        value={requestTypeId}
                                        onChange={(event) => handleTypeFilterChange(event.target.value)}
                                    >
                                        <option value="">All request types</option>
                                        {requestTypes.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                                        value={scope}
                                        onChange={(event) => handleScopeChange(event.target.value)}
                                    >
                                        {scopeOptions.map((option) => (
                                            <option key={option.value} value={option.value} disabled={option.value === 'all' && !canManage}>
                                                {option.label}
                                                {option.value === 'all' && !canManage ? ' (restricted)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From</span>
                                            <Input
                                                type="date"
                                                className="h-8 w-[140px] text-sm"
                                                value={dateFrom}
                                                onChange={(event) => handleDateChange('date_from', event.target.value)}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground">to</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">To</span>
                                            <Input
                                                type="date"
                                                className="h-8 w-[140px] text-sm"
                                                value={dateTo}
                                                onChange={(event) => handleDateChange('date_to', event.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {scope === 'all' && (
                                        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
                                            <Download className="h-4 w-4" />
                                            Export CSV
                                        </Button>
                                    )}
                                </div>
                            }
                        />
                    </div>

                    <div className="space-y-6">
                        {sortedSubmissionDates.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                                No requests match your filters yet.
                            </div>
                        ) : (
                            sortedSubmissionDates.map((dateKey) => (
                                <section key={dateKey} className="space-y-3">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {dateKey}
                                    </div>
                                    {groupedSubmissions[dateKey].map((submission) => {
                                        const requesterName = formatEmployeeName(submission.user);
                                        const requesterId = formatEmployeeId(submission.user);

                                        return (
                                            <div
                                                key={submission.id}
                                                className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition hover:border-primary/50"
                                            >
                                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <h3 className="text-base font-semibold text-foreground">
                                                                {submission.request_type?.name || 'Unknown Request Type'}
                                                            </h3>
                                                            <Badge className={statusBadgeStyles[submission.status]}>
                                                                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground">Ref: {submission.reference_code}</span>
                                                            {!submission.request_type && (
                                                                <Badge variant="destructive" className="text-xs">
                                                                    Request Type Deleted
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                Submitted {formatDate(submission.submitted_at || submission.created_at)}
                                                            </span>
                                                            <span>
                                                                Requester: {requesterName} ({requesterId})
                                                            </span>
                                                            {submission.fulfillment?.completed_at && (
                                                                <span>Completed {formatDate(submission.fulfillment.completed_at)}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => router.get(route('requests.show', submission.id))}
                                                        >
                                                            View details
                                                            <ChevronRight className="ml-1 h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </section>
                            ))
                        )}
                    </div>

                    {submissions.links && submissions.links.length > 0 && (
                        <TablePagination
                            meta={{
                                links: submissions.links,
                                from: submissions.from,
                                to: submissions.to,
                                total: submissions.total,
                            }}
                        />
                    )}
                </Card>
                </div>
            </div>
        </AppLayout>
    );
}

