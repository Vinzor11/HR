import { CustomToast } from '@/components/custom-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { CalendarDays, Clock3, MapPin, User, FileText, Download, Filter, Search } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Training History',
        href: '/trainings/logs',
    },
];

interface LogEntry {
    id: number;
    training_title?: string;
    status?: string;
    original_status?: string;
    attendance?: string;
    date_from?: string;
    date_to?: string;
    hours?: string | number;
    venue?: string;
    facilitator?: string;
    remarks?: string;
    capacity?: number;
    certificate_path?: string | null;
    sign_up_date?: string;
    updated_at?: string;
    created_at?: string;
}

interface TrainingLogsProps {
    entries: LogEntry[];
    filters?: {
        status?: string;
        search?: string;
        date_from?: string;
        date_to?: string;
    };
}

const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Signed Up', label: 'Signed Up' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Ongoing', label: 'Ongoing' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'No Show', label: 'No Show' },
];

const formatDate = (value?: string) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    });
};

const formatDateTime = (value?: string) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatDateHeading = (value?: string) => {
    if (!value) return new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    return new Date(value).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
};

const getStatusBadgeClass = (status?: string) => {
    switch (status) {
        case 'Completed':
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        case 'Ongoing':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'Approved':
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        case 'Signed Up':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'Rejected':
            return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        case 'Cancelled':
            return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
        case 'No Show':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
};

const getAttendanceBadgeClass = (attendance?: string) => {
    switch (attendance) {
        case 'Present':
            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        case 'Absent':
            return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        case 'Excused':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
};

export default function TrainingLogs({ entries, filters }: TrainingLogsProps) {
    const [statusFilter, setStatusFilter] = useState(filters?.status || 'all');
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value);
        applyFilters({
            status: value === 'all' ? undefined : value,
            search: searchQuery || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        });
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        applyFilters({
            status: statusFilter === 'all' ? undefined : statusFilter,
            search: value || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        });
    };

    const handleDateFromChange = (value: string) => {
        setDateFrom(value);
        applyFilters({
            status: statusFilter === 'all' ? undefined : statusFilter,
            search: searchQuery || undefined,
            date_from: value || undefined,
            date_to: dateTo || undefined,
        });
    };

    const handleDateToChange = (value: string) => {
        setDateTo(value);
        applyFilters({
            status: statusFilter === 'all' ? undefined : statusFilter,
            search: searchQuery || undefined,
            date_from: dateFrom || undefined,
            date_to: value || undefined,
        });
    };

    const applyFilters = (filterParams: {
        status?: string;
        search?: string;
        date_from?: string;
        date_to?: string;
    }) => {
        router.get(
            '/trainings/logs',
            filterParams,
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    const filteredEntries = useMemo(() => {
        let filtered = entries;

        // Status filter
        if (statusFilter && statusFilter !== 'all') {
            filtered = filtered.filter((entry) => entry.status === statusFilter);
        }

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (entry) =>
                    entry.training_title?.toLowerCase().includes(query) ||
                    entry.facilitator?.toLowerCase().includes(query) ||
                    entry.venue?.toLowerCase().includes(query) ||
                    entry.remarks?.toLowerCase().includes(query)
            );
        }

        // Date filters
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter((entry) => {
                const entryDate = entry.date_from
                    ? new Date(entry.date_from)
                    : entry.updated_at
                    ? new Date(entry.updated_at)
                    : null;
                if (!entryDate) return false;
                entryDate.setHours(0, 0, 0, 0);
                return entryDate >= fromDate;
            });
        }

        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter((entry) => {
                const entryDate = entry.date_to
                    ? new Date(entry.date_to)
                    : entry.date_from
                    ? new Date(entry.date_from)
                    : entry.updated_at
                    ? new Date(entry.updated_at)
                    : null;
                if (!entryDate) return false;
                return entryDate <= toDate;
            });
        }

        return filtered;
    }, [entries, statusFilter, searchQuery, dateFrom, dateTo]);

    const groupedEntries = useMemo(() => {
        return filteredEntries.reduce((acc, entry) => {
            const dateKey = formatDateHeading(entry.updated_at ?? entry.date_from ?? entry.date_to);
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(entry);
            return acc;
        }, {} as Record<string, LogEntry[]>);
    }, [filteredEntries]);

    const sortedDates = useMemo(
        () => Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()),
        [groupedEntries]
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Training History" />
            <CustomToast />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold text-foreground">Training History</h1>
                                <p className="text-sm text-muted-foreground">
                                    View your training history and records
                                </p>
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Search and Date Filters */}
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                            {/* Search Bar */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search by title, facilitator, venue, or remarks..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            {/* Date From */}
                            <div className="flex items-center gap-2">
                                <label htmlFor="date-from" className="text-sm text-muted-foreground whitespace-nowrap">
                                    From:
                                </label>
                                <Input
                                    id="date-from"
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => handleDateFromChange(e.target.value)}
                                    className="w-[150px]"
                                />
                            </div>

                            {/* Date To */}
                            <div className="flex items-center gap-2">
                                <label htmlFor="date-to" className="text-sm text-muted-foreground whitespace-nowrap">
                                    To:
                                </label>
                                <Input
                                    id="date-to"
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => handleDateToChange(e.target.value)}
                                    className="w-[150px]"
                                />
                            </div>
                        </div>
                    </div>

                    {sortedDates.length === 0 ? (
                        <div className="mt-6 rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                            {statusFilter && statusFilter !== 'all'
                                ? `No training records found with status "${statusOptions.find((o) => o.value === statusFilter)?.label}".`
                                : 'No training records found.'}
                        </div>
                    ) : (
                        <div className="mt-6 space-y-6">
                            {sortedDates.map((dateKey) => (
                                <section key={dateKey} className="space-y-3">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        {dateKey}
                                    </div>
                                    {groupedEntries[dateKey].map((entry) => (
                                        <article
                                            key={entry.id}
                                            className="rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                                        >
                                            <div className="flex flex-col gap-4">
                                                {/* Header */}
                                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-semibold text-foreground">
                                                            {entry.training_title ?? 'Untitled Training'}
                                                        </h3>
                                                        {entry.remarks && (
                                                            <p className="mt-1 text-sm text-muted-foreground">{entry.remarks}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {entry.status && (
                                                            <Badge className={getStatusBadgeClass(entry.status)}>
                                                                {entry.status}
                                                            </Badge>
                                                        )}
                                                        {entry.attendance && (
                                                            <Badge className={getAttendanceBadgeClass(entry.attendance)}>
                                                                {entry.attendance}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Training Details Grid */}
                                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                    {/* Schedule */}
                                                    <div className="flex items-start gap-3">
                                                        <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground">Schedule</p>
                                                            <p className="text-sm text-foreground">
                                                                {formatDate(entry.date_from)} - {formatDate(entry.date_to)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Hours */}
                                                    <div className="flex items-start gap-3">
                                                        <Clock3 className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground">Duration</p>
                                                            <p className="text-sm text-foreground">{entry.hours ?? '-'} hours</p>
                                                        </div>
                                                    </div>

                                                    {/* Venue */}
                                                    {entry.venue && (
                                                        <div className="flex items-start gap-3">
                                                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground">Venue</p>
                                                                <p className="text-sm text-foreground">{entry.venue}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Facilitator */}
                                                    {entry.facilitator && (
                                                        <div className="flex items-start gap-3">
                                                            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground">Facilitator</p>
                                                                <p className="text-sm text-foreground">{entry.facilitator}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Capacity */}
                                                    {entry.capacity && (
                                                        <div className="flex items-start gap-3">
                                                            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground">Capacity</p>
                                                                <p className="text-sm text-foreground">{entry.capacity} participants</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Sign Up Date */}
                                                    {entry.sign_up_date && (
                                                        <div className="flex items-start gap-3">
                                                            <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                            <div>
                                                                <p className="text-xs font-medium text-muted-foreground">Applied On</p>
                                                                <p className="text-sm text-foreground">{formatDateTime(entry.sign_up_date)}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Certificate Download */}
                                                {entry.certificate_path && (
                                                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm text-muted-foreground">Certificate available:</span>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            asChild
                                                            className="h-8 gap-2"
                                                        >
                                                            <a
                                                                href={entry.certificate_path}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                download
                                                            >
                                                                <Download className="h-3 w-3" />
                                                                Download Certificate
                                                            </a>
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </section>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
