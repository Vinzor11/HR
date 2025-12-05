import { CustomToast, toast } from '@/components/custom-toast';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Clock, User, FileText, RefreshCw, Building, Briefcase, Trash2, Eye, Plus, Edit, Search, Download, Calendar } from 'lucide-react';
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
        title: 'Employee Logs',
        href: '/employees/logs',
    },
];

interface EmployeeLog {
  record_id: number;
  employee_id: string;
  reference_number?: string;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE';
  field_changed?: string;
  old_value?: any;
  new_value?: any;
  action_date: string;
  performed_by: string;
  employee?: {
    id: string;
    first_name: string;
    surname: string;
    middle_name?: string;
  };
}

interface EmployeeLogsProps {
    logs: EmployeeLog[];
    employees?: Array<{ id: string; first_name: string; surname: string }>;
}

const actionConfig: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
    CREATE: {
        label: 'Created',
        icon: 'Plus',
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    UPDATE: {
        label: 'Updated',
        icon: 'Edit',
        color: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    DELETE: {
        label: 'Deleted',
        icon: 'Trash2',
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
};

export default function EmployeeLogs() {
    const { logs = [], employees = [] } = usePage<EmployeeLogsProps>().props;
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getActionConfig = (actionType: string) => {
        return actionConfig[actionType] || {
            label: actionType,
            icon: 'FileText',
            color: 'text-gray-700 dark:text-gray-400',
            bgColor: 'bg-gray-100 dark:bg-gray-900/30',
        };
    };

    const renderValue = (value: any) => {
        if (value === null || value === undefined) {
            return <span className="text-muted-foreground italic">null</span>;
        }
        if (typeof value === 'object') {
            return (
                <pre className="text-xs bg-muted/30 p-2 rounded overflow-x-auto">
                    {JSON.stringify(value, null, 2)}
                </pre>
            );
        }
        return <span className="text-foreground">{String(value)}</span>;
    };

    const renderFieldChange = (log: EmployeeLog) => {
        if (log.action_type === 'CREATE') {
            return (
                <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                    <div className="font-medium text-muted-foreground mb-1">New Record:</div>
                    <div className="text-foreground">
                        {renderValue(log.new_value)}
                    </div>
                </div>
            );
        }
        
        if (log.action_type === 'DELETE') {
            // Extract employee ID from log
            const employeeId = log.employee_id;
            
            // Determine if it's a soft delete (employee still exists) or permanent delete (employee doesn't exist)
            const isPermanentDelete = !log.employee;
            const detailsText = isPermanentDelete 
                ? 'Details: Full record permanently deleted.'
                : 'Details: Full record archived for recovery.';
            
            return (
                <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border/50 dark:border-border-dark/50">
                    <div className="space-y-2.5">
                        <div className="text-sm font-medium text-foreground mb-2">
                            Employee Record Deleted
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                            {detailsText}
                        </div>
                        <div className="text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-medium">Employee ID:</span>
                                <span className="font-semibold text-foreground">{employeeId}</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        
        // UPDATE action
        if (log.field_changed) {
            // Special handling for restore action
            if (log.field_changed === 'restored') {
                return (
                    <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                        <div className="font-medium text-muted-foreground mb-1">Restored Employee:</div>
                        <div className="text-foreground text-xs">
                            Employee was restored from soft deletion
                        </div>
                    </div>
                );
            }
            
            // Format field name for display
            const fieldName = log.field_changed
                .replace(/_/g, ' ')
                .replace(/\bid\b/gi, '')
                .trim()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            return (
                <div className="mt-2 p-2 bg-muted/30 rounded text-xs space-y-1">
                    <div className="font-medium text-muted-foreground">
                        Field: <span className="text-foreground">{fieldName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Old Value:</div>
                            {renderValue(log.old_value)}
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">New Value:</div>
                            {renderValue(log.new_value)}
                        </div>
                    </div>
                </div>
            );
        }
        
        return null;
    };

    // Filter logs
    const filteredLogs = logs.filter((log) => {
        const matchesSearch = !searchTerm || 
            log.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.field_changed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.performed_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.employee?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.employee?.surname?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesAction = filterAction === 'all' || log.action_type === filterAction;
        
        // Date range filter
        const logDate = new Date(log.action_date);
        const matchesDateFrom = !dateFrom || logDate >= new Date(dateFrom);
        const matchesDateTo = !dateTo || logDate <= new Date(dateTo + 'T23:59:59'); // Include entire end date

        return matchesSearch && matchesAction && matchesDateFrom && matchesDateTo;
    });

    const uniqueActions = Array.from(new Set(logs.map(log => log.action_type)));

    // Group logs by date
    const groupedLogs = filteredLogs.reduce((acc, log) => {
        const date = new Date(log.action_date);
        const dateKey = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(log);
        return acc;
    }, {} as Record<string, EmployeeLog[]>);

    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(groupedLogs).sort((a, b) => {
        return new Date(b).getTime() - new Date(a).getTime();
    });

    // Export to CSV function
    const exportToCSV = useCallback(() => {
        const headers = [
            'Record ID',
            'Reference Number',
            'Employee ID',
            'Employee Name',
            'Action Type',
            'Field Changed',
            'Old Value',
            'New Value',
            'Action Date',
            'Performed By'
        ];

        const formatValueForCSV = (value: any): string => {
            if (value === null || value === undefined) {
                return '';
            }
            if (typeof value === 'object') {
                return JSON.stringify(value);
            }
            return String(value);
        };

        const rows = filteredLogs.map(log => {
            const employeeName = log.employee 
                ? `${log.employee.first_name} ${log.employee.middle_name || ''} ${log.employee.surname}`.trim()
                : '';
            
            return [
                log.record_id,
                log.reference_number || '',
                log.employee_id,
                employeeName,
                log.action_type,
                log.field_changed || '',
                formatValueForCSV(log.old_value),
                formatValueForCSV(log.new_value),
                formatDate(log.action_date),
                log.performed_by
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `employee_logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Employee logs exported to CSV');
    }, [filteredLogs]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Employee Logs" />
            <CustomToast />

            <div className="space-y-6">

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-lg">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search by employee ID, name, description, or user..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={filterAction} onValueChange={setFilterAction}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="All Actions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            {uniqueActions.map((action) => {
                                const config = getActionConfig(action);
                                return (
                                    <SelectItem key={action} value={action}>
                                        {config.label}
                                    </SelectItem>
                                );
                            })}
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
                            {searchTerm || filterAction !== 'all' || dateFrom || dateTo ? (
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
                                        
                                        {groupedLogs[dateKey].map((log, logIndex) => {
                                            const config = getActionConfig(log.action_type);
                                            const IconComponent = (LucideIcons as any)[config.icon] || LucideIcons.FileText;

                                            return (
                                                <div
                                                    key={log.record_id}
                                                    className="relative pb-6 last:pb-4"
                                                >
                                                    {/* Timeline node */}
                                                    <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full ${config.bgColor} border-2 border-card dark:border-card-dark flex items-center justify-center z-10`}>
                                                        <IconComponent className={`h-3 w-3 ${config.color}`} />
                                                    </div>
                                                    
                                                    {/* Log content */}
                                                    <div className="ml-6">
                                                        <div className="bg-muted/20 hover:bg-muted/30 rounded-lg p-4 transition-colors border border-border/50 dark:bg-muted-dark/20 dark:hover:bg-muted-dark/30 dark:border-border-dark/50">
                                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                                <div className="flex-1">
                                                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                        <Badge variant="outline" className={`text-xs ${config.bgColor} ${config.color} border-0`}>
                                                                            {config.label}
                                                                        </Badge>
                                                                        <span className="text-sm font-medium text-foreground">
                                                                            {log.employee_id}
                                                                        </span>
                                                                        {log.reference_number && (
                                                                            <span className="text-xs text-muted-foreground">Ref: {log.reference_number}</span>
                                                                        )}
                                                                    </div>
                                                                    {renderFieldChange(log)}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50 dark:border-border-dark/50">
                                                                <span className="flex items-center gap-1.5">
                                                                    <User className="h-3.5 w-3.5" />
                                                                    {log.performed_by}
                                                                </span>
                                                                <span className="flex items-center gap-1.5">
                                                                    <Clock className="h-3.5 w-3.5" />
                                                                    {formatDate(log.action_date)}
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
                {filteredLogs.length > 0 && (
                    <div className="text-sm text-muted-foreground text-center">
                        Showing {filteredLogs.length} of {logs.length} log entries
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

