import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText } from 'lucide-react';
import { TablePagination } from '@/components/ui/pagination';
import { useMemo } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Leave History', href: '/leaves/history' },
];

interface LeaveType {
    id: number;
    name: string;
    code?: string;
}

interface LeaveRequest {
    id: number;
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
    status: string;
    approved_at?: string;
    approved_by?: { name: string };
    rejected_at?: string;
    rejected_by?: { name: string };
    rejection_reason?: string;
}

interface HistoryPageProps {
    requests: {
        data: LeaveRequest[];
        links?: any[];
        meta?: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
        };
        from?: number;
        to?: number;
        total?: number;
        current_page?: number;
        last_page?: number;
        per_page?: number;
    };
    leaveTypes: LeaveType[];
    filters: {
        status?: string;
        leave_type_id?: number;
    };
    error?: string;
}

export default function LeaveHistoryPage({ requests, leaveTypes, filters, error }: HistoryPageProps) {
    const handleFilterChange = (key: string, value: string) => {
        router.get('/leaves/history', { ...filters, [key]: value || null }, { preserveState: true });
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            approved: 'default',
            pending: 'secondary',
            rejected: 'destructive',
            cancelled: 'outline',
        };

        return (
            <Badge variant={variants[status] || 'secondary'}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    if (error) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Leave History" />
                <div className="p-6">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-destructive">{error}</p>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    const groupedRequests = useMemo(() => {
        return (requests.data || []).reduce((acc, request) => {
            const dateKey = new Date(request.start_date).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            });
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(request);
            return acc;
        }, {} as Record<string, LeaveRequest[]>);
    }, [requests.data]);

    const sortedDates = useMemo(
        () => Object.keys(groupedRequests).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()),
        [groupedRequests]
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Leave History" />
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Leave History</h1>
                        <p className="text-muted-foreground mt-1">View your leave request history</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                My Leave Requests
                            </CardTitle>
                            <div className="flex gap-2">
                                <Select
                                    value={filters.status || 'all'}
                                    onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
                                >
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={filters.leave_type_id?.toString() || 'all'}
                                    onValueChange={(value) => handleFilterChange('leave_type_id', value === 'all' ? '' : value)}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Leave Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        {leaveTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id.toString()}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {sortedDates.length > 0 ? (
                            <div className="space-y-5">
                                {sortedDates.map((dateKey) => (
                                    <section key={dateKey} className="space-y-2">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dateKey}</div>
                                        {groupedRequests[dateKey].map((request) => (
                                            <div key={request.id} className="rounded-lg border border-border p-4">
                                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                                    <div>
                                                        <div className="font-semibold text-foreground">
                                                            {request.leave_type?.name ?? 'Unknown Leave Type'}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            {new Date(request.start_date).toLocaleDateString()} –{' '}
                                                            {new Date(request.end_date).toLocaleDateString()} • {request.days} day
                                                            {request.days !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                    {getStatusBadge(request.status)}
                                                </div>
                                                <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                                                    {request.reason && (
                                                        <p>
                                                            <span className="font-medium text-foreground">Reason:</span> {request.reason}
                                                        </p>
                                                    )}
                                                    {(request.approved_at || request.rejected_at) && (
                                                        <p>
                                                            <span className="font-medium text-foreground">
                                                                {request.status === 'approved' ? 'Approved' : 'Rejected'} on:
                                                            </span>{' '}
                                                            {new Date(
                                                                request.status === 'approved'
                                                                    ? request.approved_at!
                                                                    : request.rejected_at!
                                                            ).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                            </div>
                                                        </div>
                                        ))}
                                    </section>
                                        ))}
                            </div>
                        ) : (
                            <p className="py-8 text-center text-muted-foreground">No leave requests found</p>
                        )}

                                {requests.links && requests.links.length > 0 && (
                                    <div className="mt-4">
                                        <TablePagination
                                            meta={{
                                                links: requests.links,
                                                from: requests.from || 0,
                                                to: requests.to || 0,
                                                total: requests.total || 0,
                                            }}
                                        />
                                    </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

