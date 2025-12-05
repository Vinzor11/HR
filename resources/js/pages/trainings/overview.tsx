import { CustomToast, toast } from '@/components/custom-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useMemo, useState, useCallback } from 'react';
import { CalendarDays, Clock3, MapPin, User, FileText, Download, Filter, Search, Calendar, Clock } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Training Logs',
        href: '/trainings/overview',
    },
];

interface Participant {
    name: string;
    department: string;
    position: string;
}

interface TrainingOverview {
    training_id: number;
    training_title: string;
    date_from: string;
    date_to: string;
    venue?: string;
    total_participants: number;
    participants: Participant[];
    status?: string;
    reference_number?: string;
}

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
    employee_name?: string;
    employee_department?: string;
    employee_position?: string;
}

interface PageProps {
    trainings: TrainingOverview[];
    logs: LogEntry[];
    filters?: {
        status?: string;
        search?: string;
        date_from?: string;
        date_to?: string;
    };
}

// Status options for Logs tab (application statuses)
const logStatusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Signed Up', label: 'Signed Up' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Ongoing', label: 'Ongoing' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'No Show', label: 'No Show' },
];

// Status options for Overview tab (training statuses)
const overviewStatusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Upcoming', label: 'Upcoming' },
    { value: 'Ongoing', label: 'Ongoing' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Ended', label: 'Ended' },
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
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        case 'Ongoing':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'Upcoming':
            return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
        case 'Ended':
            return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
};

