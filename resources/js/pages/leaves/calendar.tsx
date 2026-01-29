import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CalendarDays, Search, Calendar } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Leave Calendar', href: '/leaves/calendar' },
];

interface LeaveCalendarItem {
    id: number;
    employee_id: string;
    employee_name: string;
    leave_type: string;
    leave_type_id: number;
    leave_type_code: string;
    leave_type_color: string;
    start_date: string;
    end_date: string;
    days: number;
    reference_code: string | null;
}

interface LeaveType {
    id: number;
    name: string;
    code: string;
}

type LeaveStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Expired';

function getLeaveStatus(startDate: string, endDate: string): LeaveStatus {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    // Upcoming: leave hasn't started yet
    if (start > today) {
        return 'Upcoming';
    }
    
    // Ongoing: leave is currently active
    if (start <= today && end >= today) {
        return 'Ongoing';
    }
    
    // Completed or Expired: leave has ended
    if (end < today) {
        // Expired: ended more than 30 days ago
        const daysSinceEnd = Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceEnd > 30) {
            return 'Expired';
        }
        return 'Completed';
    }
    
    // Fallback (shouldn't happen)
    return 'Completed';
}

function getStatusBadgeVariant(status: LeaveStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
        case 'Upcoming':
            return 'default'; // Blue/primary
        case 'Ongoing':
            return 'secondary'; // Green/secondary
        case 'Completed':
            return 'outline'; // Gray/outline
        case 'Expired':
            return 'destructive'; // Red/destructive
        default:
            return 'outline';
    }
}

function getStatusBadgeClassName(status: LeaveStatus): string {
    switch (status) {
        case 'Upcoming':
            return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800';
        case 'Ongoing':
            return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800';
        case 'Completed':
            return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700';
        case 'Expired':
            return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800';
        default:
            return '';
    }
}

interface Unit {
    id: number;
    name: string;
    code?: string;
}

interface CalendarPageProps {
    leaves: LeaveCalendarItem[];
    dateFrom: string;
    dateTo: string;
    leaveTypes?: LeaveType[];
    units?: Unit[];
    selectedEmployeeId?: string;
    selectedUnitId?: number;
}

const formatDateForInput = (value?: string | null) => {
    if (!value) return '';
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    // Otherwise, try to parse and format
    try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toISOString().split('T')[0];
    } catch {
        return value;
    }
};

