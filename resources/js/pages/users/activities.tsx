import { CustomToast, toast } from '@/components/custom-toast';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Clock, User, FileText, Search, Download, Calendar, LogIn, LogOut, XCircle, CheckCircle, Monitor, Smartphone, Tablet } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useState, useCallback } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'User Activities',
        href: '/users/activities',
    },
];

interface UserActivity {
    id: number;
    user_id: number;
    user_name: string;
    user_email: string;
    activity_type: 'login' | 'logout' | 'login_failed';
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
    login_failed: {
        label: 'Login Failed',
        icon: 'XCircle',
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
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
    const [filterActivity, setFilterActivity] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

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

    // Filter activities
    const filteredActivities = activities.filter((activity) => {
        const matchesSearch = !searchTerm || 
            activity.user_id.toString().includes(searchTerm) ||
            activity.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            activity.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            activity.ip_address?.includes(searchTerm) ||
            activity.device?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            activity.browser?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesActivity = filterActivity === 'all' || activity.activity_type === filterActivity;
        const matchesStatus = filterStatus === 'all' || activity.status === filterStatus;
        
        // Date range filter
        const activityDate = new Date(activity.created_at);
        const matchesDateFrom = !dateFrom || activityDate >= new Date(dateFrom);
        const matchesDateTo = !dateTo || activityDate <= new Date(dateTo + 'T23:59:59');

        return matchesSearch && matchesActivity && matchesStatus && matchesDateFrom && matchesDateTo;
    });

    // Get unique activity types
    const uniqueActivityTypes = Array.from(new Set(activities.map(a => a.activity_type)));

    // Group activities by date
    const groupedActivities = filteredActivities.reduce((acc, activity) => {
        const date = new Date(activity.created_at);
        const dateKey = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(activity);
        return acc;
    }, {} as Record<string, UserActivity[]>);

    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(groupedActivities).sort((a, b) => {
        return new Date(b).getTime() - new Date(a).getTime();
    });

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

            <div className="space-y-6">

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-lg">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by user ID, name, email, IP, device, or browser..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={filterActivity} onValueChange={setFilterActivity}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="All Activities" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Activities</SelectItem>
                            {uniqueActivityTypes.map((type) => {
                                const config = getActivityConfig(type);
                                return (
                                    <SelectItem key={type} value={type}>
                                        {config.label}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="success">Success</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 h-auto sm:h-9 py-2 sm:py-0 rounded-lg border border-border bg-muted/30 px-3">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1">
                            <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">From</label>
                                <Input
                                    type="date"
                                    className="h-9 flex-1 min-w-[140px] border-border bg-background text-sm"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                />
                            </div>
                            <div className="hidden sm:block h-4 w-px bg-border" />
                            <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">To</label>
                                <Input
                                    type="date"
                                    className="h-9 flex-1 min-w-[140px] border-border bg-background text-sm"
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
                        disabled={filteredActivities.length === 0}
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                </div>

                {/* Activities List */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    {filteredActivities.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No activities found</p>
                            {searchTerm || filterActivity !== 'all' || filterStatus !== 'all' || dateFrom || dateTo ? (
                                <p className="text-xs mt-1">Try adjusting your filters</p>
                            ) : null}
                        </div>
                    ) : (
                        <div className="relative">
                            {sortedDates.map((dateKey, dateIndex) => (
                                <div key={dateKey} className={dateIndex > 0 ? 'mt-8' : ''}>
                                    {/* Date Separator */}
                                    <div className="sticky top-0 z-10 bg-card border-b border-border py-3 px-6 dark:bg-card-dark dark:border-border-dark">
                                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                                            {dateKey}
                                        </h3>
                                    </div>
                                    
                                    {/* Timeline for this date */}
                                    <div className="relative pl-8">
                                        {/* Vertical line */}
                                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border dark:bg-border-dark"></div>
                                        
                                        {groupedActivities[dateKey].map((activity) => {
                                            const activityConfigData = getActivityConfig(activity.activity_type);
                                            const statusConfigData = getStatusConfig(activity.status);
                                            const ActivityIcon = (LucideIcons as any)[activityConfigData.icon] || LogIn;
                                            const StatusIcon = (LucideIcons as any)[statusConfigData.icon] || CheckCircle;
                                            const DeviceIcon = deviceIcons[activity.device || 'Desktop'] || Monitor;

                                            return (
                                                <div
                                                    key={activity.id}
                                                    className="relative pb-6 last:pb-4"
                                                >
                                                    {/* Timeline node */}
                                                    <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full ${activityConfigData.bgColor} border-2 border-card dark:border-card-dark flex items-center justify-center z-10`}>
                                                        <ActivityIcon className={`h-3 w-3 ${activityConfigData.color}`} />
                                                    </div>
                                                    
                                                    {/* Activity content */}
                                                    <div className="ml-6">
                                                        <div className="bg-muted/20 hover:bg-muted/30 rounded-lg p-4 transition-colors border border-border/50 dark:bg-muted-dark/20 dark:hover:bg-muted-dark/30 dark:border-border-dark/50">
                                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                                <div className="flex-1">
                                                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                                                        <Badge variant="outline" className={`text-xs ${activityConfigData.bgColor} ${activityConfigData.color} border-0`}>
                                                                            {activityConfigData.label}
                                                                        </Badge>
                                                                        <Badge variant="outline" className={`text-xs ${statusConfigData.bgColor} ${statusConfigData.color} border-0`}>
                                                                            <StatusIcon className="h-3 w-3 mr-1" />
                                                                            {statusConfigData.label}
                                                                        </Badge>
                                                                        <span className="text-sm font-medium text-foreground">
                                                                            {activity.user_name || activity.user_email || `User #${activity.user_id}`}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    {/* Activity details */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                                        <div className="flex items-center gap-2">
                                                                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                                            <span className="text-muted-foreground">User ID:</span>
                                                                            <span className="font-semibold text-foreground">{activity.user_id}</span>
                                                                        </div>
                                                                        {activity.login_time && (
                                                                            <div className="flex items-center gap-2">
                                                                                <LogIn className="h-3.5 w-3.5 text-muted-foreground" />
                                                                                <span className="text-muted-foreground">Login:</span>
                                                                                <span className="font-semibold text-foreground">{formatDate(activity.login_time)}</span>
                                                                            </div>
                                                                        )}
                                                                        {activity.logout_time && (
                                                                            <div className="flex items-center gap-2">
                                                                                <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
                                                                                <span className="text-muted-foreground">Logout:</span>
                                                                                <span className="font-semibold text-foreground">{formatDate(activity.logout_time)}</span>
                                                                            </div>
                                                                        )}
                                                                        {activity.ip_address && (
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-muted-foreground">IP:</span>
                                                                                <span className="font-semibold text-foreground">{activity.ip_address}</span>
                                                                            </div>
                                                                        )}
                                                                        {activity.device && (
                                                                            <div className="flex items-center gap-2">
                                                                                <DeviceIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                                                <span className="text-muted-foreground">Device:</span>
                                                                                <span className="font-semibold text-foreground">{activity.device}</span>
                                                                            </div>
                                                                        )}
                                                                        {activity.browser && (
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-muted-foreground">Browser:</span>
                                                                                <span className="font-semibold text-foreground">{activity.browser}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50 dark:border-border-dark/50">
                                                                <span className="flex items-center gap-1.5">
                                                                    <Clock className="h-3.5 w-3.5" />
                                                                    {formatDate(activity.created_at)}
                                                                </span>
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
                {filteredActivities.length > 0 && (
                    <div className="text-sm text-muted-foreground text-center">
                        Showing {filteredActivities.length} of {activities.length} activity entries
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

