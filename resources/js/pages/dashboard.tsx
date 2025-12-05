import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import {
    Users,
    Clock,
    FileCheck,
    CheckCircle2,
    Cake,
    GraduationCap,
    AlertCircle,
    Bell,
    TrendingUp,
    Plus,
    Wand2,
    UserPlus,
    FileText,
    BarChart3,
    Filter,
    ArrowRight,
    Calendar,
    Building2,
    UserCog,
    Shield,
    FileWarning,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

interface DashboardProps {
    summary_cards?: Array<{
        title: string;
        value: number;
        trend?: string | null;
        icon: string;
        color: string;
        link: string;
    }>;
    recent_requests?: Array<{
        id: number;
        reference_code: string;
        request_type: string;
        requester: string;
        requester_employee_id?: string | null;
        status: string;
        submitted_at?: string;
        submitted_at_raw?: string;
    }>;
    fulfillment_queue?: Array<{
        id: number;
        reference_code: string;
        request_type: string;
        requester: string;
        requester_employee_id?: string | null;
        days_pending: number;
        is_urgent: boolean;
        submitted_at?: string;
        fulfillment_url: string;
    }>;
    employee_insights?: {
        top_departments: Array<{ name: string; count: number }>;
        on_leave_today: number;
        status_summary: Record<string, number>;
        total_active: number;
        total_inactive: number;
    };
    quick_actions?: Array<{
        label: string;
        icon: string;
        link: string;
        color: string;
    }>;
    analytics?: {
        monthly_requests?: Array<{ month: string; count: number }>;
        request_types?: Array<{ name: string; count: number }>;
        employee_growth?: Array<{ year: string; count: number }>;
    };
    notifications?: Array<{
        type: string;
        title: string;
        message: string;
        link: string;
        icon: string;
    }>;
    request_type_stats?: Array<{
        id: number;
        name: string;
        is_published: boolean;
        submissions_count: number;
        created_at?: string;
    }>;
}

const iconMap: Record<string, any> = {
    Users,
    Clock,
    FileCheck,
    CheckCircle2,
    Cake,
    GraduationCap,
    AlertCircle,
    Bell,
    TrendingUp,
    Plus,
    Wand2,
    UserPlus,
    FileText,
    BarChart3,
    Filter,
    ArrowRight,
    Calendar,
    Building2,
    UserCog,
    Shield,
    FileWarning,
};

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: {
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
    },
    amber: {
        bg: 'bg-amber-50 dark:bg-amber-950/20',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
    },
    sky: {
        bg: 'bg-sky-50 dark:bg-sky-950/20',
        text: 'text-sky-600 dark:text-sky-400',
        border: 'border-sky-200 dark:border-sky-800',
    },
    emerald: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
    },
    pink: {
        bg: 'bg-pink-50 dark:bg-pink-950/20',
        text: 'text-pink-600 dark:text-pink-400',
        border: 'border-pink-200 dark:border-pink-800',
    },
    indigo: {
        bg: 'bg-indigo-50 dark:bg-indigo-950/20',
        text: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-800',
    },
    red: {
        bg: 'bg-red-50 dark:bg-red-950/20',
        text: 'text-red-600 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800',
    },
    purple: {
        bg: 'bg-purple-50 dark:bg-purple-950/20',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
    },
};

const statusBadgeColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    fulfillment: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
};