const getAttendanceBadgeClass = (attendance?: string) => {
    switch (attendance) {
        case 'Present':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        case 'Absent':
            return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        case 'Excused':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
};

export default function TrainingsOverview() {
    const { trainings, logs, filters } = usePage<PageProps>().props;
    const [statusFilter, setStatusFilter] = useState(filters?.status || 'all');
    const [overviewStatusFilter, setOverviewStatusFilter] = useState(filters?.status || 'all');
    const [activeTab, setActiveTab] = useState('logs');
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [dateFrom, setDateFrom] = useState<string>(filters?.date_from || '');
    const [dateTo, setDateTo] = useState<string>(filters?.date_to || '');
    const [overviewSearchTerm, setOverviewSearchTerm] = useState(filters?.search || '');
    const [overviewDateFrom, setOverviewDateFrom] = useState<string>(filters?.date_from || '');
    const [overviewDateTo, setOverviewDateTo] = useState<string>(filters?.date_to || '');

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value);
        const filterValue = value === 'all' ? undefined : value;
        router.get(
            '/trainings/overview',
            { status: filterValue },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    const handleOverviewStatusFilterChange = (value: string) => {
        setOverviewStatusFilter(value);
        const filterValue = value === 'all' ? undefined : value;
        router.get(
            '/trainings/overview',
            { status: filterValue },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    // Filter trainings by status, search, and date for overview tab
    const filteredTrainings = useMemo(() => {
        let filtered = trainings;

        // Status filter
        if (overviewStatusFilter && overviewStatusFilter !== 'all') {
            filtered = filtered.filter(training => training.status === overviewStatusFilter);
        }

        // Search filter
        if (overviewSearchTerm) {
            const query = overviewSearchTerm.toLowerCase();
            filtered = filtered.filter(
                (training) =>
                    training.training_title?.toLowerCase().includes(query) ||
                    training.reference_number?.toLowerCase().includes(query) ||
                    training.venue?.toLowerCase().includes(query) ||
                    training.participants.some(
                        (p) =>
                            p.name?.toLowerCase().includes(query) ||
                            p.department?.toLowerCase().includes(query) ||
                            p.position?.toLowerCase().includes(query)
                    )
            );
        }

        // Date filters
        if (overviewDateFrom) {
            const fromDate = new Date(overviewDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter((training) => {
                const trainingDate = training.date_from ? new Date(training.date_from) : null;
                if (!trainingDate) return false;
                trainingDate.setHours(0, 0, 0, 0);
                return trainingDate >= fromDate;
            });
        }

        if (overviewDateTo) {
            const toDate = new Date(overviewDateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter((training) => {
                const trainingDate = training.date_to ? new Date(training.date_to) : training.date_from ? new Date(training.date_from) : null;
                if (!trainingDate) return false;
                return trainingDate <= toDate;
            });
        }

        return filtered;
    }, [trainings, overviewStatusFilter, overviewSearchTerm, overviewDateFrom, overviewDateTo]);

    // Export individual training to CSV
    const exportTrainingToCSV = useCallback((training: TrainingOverview) => {
        const headers = [
            'Reference Number',
            'Training Title',
            'Status',
            'Date From',
            'Date To',
            'Venue',
            'Total Participants',
            'Participant Name',
            'Department',
            'Position'
        ];

        const referenceNumber = training.reference_number || `TRG-${training.training_id}`;
        
        // Create rows with one row per participant
        const rows: string[][] = [];
        
        if (training.participants.length > 0) {
            // Add a row for each participant
            training.participants.forEach((participant, index) => {
                rows.push([
                    index === 0 ? referenceNumber : '', // Only show reference number in first row
                    index === 0 ? (training.training_title || '') : '', // Only show title in first row
                    index === 0 ? (training.status || '') : '', // Only show status in first row
                    index === 0 ? (training.date_from || '') : '', // Only show dates in first row
                    index === 0 ? (training.date_to || '') : '',
                    index === 0 ? (training.venue || '') : '',
                    index === 0 ? String(training.total_participants || 0) : '',
                    participant.name || '',
                    participant.department || '',
                    participant.position || ''
                ]);
            });
        } else {
            // If no participants, add one row with training info only
            rows.push([
                referenceNumber,
                training.training_title || '',
                training.status || '',
                training.date_from || '',
                training.date_to || '',
                training.venue || '',
                String(training.total_participants || 0),
                '',
                '',
                ''
            ]);
        }

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const refNum = training.reference_number || `TRG-${training.training_id}`;
        link.setAttribute('download', `training_${refNum}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Training ${refNum} exported to CSV`);
    }, []);

    const filteredLogs = useMemo(() => {
        return logs.filter((entry) => {
            const matchesSearch = !searchTerm || 
                entry.training_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.employee_department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.employee_position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.facilitator?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.venue?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = !statusFilter || statusFilter === 'all' || entry.status === statusFilter;
            
            // Date range filter
            const entryDate = entry.updated_at ?? entry.date_from ?? entry.date_to;
            if (entryDate) {
                const logDate = new Date(entryDate);
                const matchesDateFrom = !dateFrom || logDate >= new Date(dateFrom);
                const matchesDateTo = !dateTo || logDate <= new Date(dateTo + 'T23:59:59');
                return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
            }
            
            return matchesSearch && matchesStatus;
        });
    }, [logs, searchTerm, statusFilter, dateFrom, dateTo]);

    const groupedLogs = useMemo(() => {
        return filteredLogs.reduce((acc, entry) => {
            const dateKey = formatDateHeading(entry.updated_at ?? entry.date_from ?? entry.date_to);
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(entry);
            return acc;
        }, {} as Record<string, LogEntry[]>);
    }, [filteredLogs]);

    const sortedDates = useMemo(
        () => Object.keys(groupedLogs).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()),
        [groupedLogs]
    );

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case 'Completed':
                return 'CheckCircle';
            case 'Ongoing':
                return 'PlayCircle';
            case 'Approved':
                return 'Check';
            case 'Signed Up':
                return 'UserPlus';
            case 'Rejected':
                return 'XCircle';
            case 'Cancelled':
                return 'X';
            case 'No Show':
                return 'UserX';
            default:
                return 'FileText';
        }
    };

    // Export to CSV function
    const exportToCSV = useCallback(() => {
        const headers = [
            'ID',
            'Training Title',
            'Employee Name',
            'Department',
            'Position',
            'Status',
            'Attendance',
            'Date From',
            'Date To',
            'Hours',
            'Venue',
            'Facilitator',
            'Applied On',
            'Updated At'
        ];

        const rows = filteredLogs.map(entry => [
            entry.id,
            entry.training_title || '',
            entry.employee_name || '',
            entry.employee_department || '',
            entry.employee_position || '',
            entry.status || '',
            entry.attendance || '',
            entry.date_from || '',
            entry.date_to || '',
            entry.hours || '',
            entry.venue || '',
            entry.facilitator || '',
            entry.sign_up_date || '',
            entry.updated_at || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `training_logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Training logs exported to CSV');
    }, [filteredLogs]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Training Logs" />
            <CustomToast />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground">Training Logs</h1>
                            <p className="text-sm text-muted-foreground">
                                View training history and participants
                            </p>
                        </div>

                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="logs">Logs</TabsTrigger>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                        </TabsList>

                        <TabsContent value="logs" className="mt-6">
                            <div className="space-y-6">
                                {/* Filters */}
                                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-lg">
                                    <div className="relative max-w-md">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Search by training, employee, department, venue..."
                                            className="pl-10"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                                        <SelectTrigger className="w-full sm:w-[180px]">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {logStatusOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-3 h-9 rounded-lg border border-border bg-muted/30 px-3">
                                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">From</label>
                                                <Input
                                                    type="date"
                                                    className="h-9 w-[140px] border-border bg-background text-sm"
                                                    value={dateFrom}
                                                    onChange={(e) => setDateFrom(e.target.value)}
                                                />
                                            </div>
                                            <div className="h-4 w-px bg-border" />
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">To</label>
                                                <Input
                                                    type="date"
                                                    className="h-9 w-[140px] border-border bg-background text-sm"
                                                    value={dateTo}
                                                    onChange={(e) => setDateTo(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={exportToCSV}
                                        className="h-9 gap-2"
                                        disabled={filteredLogs.length === 0}
                                    >
                                        <Download className="h-4 w-4" />
                                        Export CSV
                                    </Button>
                                </div>

                                {/* Logs List */}
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    {filteredLogs.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p className="text-sm">No logs found</p>
                                            {searchTerm || statusFilter !== 'all' || dateFrom || dateTo ? (
                                                <p className="text-xs mt-1">Try adjusting your filters</p>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            {sortedDates.map((dateKey, dateIndex) => (
                                                <div key={dateKey} className={dateIndex > 0 ? 'mt-8' : ''}>
                                                    {/* Date Separator */}
                                                    <div className="sticky top-0 z-10 bg-card border-b border-border py-3 px-6">
                                                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                                                            {dateKey}
                                                        </h3>
                                                    </div>
                                                    
                                                    {/* Timeline for this date */}
                                                    <div className="relative pl-8">
                                                        {/* Vertical line */}
                                                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border"></div>
                                                        
                                                        {groupedLogs[dateKey].map((entry) => {
                                                            const statusIcon = getStatusIcon(entry.status);
                                                            const IconComponent = (LucideIcons as any)[statusIcon] || LucideIcons.FileText;
                                                            const statusClass = getStatusBadgeClass(entry.status);

                                                            return (
                                                                <div
                                                                    key={entry.id}
                                                                    className="relative pb-6 last:pb-4"
                                                                >
                                                                    {/* Timeline node */}
                                                                    <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full ${statusClass} border-2 border-card flex items-center justify-center z-10`}>
                                                                        <IconComponent className="h-3 w-3" />
                                                                    </div>
                                                                    
                                                                    {/* Log content */}
                                                                    <div className="ml-6">
                                                                        <div className="bg-muted/20 hover:bg-muted/30 rounded-lg p-4 transition-colors border border-border/50">
                                                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                                                <div className="flex-1">
                                                                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                                        {entry.status && (
                                                                                            <Badge variant="outline" className={`text-xs ${statusClass} border-0`}>
                                                                                                {entry.status}
                                                                                            </Badge>
                                                                                        )}
                                                                                        <span className="text-sm font-medium text-foreground">
                                                                                            {entry.training_title ?? 'Untitled Training'}
                                                                                        </span>
                                                                                    </div>
                                                                                    
                                                                                    {entry.employee_name && (
                                                                                        <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                                                                                            <div className="font-medium text-muted-foreground mb-1">Employee:</div>
                                                                                            <div className="text-foreground">
                                                                                                {entry.employee_name}
                                                                                                {entry.employee_department && (
                                                                                                    <span className="text-muted-foreground ml-2">
                                                                                                        ({entry.employee_department} - {entry.employee_position})
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                    
                                                                                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                                                                        {entry.date_from && entry.date_to && (
                                                                                            <div>
                                                                                                <div className="text-muted-foreground mb-1">Schedule:</div>
                                                                                                <div className="text-foreground">
                                                                                                    {formatDate(entry.date_from)} - {formatDate(entry.date_to)}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                        {entry.hours && (
                                                                                            <div>
                                                                                                <div className="text-muted-foreground mb-1">Duration:</div>
                                                                                                <div className="text-foreground">{entry.hours} hours</div>
                                                                                            </div>
                                                                                        )}
                                                                                        {entry.venue && (
                                                                                            <div>
                                                                                                <div className="text-muted-foreground mb-1">Venue:</div>
                                                                                                <div className="text-foreground">{entry.venue}</div>
                                                                                            </div>
                                                                                        )}
                                                                                        {entry.facilitator && (
                                                                                            <div>
                                                                                                <div className="text-muted-foreground mb-1">Facilitator:</div>
                                                                                                <div className="text-foreground">{entry.facilitator}</div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    
                                                                                    {entry.attendance && (
                                                                                        <div className="mt-2">
                                                                                            <Badge className={getAttendanceBadgeClass(entry.attendance)}>
                                                                                                {entry.attendance}
                                                                                            </Badge>
                                                                                        </div>
                                                                                    )}
                                                                                    
                                                                                    {entry.certificate_path && (
                                                                                        <div className="mt-2 pt-2 border-t border-border">
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
                                                                            </div>
                                                                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                                                                                {entry.sign_up_date && (
                                                                                    <span className="flex items-center gap-1.5">
                                                                                        <CalendarDays className="h-3.5 w-3.5" />
                                                                                        Applied: {formatDateTime(entry.sign_up_date)}
                                                                                    </span>
                                                                                )}
                                                                                {entry.updated_at && (
                                                                                    <span className="flex items-center gap-1.5">
                                                                                        <Clock className="h-3.5 w-3.5" />
                                                                                        Updated: {formatDateTime(entry.updated_at)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Summary */}
                                {filteredLogs.length > 0 && (
                                    <div className="text-sm text-muted-foreground text-center">
                                        Showing {filteredLogs.length} of {logs.length} log entries
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="overview" className="mt-6">
                            <div className="space-y-6">
                                {/* Filters for Overview */}
                                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-lg">
                                    <div className="relative max-w-md">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Search by training title, reference, venue, participant..."
                                            className="pl-10"
                                            value={overviewSearchTerm}
                                            onChange={(e) => setOverviewSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <Select value={overviewStatusFilter} onValueChange={handleOverviewStatusFilterChange}>
                                        <SelectTrigger className="w-full sm:w-[180px]">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {overviewStatusOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-3 h-9 rounded-lg border border-border bg-muted/30 px-3">
                                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">From</label>
                                                <Input
                                                    type="date"
                                                    className="h-9 w-[140px] border-border bg-background text-sm"
                                                    value={overviewDateFrom}
                                                    onChange={(e) => setOverviewDateFrom(e.target.value)}
                                                />
                                            </div>
                                            <div className="h-4 w-px bg-border" />
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">To</label>
                                                <Input
                                                    type="date"
                                                    className="h-9 w-[140px] border-border bg-background text-sm"
                                                    value={overviewDateTo}
                                                    onChange={(e) => setOverviewDateTo(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Trainings List */}
                                {filteredTrainings.length === 0 ? (
                                    <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                                        {overviewStatusFilter !== 'all' || overviewSearchTerm || overviewDateFrom || overviewDateTo
                                            ? 'No trainings found matching your filters.'
                                            : 'No training data available yet.'}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {filteredTrainings.map((training) => {
                                            const statusClass = getStatusBadgeClass(training.status);
                                            const referenceNumber = training.reference_number || `TRG-${training.training_id}`;
                                            
                                            return (
                                                <section key={training.training_id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                                                    <div className="flex flex-col gap-2 mb-4">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1">
                                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                    {training.status && (
                                                                        <Badge variant="outline" className={`text-xs ${statusClass} border-0`}>
                                                                            {training.status}
                                                                        </Badge>
                                                                    )}
                                                                    <h2 className="text-xl font-semibold text-foreground">{training.training_title}</h2>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                                    <span className="font-medium text-foreground">
                                                                        Reference: <span className="font-mono">{referenceNumber}</span>
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <CalendarDays className="h-4 w-4" />
                                                                        {training.date_from} - {training.date_to}
                                                                    </span>
                                                                </div>
                                                                {training.venue && (
                                                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                                        <MapPin className="h-4 w-4" />
                                                                        Venue: {training.venue}
                                                                    </p>
                                                                )}
                                                                <p className="text-sm font-medium text-foreground mt-1">
                                                                    Total Participants: {training.total_participants}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => exportTrainingToCSV(training)}
                                                                className="h-9 gap-2 shrink-0"
                                                            >
                                                                <Download className="h-4 w-4" />
                                                                Export
                                                            </Button>
                                                        </div>
                                                    </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full table-auto border border-border text-sm">
                                                    <thead>
                                                        <tr>
                                                            <th className="bg-muted px-3 py-2 text-left font-semibold text-foreground">Participant</th>
                                                            <th className="bg-muted px-3 py-2 text-left font-semibold text-foreground">Department</th>
                                                            <th className="bg-muted px-3 py-2 text-left font-semibold text-foreground">Position</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {training.participants.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={3} className="border-t border-border px-3 py-4 text-center text-muted-foreground">
                                                                    No participants recorded.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            training.participants.map((participant, idx) => (
                                                                <tr key={`${training.training_id}-${idx}`}>
                                                                    <td className="border-t border-border px-3 py-2 text-foreground">{participant.name}</td>
                                                                    <td className="border-t border-border px-3 py-2 text-foreground">{participant.department}</td>
                                                                    <td className="border-t border-border px-3 py-2 text-foreground">{participant.position}</td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                                </section>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </section>
            </div>
        </AppLayout>
    );
}

