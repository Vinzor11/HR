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

interface CalendarPageProps {
    leaves: LeaveCalendarItem[];
    dateFrom: string;
    dateTo: string;
    leaveTypes?: LeaveType[];
    selectedEmployeeId?: string;
    selectedDepartmentId?: number;
}

export default function LeaveCalendarPage({ leaves, dateFrom, dateTo, leaveTypes = [], selectedEmployeeId, selectedDepartmentId }: CalendarPageProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedLeaveType, setSelectedLeaveType] = useState<string>('all');
    const [localDateFrom, setLocalDateFrom] = useState<string>(dateFrom);
    const [localDateTo, setLocalDateTo] = useState<string>(dateTo);

    // Sync local state with props when dates change from backend
    useEffect(() => {
        setLocalDateFrom(dateFrom);
        setLocalDateTo(dateTo);
    }, [dateFrom, dateTo]);

    const handleDateFromChange = (newDate: string) => {
        setLocalDateFrom(newDate);
        router.get('/leaves/calendar', { 
            date_from: newDate, 
            date_to: localDateTo,
            employee_id: selectedEmployeeId,
            department_id: selectedDepartmentId,
        }, { preserveState: true });
    };

    const handleDateToChange = (newDate: string) => {
        setLocalDateTo(newDate);
        router.get('/leaves/calendar', { 
            date_from: localDateFrom, 
            date_to: newDate,
            employee_id: selectedEmployeeId,
            department_id: selectedDepartmentId,
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
            // Search filter (name or reference code)
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchesName = leave.employee_name.toLowerCase().includes(query);
                const matchesRef = leave.reference_code?.toLowerCase().includes(query) ?? false;
                if (!matchesName && !matchesRef) {
                    return false;
                }
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
    }, [leaves, searchQuery, selectedStatus, selectedLeaveType]);

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
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Leave Calendar</h1>
                        <p className="text-muted-foreground mt-1">View approved leave requests</p>
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
                                {/* Search Bar */}
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search by name or reference number..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                
                                {/* Date Range Picker */}
                                <div className="flex items-center gap-3 h-9 rounded-lg border border-border bg-muted/30 px-3">
                                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">From</label>
                                            <Input
                                                type="date"
                                                className="h-9 w-[140px] border-border bg-background text-sm"
                                                value={localDateFrom}
                                                onChange={(e) => handleDateFromChange(e.target.value)}
                                            />
                                        </div>
                                        <div className="h-4 w-px bg-border" />
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">To</label>
                                            <Input
                                                type="date"
                                                className="h-9 w-[140px] border-border bg-background text-sm"
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
        </AppLayout>
    );
}