export default function Dashboard() {
    const { auth } = usePage<SharedData>().props;
    const props = usePage<DashboardProps>().props;
    const [notificationOpen, setNotificationOpen] = useState(false);
    const permissions = auth?.permissions || [];

    const getIcon = (iconName: string) => {
        const Icon = iconMap[iconName] || FileText;
        return <Icon className="h-5 w-5" />;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header with Notifications */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">HR Dashboard</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Welcome back, {auth.user.name}! Here's your HR overview.
                        </p>
                    </div>
                    {props.notifications && props.notifications.length > 0 && (
                        <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="relative">
                                    <Bell className="h-5 w-5" />
                                    {props.notifications.length > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                                            {props.notifications.length}
                                        </span>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80">
                                <div className="p-2">
                                    <div className="mb-2 px-2 text-sm font-semibold">Notifications</div>
                                    <div className="space-y-1">
                                        {props.notifications.map((notification, idx) => {
                                            const Icon = iconMap[notification.icon] || Bell;
                                            return (
                                                <Link
                                                    key={idx}
                                                    href={notification.link}
                                                    className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted transition-colors"
                                                >
                                                    <div className={`mt-0.5 rounded-full p-1.5 ${
                                                        notification.type === 'urgent' ? 'bg-red-100 dark:bg-red-900/30' :
                                                        notification.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                                                        'bg-blue-100 dark:bg-blue-900/30'
                                                    }`}>
                                                        <Icon className={`h-4 w-4 ${
                                                            notification.type === 'urgent' ? 'text-red-600 dark:text-red-400' :
                                                            notification.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                                            'text-blue-600 dark:text-blue-400'
                                                        }`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground">{notification.title}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* 1. Top Summary Cards */}
                {props.summary_cards && props.summary_cards.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {props.summary_cards.map((card, idx) => {
                            const Icon = iconMap[card.icon] || FileText;
                            const colors = colorClasses[card.color] || colorClasses.blue;
                            return (
                                <Card key={idx} className="border-border hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                                                <p className="text-3xl font-bold text-foreground">{card.value.toLocaleString()}</p>
                                                {card.trend && (
                                                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                                        <TrendingUp className="h-3 w-3" />
                                                        {card.trend}
                                                    </p>
                                                )}
                                            </div>
                                            <div className={`rounded-lg p-3 ${colors.bg} ${colors.border} border`}>
                                                <Icon className={`h-6 w-6 ${colors.text}`} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* 2. Requests Overview & 3. Fulfillment Queue */}
                {(props.recent_requests || (props.fulfillment_queue && props.fulfillment_queue.length > 0)) && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Recent Requests */}
                        {props.recent_requests && (
                            <Card className="border-border">
                                <CardHeader className="flex flex-row items-center justify-between pb-3">
                                    <CardTitle className="text-lg font-semibold">Recent Requests</CardTitle>
                                    <Link href="/requests">
                                        <Button variant="ghost" size="sm" className="text-xs">
                                            View all
                                            <ArrowRight className="ml-1 h-3 w-3" />
                                        </Button>
                                    </Link>
                                </CardHeader>
                                <CardContent>
                                    {props.recent_requests.length > 0 ? (
                                        <div className="space-y-3">
                                            {props.recent_requests.map((request) => (
                                                <Link
                                                    key={request.id}
                                                    href={`/requests/${request.id}`}
                                                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-sm font-medium text-foreground truncate">
                                                                {request.request_type}
                                                            </p>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-xs ${statusBadgeColors[request.status] || ''}`}
                                                            >
                                                                {request.status}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {request.requester}
                                                            {request.requester_employee_id && ` (${request.requester_employee_id})`}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {request.submitted_at || 'Just now'}
                                                        </p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">No recent requests</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Fulfillment Queue */}
                        {props.fulfillment_queue && props.fulfillment_queue.length > 0 && (
                            <Card className="border-border">
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <CardTitle className="text-lg font-semibold">Fulfillment Queue</CardTitle>
                                <Link href="/requests?status=fulfillment">
                                    <Button variant="ghost" size="sm" className="text-xs">
                                        View all
                                        <ArrowRight className="ml-1 h-3 w-3" />
                                    </Button>
                                </Link>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {props.fulfillment_queue.slice(0, 5).map((item) => (
                                        <Link
                                            key={item.id}
                                            href={item.fulfillment_url}
                                            className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                                                item.is_urgent
                                                    ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/50 dark:hover:bg-red-950/30'
                                                    : 'border-border bg-card hover:bg-muted/50'
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {item.request_type}
                                                    </p>
                                                    {item.is_urgent && (
                                                        <Badge variant="outline" className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
                                                            Urgent
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.requester}
                                                    {item.requester_employee_id && ` (${item.requester_employee_id})`}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {item.days_pending} day{item.days_pending !== 1 ? 's' : ''} pending
                                                </p>
                                            </div>
                                            <FileCheck className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        )}
                    </div>
                )}

                {/* 4. Employee Insights & 5. Quick Actions */}
                {(props.employee_insights || (props.quick_actions && props.quick_actions.length > 0)) && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Employee Insights */}
                        {props.employee_insights && (
                        <Card className="border-border lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold">Employee Insights</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-2">Top Departments</p>
                                            <div className="space-y-2">
                                                {props.employee_insights.top_departments.map((dept, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-sm">
                                                        <span className="text-foreground truncate">{dept.name}</span>
                                                        <span className="font-semibold text-muted-foreground">{dept.count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-2">Status Summary</p>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-foreground">Active</span>
                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {props.employee_insights.total_active}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-foreground">Inactive</span>
                                                    <span className="font-semibold text-muted-foreground">
                                                        {props.employee_insights.total_inactive}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-foreground">On Leave Today</span>
                                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                        {props.employee_insights.on_leave_today}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Quick Actions */}
                    {props.quick_actions && props.quick_actions.length > 0 && (
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-2">
                                    {props.quick_actions.map((action, idx) => {
                                        const Icon = iconMap[action.icon] || Plus;
                                        const colors = colorClasses[action.color] || colorClasses.blue;
                                        return (
                                            <Link key={idx} href={action.link}>
                                                <Button
                                                    variant="outline"
                                                    className={`w-full h-auto flex-col gap-2 p-4 hover:shadow-md transition-all ${colors.border}`}
                                                >
                                                    <div className={`rounded-lg p-2 ${colors.bg}`}>
                                                        <Icon className={`h-5 w-5 ${colors.text}`} />
                                                    </div>
                                                    <span className="text-xs font-medium">{action.label}</span>
                                                </Button>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                        )}
                    </div>
                )}

                {/* 6. Analytics Section */}
                {props.analytics && (props.analytics.monthly_requests || props.analytics.request_types) && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Monthly Requests Chart */}
                        {props.analytics.monthly_requests && props.analytics.monthly_requests.length > 0 && (
                            <Card className="border-border">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold">Monthly HR Requests</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-end justify-between gap-2 h-48">
                                            {props.analytics.monthly_requests.map((item, idx) => {
                                                const maxCount = Math.max(...props.analytics!.monthly_requests!.map(i => i.count));
                                                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                                                return (
                                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full">
                                                        <div className="w-full flex-1 flex items-end justify-center relative">
                                                            <div
                                                                className="w-full bg-primary rounded-t transition-all hover:bg-primary/80 cursor-pointer group relative"
                                                                style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                                                                title={`${item.month}: ${item.count} request${item.count !== 1 ? 's' : ''}`}
                                                            >
                                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                                                                    <div className="bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap">
                                                                        {item.count}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground text-center whitespace-nowrap">
                                                            {item.month}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <div className="w-3 h-3 bg-primary rounded"></div>
                                                <span>Requests</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Request Types Chart */}
                        {props.analytics.request_types && props.analytics.request_types.length > 0 && hasPermission(permissions, 'access-request-types-module') && (
                            <Card className="border-border">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold">Most Common Request Types</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {props.analytics.request_types.map((type, idx) => {
                                            const maxCount = Math.max(...props.analytics!.request_types!.map(t => t.count));
                                            const width = maxCount > 0 ? (type.count / maxCount) * 100 : 0;
                                            return (
                                                <div key={idx} className="space-y-1">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-foreground font-medium">{type.name}</span>
                                                        <span className="text-muted-foreground">{type.count}</span>
                                                    </div>
                                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary transition-all"
                                                            style={{ width: `${width}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </CardContent>
                        </Card>
                        )}
                    </div>
                )}

                {/* Request Type Stats (for Dynamic Builder) */}
                {props.request_type_stats && props.request_type_stats.length > 0 && (
                    <Card className="border-border">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-semibold">Request Type Statistics</CardTitle>
                            <Link href="/request-types">
                                <Button variant="ghost" size="sm" className="text-xs">
                                    Manage Types
                                    <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {props.request_type_stats.map((type) => (
                                    <div
                                        key={type.id}
                                        className="rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="text-sm font-medium text-foreground">{type.name}</p>
                                            {type.is_published ? (
                                                <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                    Published
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs">Draft</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-1">
                                            {type.submissions_count} submission{type.submissions_count !== 1 ? 's' : ''}
                                        </p>
                                        {type.created_at && (
                                            <p className="text-xs text-muted-foreground">Created {type.created_at}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
