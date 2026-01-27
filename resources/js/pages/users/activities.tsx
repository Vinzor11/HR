import { CustomToast, toast } from '@/components/custom-toast';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Clock, User, FileText, Search, Download, LogIn, LogOut, XCircle, CheckCircle, Monitor, Smartphone, Tablet, SlidersHorizontal, Filter, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'User Activities',
        href: '/users/activities',
    },
];

// Constants
const PER_PAGE_OPTIONS = ['10', '25', '50', '100'] as const;

interface UserActivity {
    id: number;
    user_id: number | null;
    user_name: string;
    user_email: string;
    activity_type: 'login' | 'logout' | 'login_failed' | 'session_expired' | 'oauth_login' | 'oauth_logout';
    ip_address?: string;
    device?: string;
    browser?: string;
    status: 'success' | 'failed';
    login_time?: string;
    logout_time?: string;
    created_at: string;
}

interface UserActivitiesProps {
    activities: UserActivity[];
    users?: Array<{ id: number; name: string; email: string }>;
}

const activityConfig: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
    login: {
        label: 'Login',
        icon: 'LogIn',
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    logout: {
        label: 'Logout',
        icon: 'LogOut',
        color: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    oauth_login: {
        label: 'OAuth Login',
        icon: 'LogIn',
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    oauth_logout: {
        label: 'OAuth Logout',
        icon: 'LogOut',
        color: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    login_failed: {
        label: 'Login Failed',
        icon: 'XCircle',
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    session_expired: {
        label: 'Session Expired',
        icon: 'Clock',
        color: 'text-amber-700 dark:text-amber-400',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
};

const statusConfig: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
    success: {
        label: 'Success',
        icon: 'CheckCircle',
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    failed: {
        label: 'Failed',
        icon: 'XCircle',
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
};

const deviceIcons: Record<string, any> = {
    Desktop: Monitor,
    Mobile: Smartphone,
    Tablet: Tablet,
};

export default function UserActivities() {
    const { activities = [], users = [] } = usePage<UserActivitiesProps>().props;
    const [searchTerm, setSearchTerm] = useState('');
    const [searchMode, setSearchMode] = useState<'any' | 'user' | 'email' | 'ip' | 'device' | 'browser'>('any');
    const [filterActivity, setFilterActivity] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterUser, setFilterUser] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [perPage, setPerPage] = useState<string>('50');
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getActivityConfig = (activityType: string) => {
        return activityConfig[activityType] || {
            label: activityType,
            icon: 'FileText',
            color: 'text-gray-700 dark:text-gray-400',
            bgColor: 'bg-gray-100 dark:bg-gray-900/30',
        };
    };

    const getStatusConfig = (status: string) => {
        return statusConfig[status] || {
            label: status,
            icon: 'FileText',
            color: 'text-gray-700 dark:text-gray-400',
            bgColor: 'bg-gray-100 dark:bg-gray-900/30',
        };
    };

    // Get unique activity types
    const uniqueActivityTypes = useMemo(() => {
        return Array.from(new Set(activities.map(a => a.activity_type)));
    }, [activities]);

    // Filter activities
    const filteredActivities = useMemo(() => {
        return activities.filter((activity) => {
            const userIdStr = activity.user_id != null ? String(activity.user_id) : '';
            const term = searchTerm.trim().toLowerCase();
            let matchesSearch = !searchTerm;
            if (searchTerm) {
                switch (searchMode) {
                    case 'user':
                        matchesSearch = !!(activity.user_name?.toLowerCase().includes(term) || userIdStr.includes(searchTerm));
                        break;
                    case 'email':
                        matchesSearch = !!(activity.user_email?.toLowerCase().includes(term));
                        break;
                    case 'ip':
                        matchesSearch = !!(activity.ip_address?.includes(searchTerm));
                        break;
                    case 'device':
                        matchesSearch = !!(activity.device?.toLowerCase().includes(term));
                        break;
                    case 'browser':
                        matchesSearch = !!(activity.browser?.toLowerCase().includes(term));
                        break;
                    default:
                        matchesSearch = !!(
                            userIdStr.includes(searchTerm) ||
                            activity.user_name?.toLowerCase().includes(term) ||
                            activity.user_email?.toLowerCase().includes(term) ||
                            activity.ip_address?.includes(searchTerm) ||
                            activity.device?.toLowerCase().includes(term) ||
                            activity.browser?.toLowerCase().includes(term)
                        );
                }
            }

            const matchesActivity = filterActivity === 'all' || activity.activity_type === filterActivity;
            const matchesStatus = filterStatus === 'all' || activity.status === filterStatus;
            
            // Date range filter
            const activityDate = new Date(activity.created_at);
            const matchesDateFrom = !dateFrom || activityDate >= new Date(dateFrom);
            const matchesDateTo = !dateTo || activityDate <= new Date(dateTo + 'T23:59:59');

            return matchesSearch && matchesActivity && matchesStatus && matchesDateFrom && matchesDateTo;
        });
    }, [activities, searchTerm, searchMode, filterActivity, filterStatus, dateFrom, dateTo]);

    // Paginated activities
    const paginatedActivities = useMemo(() => {
        const perPageNum = parseInt(perPage, 10);
        const start = (currentPage - 1) * perPageNum;
        const end = start + perPageNum;
        return filteredActivities.slice(start, end);
    }, [filteredActivities, currentPage, perPage]);

    // Total pages
    const totalPages = useMemo(() => {
        return Math.ceil(filteredActivities.length / parseInt(perPage, 10)) || 1;
    }, [filteredActivities.length, perPage]);

    // Check if any filters are active
    const hasActiveFilters = useMemo(() => {
        return (
            searchTerm !== '' ||
            filterActivity !== 'all' ||
            filterStatus !== 'all' ||
            dateFrom !== '' ||
            dateTo !== ''
        );
    }, [searchTerm, filterActivity, filterStatus, dateFrom, dateTo]);

    // Count active advanced filters (excluding activity type which is in chips)
    const advancedFilterCount = useMemo(() => {
        let count = 0;
        if (searchTerm) count++;
        if (filterStatus !== 'all') count++;
        if (dateFrom || dateTo) count++;
        return count;
    }, [searchTerm, filterStatus, dateFrom, dateTo]);

    // Group activities by date
    const groupedActivities = useMemo(() => {
        const groups: Record<string, UserActivity[]> = {};
        paginatedActivities.forEach((activity) => {
            const date = new Date(activity.created_at);
            const dateKey = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(activity);
        });
        return groups;
    }, [paginatedActivities]);

    // Sort dates in descending order (newest first)
    const sortedDates = useMemo(() => {
        return Object.keys(groupedActivities).sort((a, b) => {
            return new Date(b).getTime() - new Date(a).getTime();
        });
    }, [groupedActivities]);

    // Clear all filters
    const clearAllFilters = useCallback(() => {
        setSearchTerm('');
        setFilterActivity('all');
        setFilterStatus('all');
        setFilterUser('all');
        setDateFrom('');
        setDateTo('');
        setCurrentPage(1);
    }, []);

    // Remove individual filter
    const removeFilter = useCallback((filterType: string) => {
        switch (filterType) {
            case 'search':
                setSearchTerm('');
                break;
            case 'activity':
                setFilterActivity('all');
                break;
            case 'status':
                setFilterStatus('all');
                break;
            case 'user':
                setFilterUser('all');
                break;
            case 'date':
                setDateFrom('');
                setDateTo('');
                break;
        }
        setCurrentPage(1);
    }, []);

    // Handle per page change
    const handlePerPageChange = useCallback((value: string) => {
        setPerPage(value);
        setCurrentPage(1);
    }, []);

    // Handle page change
    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    // Handle search
    // Search is handled automatically via filteredActivities useMemo - no Enter required

    // Export to CSV function
    const exportToCSV = useCallback(() => {
        const headers = [
            'ID',
            'User ID',
            'User Name',
            'User Email',
            'Activity Type',
            'Status',
            'IP Address',
            'Device',
            'Browser',
            'Login Time',
            'Logout Time',
            'Created At'
        ];

        const rows = filteredActivities.map(activity => [
            activity.id,
            activity.user_id,
            activity.user_name,
            activity.user_email,
            activity.activity_type,
            activity.status,
            activity.ip_address || '',
            activity.device || '',
            activity.browser || '',
            formatDate(activity.login_time),
            formatDate(activity.logout_time),
            formatDate(activity.created_at)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `user_activities_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('User activities exported to CSV');
    }, [filteredActivities]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Activities" />
            <CustomToast />

            <div className="flex flex-col overflow-hidden bg-background" style={{ height: 'calc(100vh - 80px)' }}>
                {/* YouTube-style Activity Type Filter Bar */}
                <div className="flex-shrink-0 z-20 px-3 md:px-4 py-3 bg-background border-b border-border">
                    <div className="flex items-center gap-3">
                        {/* Activity Type Chips - Horizontally Scrollable */}
                        <div className="flex-1 overflow-x-auto scrollbar-hide">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setFilterActivity('all');
                                        setCurrentPage(1);
                                    }}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                                        filterActivity === 'all'
                                            ? "bg-foreground text-background shadow-sm"
                                            : "bg-muted hover:bg-muted/80 text-foreground"
                                    )}
                                >
                                    All
                                </button>
                                {uniqueActivityTypes.map((type) => {
                                    const config = getActivityConfig(type);
                                    return (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setFilterActivity(type);
                                                setCurrentPage(1);
                                            }}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                                                filterActivity === type
                                                    ? "bg-foreground text-background shadow-sm"
                                                    : "bg-muted hover:bg-muted/80 text-foreground"
                                            )}
                                        >
                                            {config.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Search Bar - integrated with search-by dropdown */}
                        <div className="flex flex-shrink-0 min-w-[280px] w-[300px] sm:w-[360px] rounded-lg border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                            <Select value={searchMode} onValueChange={(v) => { setSearchMode(v as typeof searchMode); setCurrentPage(1); }}>
                                <SelectTrigger className="h-9 w-[100px] sm:w-[110px] shrink-0 border-0 rounded-none bg-muted/50 border-r border-border text-xs focus:ring-0 focus:ring-offset-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="any">Any</SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="ip">IP</SelectItem>
                                    <SelectItem value="device">Device</SelectItem>
                                    <SelectItem value="browser">Browser</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="text"
                                    placeholder={searchMode === 'any' ? 'Search...' : `Search by ${searchMode}...`}
                                    className="h-9 w-full min-w-0 pl-8 pr-3 border-0 rounded-none bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1); // Reset to first page when search changes
                                    }}
                                />
                            </div>
                        </div>

                        {/* Export Button - Icon Only */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 flex-shrink-0"
                            onClick={exportToCSV}
                            disabled={filteredActivities.length === 0}
                            title="Export CSV"
                        >
                            <Download className="h-4 w-4" />
                        </Button>

                        {/* Advanced Filters Sheet */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="relative h-9 w-9 p-0 flex-shrink-0"
                                    title="Filters"
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                    {advancedFilterCount > 0 && (
                                        <span
                                            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
                                            aria-label={`${advancedFilterCount} active filters`}
                                        >
                                            {advancedFilterCount}
                                        </span>
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" aria-describedby={undefined}>
                                <SheetHeader>
                                    <SheetTitle className="flex flex-wrap items-center gap-2">
                                        <span>Filters</span>
                                        {hasActiveFilters && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearAllFilters}
                                                className="h-8 text-sm hover:bg-transparent -ml-1"
                                            >
                                                Clear all
                                            </Button>
                                        )}
                                    </SheetTitle>
                                </SheetHeader>
                                
                                <div className="space-y-5 px-4 pb-6 mt-2">
                                    {/* Status Filter */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Status</label>
                                        <Select value={filterStatus} onValueChange={(value) => { setFilterStatus(value); setCurrentPage(1); }}>
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="All Statuses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                <SelectItem value="success">Success</SelectItem>
                                                <SelectItem value="failed">Failed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Date Range */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Date Range</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <span className="text-xs text-muted-foreground">From</span>
                                                <Input
                                                    type="date"
                                                    className="h-10"
                                                    value={dateFrom}
                                                    onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-xs text-muted-foreground">To</span>
                                                <Input
                                                    type="date"
                                                    className="h-10"
                                                    value={dateTo}
                                                    onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-4 pt-1 pb-2">
                    {/* Active Filter Tags */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap gap-1.5 items-center text-xs relative z-10 py-1">
                            <span className="text-muted-foreground">Filters:</span>
                            {searchTerm && (
                                <Badge variant="outline" className="h-6 gap-1 font-normal">
                                    {searchTerm.length > 15 ? searchTerm.substring(0, 15) + '...' : searchTerm}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFilter('search');
                                        }}
                                        className="ml-1 inline-flex items-center justify-center hover:text-destructive transition-colors"
                                        aria-label="Remove search filter"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )}
                            {filterActivity !== 'all' && (
                                <Badge variant="outline" className="h-6 gap-1 font-normal">
                                    {getActivityConfig(filterActivity).label}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFilter('activity');
                                        }}
                                        className="ml-1 inline-flex items-center justify-center hover:text-destructive transition-colors"
                                        aria-label="Remove activity filter"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )}
                            {filterStatus !== 'all' && (
                                <Badge variant="outline" className="h-6 gap-1 font-normal">
                                    {getStatusConfig(filterStatus).label}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFilter('status');
                                        }}
                                        className="ml-1 inline-flex items-center justify-center hover:text-destructive transition-colors"
                                        aria-label="Remove status filter"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )}
                            {(dateFrom || dateTo) && (
                                <Badge variant="outline" className="h-6 gap-1 font-normal">
                                    {dateFrom || '...'} → {dateTo || '...'}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFilter('date');
                                        }}
                                        className="ml-1 inline-flex items-center justify-center hover:text-destructive transition-colors"
                                        aria-label="Remove date filter"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Activities List */}
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        {paginatedActivities.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm font-medium">No activities found</p>
                                {hasActiveFilters ? (
                                    <div className="mt-2">
                                        <p className="text-xs">Try adjusting your filters</p>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            onClick={clearAllFilters}
                                            className="mt-2 text-xs"
                                        >
                                            Clear all filters
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-xs mt-1">No user activity entries have been recorded yet.</p>
                                )}
                            </div>
                        ) : (
                            <div className="max-w-4xl mx-auto p-6 space-y-6">
                                {sortedDates.map((dateKey, dateIndex) => {
                                    const dateLogs = groupedActivities[dateKey];
                                    const eventCount = dateLogs.length;
                                    
                                    return (
                                        <section 
                                            key={dateKey} 
                                            className={dateIndex > 0 ? 'mt-6' : ''}
                                        >
                                            {/* Date Header */}
                                            <div className="flex items-center mb-4">
                                                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                                                <h2 className="text-sm font-semibold text-gray-600">
                                                    {dateKey}
                                                </h2>
                                                <span className="ml-auto text-sm text-gray-500">
                                                    {eventCount} {eventCount === 1 ? 'event' : 'events'}
                                                </span>
                                            </div>

                                            {/* Timeline Group */}
                                            <div className="relative">
                                                {/* Timeline line */}
                                                {dateLogs.length > 1 && (
                                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                                                )}
                                                
                                                <div className="space-y-6">
                                                    {dateLogs.map((activity) => {
                                                        const activityConfigData = getActivityConfig(activity.activity_type);
                                                        const statusConfigData = getStatusConfig(activity.status);
                                                        const ActivityIcon = (LucideIcons as any)[activityConfigData.icon] || LogIn;
                                                        const StatusIcon = (LucideIcons as any)[statusConfigData.icon] || CheckCircle;
                                                        const DeviceIcon = deviceIcons[activity.device || 'Desktop'] || Monitor;

                                                        // Get user initials
                                                        const getUserInitials = () => {
                                                            if (activity.user_name) {
                                                                const parts = activity.user_name.split(' ');
                                                                if (parts.length >= 2) {
                                                                    return (parts[0][0] + parts[1][0]).toUpperCase();
                                                                }
                                                                return activity.user_name.slice(0, 2).toUpperCase();
                                                            }
                                                            return 'U';
                                                        };

                                                        // Format time only
                                                        const formatTime = (dateString: string) => {
                                                            const date = new Date(dateString);
                                                            return new Intl.DateTimeFormat('en-US', {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            }).format(date);
                                                        };

                                                        return (
                                                            <div
                                                                key={activity.id}
                                                                className="relative pl-10 group"
                                                            >
                                                                {/* Icon Circle */}
                                                                <div className={`absolute left-0 top-0 w-8 h-8 rounded-full ${activityConfigData.bgColor} border-2 border-white flex items-center justify-center z-10 shadow-sm`}>
                                                                    <ActivityIcon className={`h-4 w-4 ${activityConfigData.color}`} />
                                                                </div>

                                                                {/* Content Card */}
                                                                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
                                                                    {/* Header */}
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                            {/* User Avatar */}
                                                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                                                                <span className="text-xs font-semibold text-gray-600 uppercase">
                                                                                    {getUserInitials()}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                {/* Main info row */}
                                                                                <div className="text-sm font-semibold text-gray-900 flex items-center gap-1 flex-wrap">
                                                                                    <span className="flex-shrink-0 whitespace-nowrap">
                                                                                        {activity.user_name || activity.user_email || (activity.user_id != null ? `User #${activity.user_id}` : 'Unknown')}
                                                                                    </span>
                                                                                    <span className="text-gray-500 mx-1 flex-shrink-0">
                                                                                        {activityConfigData.label.toLowerCase()}
                                                                                    </span>
                                                                                    <span className="text-gray-600 mx-1 flex-shrink-0 bg-gray-100 rounded px-2 py-0.5 text-xs font-semibold">
                                                                                        {activity.activity_type === 'login_failed' ? 'Auth' : 'Session'}
                                                                                    </span>
                                                                                    {activity.user_id != null && (
                                                                                    <span className="text-gray-500 mx-1 flex-shrink-0 font-normal">
                                                                                        ID: {activity.user_id}
                                                                                    </span>
                                                                                    )}
                                                                                    {/* Status badge on right */}
                                                                                    <Badge 
                                                                                        variant="outline" 
                                                                                        className={`ml-auto text-xs ${statusConfigData.bgColor} ${statusConfigData.color} border-0 flex-shrink-0`}
                                                                                    >
                                                                                        <StatusIcon className="h-3 w-3 mr-1" />
                                                                                        {statusConfigData.label}
                                                                                    </Badge>
                                                                                </div>
                                                                                {/* Sub info row */}
                                                                                <div className="text-xs text-gray-500">
                                                                                    User • {formatTime(activity.created_at)}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Details Card */}
                                                                    <div className="border border-gray-200 rounded-lg py-2 px-3 bg-gray-50">
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                                                            {activity.ip_address && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-gray-500 font-medium">IP Address:</span>
                                                                                    <span className="text-gray-900">{activity.ip_address}</span>
                                                                                </div>
                                                                            )}
                                                                            {activity.device && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <DeviceIcon className="h-4 w-4 text-gray-400" />
                                                                                    <span className="text-gray-500 font-medium">Device:</span>
                                                                                    <span className="text-gray-900">{activity.device}</span>
                                                                                </div>
                                                                            )}
                                                                            {activity.browser && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-gray-500 font-medium">Browser:</span>
                                                                                    <span className="text-gray-900">{activity.browser}</span>
                                                                                </div>
                                                                            )}
                                                                            {activity.login_time && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <LogIn className="h-4 w-4 text-gray-400" />
                                                                                    <span className="text-gray-500 font-medium">Login:</span>
                                                                                    <span className="text-gray-900">{formatDate(activity.login_time)}</span>
                                                                                </div>
                                                                            )}
                                                                            {activity.logout_time && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <LogOut className="h-4 w-4 text-gray-400" />
                                                                                    <span className="text-gray-500 font-medium">Logout:</span>
                                                                                    <span className="text-gray-900">{formatDate(activity.logout_time)}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination - Fixed at bottom */}
                <div className="flex-shrink-0 bg-card border-t border-border z-30">
                    <div className="px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2">
                        {/* Per Page Selector & Showing Info - Left */}
                        <div className="flex items-center gap-2">
                            <Select value={perPage} onValueChange={handlePerPageChange}>
                                <SelectTrigger className="h-7 w-[70px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PER_PAGE_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                                Showing <span className="font-medium text-foreground">{paginatedActivities.length > 0 ? (currentPage - 1) * parseInt(perPage, 10) + 1 : 0}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * parseInt(perPage, 10), filteredActivities.length)}</span> of <span className="font-medium text-foreground">{filteredActivities.length}</span>
                            </span>
                            <span className="text-xs text-muted-foreground sm:hidden">
                                {paginatedActivities.length > 0 ? (currentPage - 1) * parseInt(perPage, 10) + 1 : 0}-{Math.min(currentPage * parseInt(perPage, 10), filteredActivities.length)} of {filteredActivities.length}
                            </span>
                        </div>

                        {/* Pagination Controls - Right (only show when more than 1 page) */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                {/* First Page Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(1)}
                                    disabled={currentPage === 1}
                                    className="h-7 px-1.5 hidden sm:flex"
                                    aria-label="First page"
                                >
                                    <ChevronsLeft className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="h-7 px-2"
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                {/* Page Numbers - Desktop */}
                                <div className="hidden sm:flex items-center gap-1">
                                    {/* First page if not in range */}
                                    {totalPages > 7 && currentPage > 4 && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(1)}
                                                className="min-w-[32px] h-7 text-xs"
                                            >
                                                1
                                            </Button>
                                            {currentPage > 5 && (
                                                <span className="px-1 text-xs text-muted-foreground">...</span>
                                            )}
                                        </>
                                    )}
                                    {/* Middle page numbers */}
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        let page: number;
                                        if (totalPages <= 5) {
                                            page = i + 1;
                                        } else if (currentPage <= 3) {
                                            page = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            page = totalPages - 4 + i;
                                        } else {
                                            page = currentPage - 2 + i;
                                        }
                                        // Skip if page is 1 or lastPage (shown separately)
                                        if (totalPages > 7 && (page === 1 || page === totalPages)) {
                                            return null;
                                        }
                                        return (
                                            <Button
                                                key={page}
                                                variant={page === currentPage ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => handlePageChange(page)}
                                                className="min-w-[32px] h-7 text-xs"
                                            >
                                                {page}
                                            </Button>
                                        );
                                    })}
                                    {/* Last page if not in range */}
                                    {totalPages > 7 && currentPage < totalPages - 3 && (
                                        <>
                                            {currentPage < totalPages - 4 && (
                                                <span className="px-1 text-xs text-muted-foreground">...</span>
                                            )}
                                            <Button
                                                variant={currentPage === totalPages ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => handlePageChange(totalPages)}
                                                className="min-w-[32px] h-7 text-xs"
                                            >
                                                {totalPages}
                                            </Button>
                                        </>
                                    )}
                                </div>
                                {/* Page Indicator - Mobile */}
                                <div className="flex sm:hidden items-center gap-1 px-2 text-xs">
                                    <span className="font-semibold text-foreground">{currentPage}</span>
                                    <span className="text-muted-foreground">/</span>
                                    <span className="text-muted-foreground">{totalPages}</span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="h-7 px-2"
                                    aria-label="Next page"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                                {/* Last Page Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="h-7 px-1.5 hidden sm:flex"
                                    aria-label="Last page"
                                >
                                    <ChevronsRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