export default function LeaveCalendarPage({ leaves, dateFrom, dateTo, leaveTypes = [], units = [], selectedEmployeeId, selectedUnitId }: CalendarPageProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMode, setSearchMode] = useState<'any' | 'name' | 'reference'>('any');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedLeaveType, setSelectedLeaveType] = useState<string>('all');
    const [localDateFrom, setLocalDateFrom] = useState<string>(formatDateForInput(dateFrom));
    const [localDateTo, setLocalDateTo] = useState<string>(formatDateForInput(dateTo));

    // Sync local state with props when dates change from backend
    useEffect(() => {
        setLocalDateFrom(formatDateForInput(dateFrom));
        setLocalDateTo(formatDateForInput(dateTo));
    }, [dateFrom, dateTo]);

    const handleDateFromChange = (newDate: string) => {
        setLocalDateFrom(newDate);
        router.get('/leaves/calendar', { 
            date_from: newDate, 
            date_to: localDateTo,
            employee_id: selectedEmployeeId,
            unit_id: selectedUnitId || undefined,
        }, { preserveState: true });
    };

    const handleDateToChange = (newDate: string) => {
        setLocalDateTo(newDate);
        router.get('/leaves/calendar', { 
            date_from: localDateFrom, 
            date_to: newDate,
            employee_id: selectedEmployeeId,
            unit_id: selectedUnitId || undefined,
        }, { preserveState: true });
    };

    const handleUnitChange = (unitId: string) => {
        router.get('/leaves/calendar', {
            date_from: localDateFrom,
            date_to: localDateTo,
            employee_id: selectedEmployeeId,
            unit_id: unitId === 'all' ? undefined : parseInt(unitId),
        }, { preserveState: true });
    };

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status);
    };

    const handleLeaveTypeChange = (leaveTypeId: string) => {
        setSelectedLeaveType(leaveTypeId);
    };

    // Format date range for display
    const formatDateRange = (from: string, to: string): string => {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        const fromFormatted = fromDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const toFormatted = toDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        return `${fromFormatted} - ${toFormatted}`;
    };

    // Filter leaves based on search, status, and leave type
    const filteredLeaves = useMemo(() => {
        return leaves.filter((leave) => {
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                let matchesSearch = false;
                if (searchMode === 'name') {
                    matchesSearch = leave.employee_name.toLowerCase().includes(query);
                } else if (searchMode === 'reference') {
                    matchesSearch = (leave.reference_code?.toLowerCase().includes(query) ?? false);
                } else {
                    matchesSearch = leave.employee_name.toLowerCase().includes(query) || (leave.reference_code?.toLowerCase().includes(query) ?? false);
                }
                if (!matchesSearch) return false;
            }

            // Status filter
            if (selectedStatus !== 'all') {
                const status = getLeaveStatus(leave.start_date, leave.end_date);
                if (status !== selectedStatus) {
                    return false;
                }
            }

            // Leave type filter
            if (selectedLeaveType !== 'all') {
                if (leave.leave_type_id !== parseInt(selectedLeaveType)) {
                    return false;
                }
            }

            return true;
        });
    }, [leaves, searchQuery, searchMode, selectedStatus, selectedLeaveType]);

    const groupedLeaves = useMemo(() => {
        return filteredLeaves.reduce((acc, leave) => {
            const dateKey = new Date(leave.start_date).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            });
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(leave);
            return acc;
        }, {} as Record<string, LeaveCalendarItem[]>);
    }, [filteredLeaves]);

    const sortedDates = useMemo(
        () => Object.keys(groupedLeaves).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
        [groupedLeaves]
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Leave Calendar" />
            <div className="flex h-full flex-1 flex-col gap-3 md:gap-4 rounded-xl p-3 md:p-4 pb-20 sm:pb-4">
                <div className="space-y-4 md:space-y-6">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-xl md:text-2xl font-semibold text-foreground">Leave Calendar</h1>
                        </div>
                    </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5" />
                            {formatDateRange(localDateFrom, localDateTo)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Filters */}
                        <div className="mb-6 space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                {/* Search Bar - integrated with search-by */}
                                <div className="flex flex-1 min-w-[280px] rounded-lg border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                                    <Select value={searchMode} onValueChange={(v) => setSearchMode(v as 'any' | 'name' | 'reference')}>
                                        <SelectTrigger className="h-10 w-[110px] shrink-0 border-0 rounded-none bg-muted/50 border-r border-border text-xs focus:ring-0 focus:ring-offset-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="any">Any</SelectItem>
                                            <SelectItem value="name">Name</SelectItem>
                                            <SelectItem value="reference">Reference</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div className="relative flex-1 min-w-0">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                        <Input
                                            type="text"
                                            placeholder={searchMode === 'any' ? 'Search by name or reference...' : `Search by ${searchMode}...`}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="h-10 w-full min-w-0 pl-9 pr-3 border-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                                        />
                                    </div>
                                </div>
                                
                                {/* Date Range Picker */}
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 h-auto sm:h-9 py-2 sm:py-0 rounded-lg border border-border bg-muted/30 px-3">
                                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1">
                                        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">From</label>
                                            <Input
                                                type="date"
                                                className="h-9 flex-1 min-w-[140px] border-border bg-background text-sm"
                                                value={localDateFrom}
                                                onChange={(e) => handleDateFromChange(e.target.value)}
                                            />
                                        </div>
                                        <div className="hidden sm:block h-4 w-px bg-border" />
                                        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">To</label>
                                            <Input
                                                type="date"
                                                className="h-9 flex-1 min-w-[140px] border-border bg-background text-sm"
                                                value={localDateTo}
                                                onChange={(e) => handleDateToChange(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Status Filter */}
                                <Select value={selectedStatus} onValueChange={handleStatusChange}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="Upcoming">Upcoming</SelectItem>
                                        <SelectItem value="Ongoing">Ongoing</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                        <SelectItem value="Expired">Expired</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Leave Type Filter */}
                                <Select value={selectedLeaveType} onValueChange={handleLeaveTypeChange}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="All Leave Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Leave Types</SelectItem>
                                        {leaveTypes.map((type) => (
                                            <SelectItem key={type.id} value={type.id.toString()}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Unit Filter */}
                                {units.length > 0 && (
                                    <Select value={selectedUnitId ? selectedUnitId.toString() : 'all'} onValueChange={handleUnitChange}>
                                        <SelectTrigger className="w-full sm:w-[180px]">
                                            <SelectValue placeholder="All Units" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Units</SelectItem>
                                            {units.map((unit) => (
                                                <SelectItem key={unit.id} value={unit.id.toString()}>
                                                    {unit.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                        {sortedDates.length > 0 ? (
                            <div className="space-y-4">
                                {sortedDates.map((dateKey) => (
                                    <section key={dateKey} className="space-y-2">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dateKey}</div>
                                        {groupedLeaves[dateKey].map((leave) => {
                                            const status = getLeaveStatus(leave.start_date, leave.end_date);
                                            return (
                                                <div
                                                    key={`${dateKey}-${leave.id}`}
                                                    className="flex items-center justify-between rounded-lg border p-3"
                                                    style={{ borderLeftColor: leave.leave_type_color, borderLeftWidth: '4px' }}
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <div className="font-semibold">{leave.employee_name}</div>
                                                            <Badge 
                                                                variant={getStatusBadgeVariant(status)}
                                                                className={getStatusBadgeClassName(status)}
                                                            >
                                                                {status}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground space-y-1">
                                                            <div>
                                                                {leave.leave_type} • {leave.days} day{leave.days !== 1 ? 's' : ''}
                                                            </div>
                                                            {leave.reference_code && (
                                                                <div className="text-xs">
                                                                    Ref: {leave.reference_code}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </section>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                {searchQuery || selectedStatus !== 'all' || selectedLeaveType !== 'all' 
                                    ? 'No leave requests match your filters'
                                    : `No leave requests found for ${formatDateRange(localDateFrom, localDateTo)}`
                                }
                            </p>
                        )}
                    </CardContent>
                </Card>
                </div>
            </div>
        </AppLayout>
    );
}



