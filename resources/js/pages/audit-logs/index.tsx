import { CustomToast, toast } from '@/components/custom-toast';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Clock, User, FileText, Search, Download, Calendar, RotateCcw, XCircle, Plus, Edit, Trash2, Eye, Check, ChevronLeft, ChevronRight, Activity, Filter, FileDown, Save, Upload, Lock, Unlock, Send, Mail, Share2, Copy, Archive, ArchiveRestore, Ban, Shield, AlertCircle, Info, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
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

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Audit Logs',
        href: '/audit-logs',
    },
];

interface AuditLog {
    id: number;
    user_id: number | null;
    action: string;
    module: string;
    entity_type: string;
    entity_id: string | null;
    description: string;
    old_values?: any;
    new_values?: any;
    snapshot?: any;
    user_agent?: string | null;
    reference_number?: string | null;
    created_at: string;
    entity_name?: string | null;
    user?: {
        id: number;
        name: string;
        email: string;
        roles?: Array<{
            id: number;
            name: string;
        }>;
    };
}

interface AuditLogsProps {
    logs: {
        data: AuditLog[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
    };
    filters: {
        module?: string;
        action?: string;
        user_id?: string;
        entity_type?: string;
        entity_id?: string;
        search?: string;
        date_from?: string;
        date_to?: string;
    };
    modules: string[];
    actions: string[];
    entityTypes: string[];
    users: Array<{ id: number; name: string; email: string }>;
}

const actionConfig: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
    created: {
        label: 'Created',
        icon: 'Plus',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
    },
    updated: {
        label: 'Updated',
        icon: 'Edit',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
    },
    'soft-deleted': {
        label: 'Soft Deleted',
        icon: 'Archive',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
    },
    'permanently-deleted': {
        label: 'Permanently Deleted',
        icon: 'Trash2',
        color: 'text-red-700',
        bgColor: 'bg-red-200',
    },
    viewed: {
        label: 'Viewed',
        icon: 'Eye',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
    },
    approved: {
        label: 'Approved',
        icon: 'Check',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
    },
    rejected: {
        label: 'Rejected',
        icon: 'XCircle',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
    },
    restored: {
        label: 'Restored',
        icon: 'RotateCcw',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
    },
    exported: {
        label: 'Exported',
        icon: 'Download',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
    },
};

export default function AuditLogs() {
    const { logs, filters: initialFilters, modules, actions, entityTypes, users } = usePage<AuditLogsProps>().props;
    
    const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
    const [filterModule, setFilterModule] = useState(initialFilters.module || 'all');
    const [filterAction, setFilterAction] = useState(initialFilters.action || 'all');
    const [filterUser, setFilterUser] = useState(initialFilters.user_id || 'all');
    const [dateFrom, setDateFrom] = useState(initialFilters.date_from || '');
    const [dateTo, setDateTo] = useState(initialFilters.date_to || '');
    const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

    const applyFilters = useCallback(() => {
        const params: any = {};
        if (searchTerm) params.search = searchTerm;
        if (filterModule !== 'all') params.module = filterModule;
        if (filterAction !== 'all') params.action = filterAction;
        if (filterUser !== 'all') params.user_id = filterUser;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;

        router.get('/audit-logs', params, {
            preserveState: true,
            preserveScroll: true,
        });
    }, [searchTerm, filterModule, filterAction, filterUser, dateFrom, dateTo]);

    const handleSearch = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    }, [applyFilters]);

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

    // Get entity code from snapshot, old_values, or new_values
    const getEntityCode = (log: AuditLog): string | null => {
        // Try to get code from snapshot first (most reliable)
        if (log.snapshot) {
            if (log.entity_type === 'Faculty' && log.snapshot.code) {
                return log.snapshot.code;
            }
            if ((log.entity_type === 'Department' || log.entity_type === 'Office') && log.snapshot.code) {
                return log.snapshot.code;
            }
            if (log.entity_type === 'Position' && log.snapshot.pos_code) {
                return log.snapshot.pos_code;
            }
        }
        
        // Try new_values (for created/restored)
        if (log.new_values) {
            if (log.entity_type === 'Faculty' && log.new_values.code) {
                return log.new_values.code;
            }
            if ((log.entity_type === 'Department' || log.entity_type === 'Office') && log.new_values.code) {
                return log.new_values.code;
            }
            if (log.entity_type === 'Position' && log.new_values.pos_code) {
                return log.new_values.pos_code;
            }
        }
        
        // Try old_values (for deleted)
        if (log.old_values) {
            if (log.entity_type === 'Faculty' && log.old_values.code) {
                return log.old_values.code;
            }
            if ((log.entity_type === 'Department' || log.entity_type === 'Office') && log.old_values.code) {
                return log.old_values.code;
            }
            if (log.entity_type === 'Position' && log.old_values.pos_code) {
                return log.old_values.pos_code;
            }
        }
        
        return null;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getActionConfig = (action: string, description?: string) => {
        const actionLower = action.toLowerCase();
        
        // Check if action exists in config
        if (actionConfig[actionLower]) {
            return actionConfig[actionLower];
        }
        
        // Map common action patterns to appropriate icons
        const actionIconMap: Record<string, { icon: string; color: string; bgColor: string }> = {
            // Create variations
            'create': { icon: 'Plus', color: 'text-green-600', bgColor: 'bg-green-100' },
            'add': { icon: 'Plus', color: 'text-green-600', bgColor: 'bg-green-100' },
            'insert': { icon: 'Plus', color: 'text-green-600', bgColor: 'bg-green-100' },
            'new': { icon: 'Plus', color: 'text-green-600', bgColor: 'bg-green-100' },
            
            // Update variations
            'update': { icon: 'Edit', color: 'text-blue-600', bgColor: 'bg-blue-100' },
            'modify': { icon: 'Edit', color: 'text-blue-600', bgColor: 'bg-blue-100' },
            'change': { icon: 'Edit', color: 'text-blue-600', bgColor: 'bg-blue-100' },
            'edit': { icon: 'Edit', color: 'text-blue-600', bgColor: 'bg-blue-100' },
            'save': { icon: 'Save', color: 'text-blue-600', bgColor: 'bg-blue-100' },
            
            // Delete variations
            'delete': { icon: 'Trash2', color: 'text-red-600', bgColor: 'bg-red-100' },
            'soft-delete': { icon: 'Trash2', color: 'text-red-600', bgColor: 'bg-red-100' },
            'permanently-delete': { icon: 'Trash2', color: 'text-red-700', bgColor: 'bg-red-200' },
            'remove': { icon: 'Trash2', color: 'text-red-600', bgColor: 'bg-red-100' },
            'destroy': { icon: 'Trash2', color: 'text-red-600', bgColor: 'bg-red-100' },
            'archive': { icon: 'Archive', color: 'text-orange-600', bgColor: 'bg-orange-100' },
            
            // View variations
            'view': { icon: 'Eye', color: 'text-gray-600', bgColor: 'bg-gray-100' },
            'read': { icon: 'Eye', color: 'text-gray-600', bgColor: 'bg-gray-100' },
            'show': { icon: 'Eye', color: 'text-gray-600', bgColor: 'bg-gray-100' },
            'display': { icon: 'Eye', color: 'text-gray-600', bgColor: 'bg-gray-100' },
            
            // Approval variations
            'approve': { icon: 'Check', color: 'text-green-600', bgColor: 'bg-green-100' },
            'accept': { icon: 'Check', color: 'text-green-600', bgColor: 'bg-green-100' },
            'confirm': { icon: 'Check', color: 'text-green-600', bgColor: 'bg-green-100' },
            
            // Rejection variations
            'reject': { icon: 'XCircle', color: 'text-red-600', bgColor: 'bg-red-100' },
            'deny': { icon: 'XCircle', color: 'text-red-600', bgColor: 'bg-red-100' },
            'decline': { icon: 'XCircle', color: 'text-red-600', bgColor: 'bg-red-100' },
            'cancel': { icon: 'XCircle', color: 'text-red-600', bgColor: 'bg-red-100' },
            
            // Restore variations
            'restore': { icon: 'RotateCcw', color: 'text-purple-600', bgColor: 'bg-purple-100' },
            'recover': { icon: 'RotateCcw', color: 'text-purple-600', bgColor: 'bg-purple-100' },
            'unarchive': { icon: 'ArchiveRestore', color: 'text-purple-600', bgColor: 'bg-purple-100' },
            'reactivate': { icon: 'RotateCcw', color: 'text-purple-600', bgColor: 'bg-purple-100' },
            
            // Export/Import variations
            'export': { icon: 'Download', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
            'import': { icon: 'Upload', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
            'download': { icon: 'Download', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
            'upload': { icon: 'Upload', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
            
            // Security variations
            'lock': { icon: 'Lock', color: 'text-orange-600', bgColor: 'bg-orange-100' },
            'unlock': { icon: 'Unlock', color: 'text-green-600', bgColor: 'bg-green-100' },
            'ban': { icon: 'Ban', color: 'text-red-600', bgColor: 'bg-red-100' },
            'unban': { icon: 'Unlock', color: 'text-green-600', bgColor: 'bg-green-100' },
            
            // Communication variations
            'send': { icon: 'Send', color: 'text-blue-600', bgColor: 'bg-blue-100' },
            'email': { icon: 'Mail', color: 'text-blue-600', bgColor: 'bg-blue-100' },
            'share': { icon: 'Share2', color: 'text-blue-600', bgColor: 'bg-blue-100' },
            'copy': { icon: 'Copy', color: 'text-gray-600', bgColor: 'bg-gray-100' },
            
            // Security/Protection
            'protect': { icon: 'Shield', color: 'text-blue-600', bgColor: 'bg-blue-100' },
            'secure': { icon: 'Shield', color: 'text-blue-600', bgColor: 'bg-blue-100' },
        };
        
        // Try to find a match in the action icon map
        for (const [key, config] of Object.entries(actionIconMap)) {
            if (actionLower.includes(key)) {
                return {
                    label: action.charAt(0).toUpperCase() + action.slice(1),
                    ...config,
                };
            }
        }
        
        // Default fallback for unknown actions
        return {
            label: action.charAt(0).toUpperCase() + action.slice(1),
            icon: 'Info',
            color: 'text-gray-600',
            bgColor: 'bg-gray-100',
        };
    };

    const renderValue = (value: any) => {
        if (value === null || value === undefined) {
            return <span className="text-muted-foreground italic">null</span>;
        }
        
        // Handle arrays - display as comma-separated text
        if (Array.isArray(value)) {
            return <span className="text-foreground">{value.join(', ')}</span>;
        }
        
        // Handle objects - display as JSON only if it's a complex object
        if (typeof value === 'object') {
            // If it's a simple object with just one key-value pair, show it simply
            const keys = Object.keys(value);
            if (keys.length === 1) {
                const key = keys[0];
                const val = value[key];
                // If the value is an array, join it
                if (Array.isArray(val)) {
                    return <span className="text-foreground">{key}: {val.join(', ')}</span>;
                }
                return <span className="text-foreground">{key}: {String(val)}</span>;
            }
            // For complex objects, show as formatted JSON
            return (
                <pre className="text-xs bg-muted/30 p-2 rounded overflow-x-auto">
                    {JSON.stringify(value, null, 2)}
                </pre>
            );
        }
        
        return <span className="text-foreground">{String(value)}</span>;
    };

    const formatValueForDisplay = (value: any): string => {
        if (value === null || value === undefined) {
            return '';
        }
        if (Array.isArray(value)) {
            return value.map(v => formatValueForDisplay(v)).join(', ');
        }
        if (typeof value === 'object') {
            // If it's an object with a single key-value pair, show just the value
            const keys = Object.keys(value);
            if (keys.length === 1) {
                const val = value[keys[0]];
                return Array.isArray(val) ? val.map(v => formatValueForDisplay(v)).join(', ') : formatValueForDisplay(val);
            }
            return JSON.stringify(value);
        }
        
        // Format numbers with comma separators
        const strValue = String(value);
        // Check if it's a number (integer or decimal)
        if (/^-?\d+\.?\d*$/.test(strValue.trim())) {
            const numValue = parseFloat(strValue);
            if (!isNaN(numValue)) {
                // Format with commas for thousands separator
                return numValue.toLocaleString('en-US', {
                    minimumFractionDigits: strValue.includes('.') ? 2 : 0,
                    maximumFractionDigits: strValue.includes('.') ? 2 : 0,
                });
            }
        }
        
        return strValue;
    };

    const renderChanges = (log: AuditLog) => {
        // Show description for actions that have standardized descriptions
        // Match the styling of updated action's field change cards
        if (log.action === 'created' && log.description) {
            return (
                <div className="mt-4 border border-gray-200 rounded-lg py-2 px-3 bg-gray-50">
                    <div className="flex items-center min-h-[40px]">
                        <p className="text-sm text-gray-700">
                            {log.description}
                        </p>
                    </div>
                </div>
            );
        }

        // Show description for soft-deleted actions
        if (log.action === 'soft-deleted' && log.description) {
            return (
                <div className="mt-4 border border-gray-200 rounded-lg py-2 px-3 bg-gray-50">
                    <div className="flex items-center min-h-[40px]">
                        <p className="text-sm text-gray-700">
                            {log.description}
                        </p>
                    </div>
                </div>
            );
        }

        // Show description for permanently-deleted actions
        if (log.action === 'permanently-deleted' && log.description) {
            return (
                <div className="mt-4 border border-gray-200 rounded-lg py-2 px-3 bg-gray-50">
                    <div className="flex items-center min-h-[40px]">
                        <p className="text-sm text-gray-700">
                            {log.description}
                        </p>
                    </div>
                </div>
            );
        }

        // Show description for restored actions
        if (log.action === 'restored' && log.description) {
            return (
                <div className="mt-4 border border-gray-200 rounded-lg py-2 px-3 bg-gray-50">
                    <div className="flex items-center min-h-[40px]">
                        <p className="text-sm text-gray-700">
                            {log.description}
                        </p>
                    </div>
                </div>
            );
        }

        // If no old_values or new_values, return null
        if (!log.old_values && !log.new_values) {
            return null;
        }

        // Fields to exclude from audit display (not relevant for auditing)
        const excludedFields = [
            'created_at',
            'updated_at',
            'deleted_at',
            'guard_name',
            'id', // Entity ID is already shown in header
            'remember_token',
            'email_verified_at',
            'two_factor_secret',
            'two_factor_recovery_codes',
            'two_factor_confirmed_at',
        ];

        // If both old and new values exist, show field-by-field changes
        if (log.old_values && log.new_values && typeof log.old_values === 'object' && typeof log.new_values === 'object') {
            const oldKeys = Object.keys(log.old_values);
            const newKeys = Object.keys(log.new_values);
            const allKeys = Array.from(new Set([...oldKeys, ...newKeys]))
                .filter(key => !excludedFields.includes(key.toLowerCase())); // Filter out excluded fields

            if (allKeys.length === 0) return null;

            return (
                <div className="mt-4 space-y-3">
                    {allKeys.map((key) => {
                        const oldVal = log.old_values?.[key];
                        const newVal = log.new_values?.[key];
                        
                        if (oldVal === newVal) return null;

                        const fieldName = key.replace(/_/g, ' ').toUpperCase();
                        
                        // Check if this is an array diff change (for checkboxes/arrays)
                        const isArrayDiff = oldVal?._change_type === 'array_diff' || newVal?._change_type === 'array_diff';
                        
                        if (isArrayDiff) {
                            const added = oldVal?._added || newVal?._added || [];
                            const removed = oldVal?._removed || newVal?._removed || [];
                            
                            return (
                                <div key={key} className="field-change-row border border-gray-200 rounded-lg py-2 px-3 bg-gray-50">
                                    <div className="mb-2">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            {fieldName}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {added.length > 0 && (
                                            <div className="flex items-start gap-2">
                                                <span className="text-xs font-medium text-green-700 flex-shrink-0">Added:</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {added.map((item: string, idx: number) => (
                                                        <span key={idx} className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                                                            {item}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {removed.length > 0 && (
                                            <div className="flex items-start gap-2">
                                                <span className="text-xs font-medium text-red-700 flex-shrink-0">Removed:</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {removed.map((item: string, idx: number) => (
                                                        <span key={idx} className="inline-block bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded line-through">
                                                            {item}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                        
                        const oldValueText = formatValueForDisplay(oldVal);
                        const newValueText = formatValueForDisplay(newVal);
                        
                        // Create unique key for this field in this log
                        const fieldKey = `${log.id}-${key}`;
                        const isExpanded = expandedFields.has(fieldKey);
                        
                        // Check if content is long (more than 50 characters for arrays, 100 for strings)
                        const isLongContent = Array.isArray(oldVal) || Array.isArray(newVal) 
                            ? (oldValueText.length > 50 || newValueText.length > 50)
                            : (oldValueText.length > 100 || newValueText.length > 100);

                        return (
                            <div 
                                key={key} 
                                className="field-change-row border border-gray-200 rounded-lg py-2 px-3 bg-gray-50"
                            >
                                {/* Desktop Layout: Horizontal */}
                                <div className="hidden sm:block">
                                    <div className="flex items-center gap-4 min-h-[40px]">
                                        {/* LEFT: Field Label */}
                                        <div className="flex-shrink-0 w-32">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                {fieldName}
                                            </span>
                                        </div>

                                        {/* CENTER: Old Value */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-red-700 rounded-md px-4 py-2.5 text-sm font-medium">
                                                {isExpanded ? (
                                                    <span className="block break-words whitespace-normal">
                                                        {oldValueText || <span className="text-gray-400 italic">(empty)</span>}
                                                    </span>
                                                ) : (
                                                    <span className="block truncate" title={oldValueText || '(empty)'}>
                                                        {oldValueText || <span className="text-gray-400 italic">(empty)</span>}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Arrow Separator */}
                                        <div className="flex-shrink-0 flex items-center justify-center w-8">
                                            <ArrowRight className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        </div>

                                        {/* RIGHT: New Value */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-green-700 rounded-md px-4 py-2.5 text-sm font-medium">
                                                {isExpanded ? (
                                                    <span className="block break-words whitespace-normal">
                                                        {newValueText || <span className="text-gray-400 italic">(empty)</span>}
                                                    </span>
                                                ) : (
                                                    <span className="block truncate" title={newValueText || '(empty)'}>
                                                        {newValueText || <span className="text-gray-400 italic">(empty)</span>}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Expand/Collapse Button */}
                                        {isLongContent && (
                                            <div className="flex-shrink-0">
                                                <button
                                                    onClick={() => {
                                                        const newExpanded = new Set(expandedFields);
                                                        if (isExpanded) {
                                                            newExpanded.delete(fieldKey);
                                                        } else {
                                                            newExpanded.add(fieldKey);
                                                        }
                                                        setExpandedFields(newExpanded);
                                                    }}
                                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-4 w-4 text-gray-600" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4 text-gray-600" />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Mobile Layout: Vertical Stack */}
                                <div className="sm:hidden space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            {fieldName}
                                        </span>
                                        {isLongContent && (
                                            <button
                                                onClick={() => {
                                                    const newExpanded = new Set(expandedFields);
                                                    if (isExpanded) {
                                                        newExpanded.delete(fieldKey);
                                                    } else {
                                                        newExpanded.add(fieldKey);
                                                    }
                                                    setExpandedFields(newExpanded);
                                                }}
                                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                            >
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4 text-gray-600" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-gray-600" />
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {/* Old Value */}
                                    <div className="text-red-700 rounded-md px-4 py-2.5 text-sm font-medium">
                                        <div className="text-xs text-gray-500 mb-1">Old Value:</div>
                                        {isExpanded ? (
                                            <span className="break-words whitespace-normal block">{oldValueText || <span className="text-gray-400 italic">(empty)</span>}</span>
                                        ) : (
                                            <span className="truncate block" title={oldValueText || '(empty)'}>{oldValueText || <span className="text-gray-400 italic">(empty)</span>}</span>
                                        )}
                                    </div>

                                    {/* Arrow (centered) */}
                                    <div className="flex justify-center">
                                        <ArrowRight className="h-5 w-5 text-gray-400 rotate-90" aria-hidden="true" />
                                    </div>

                                    {/* New Value */}
                                    <div className="text-green-700 rounded-md px-4 py-2.5 text-sm font-medium">
                                        <div className="text-xs text-gray-500 mb-1">New Value:</div>
                                        {isExpanded ? (
                                            <span className="break-words whitespace-normal block">{newValueText || <span className="text-gray-400 italic">(empty)</span>}</span>
                                        ) : (
                                            <span className="truncate block" title={newValueText || '(empty)'}>{newValueText || <span className="text-gray-400 italic">(empty)</span>}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        // Simple old/new display for non-object values
        return (
            <div className="mt-4 space-y-3">
                {log.old_values && (
                    <div className="border border-gray-200 rounded-lg py-2 px-3 bg-gray-50">
                        <div className="text-red-700 rounded-md px-4 py-2.5 text-sm font-medium">
                            <div className="text-xs text-gray-500 mb-1 uppercase">Old Value:</div>
                            {renderValue(log.old_values)}
                        </div>
                    </div>
                )}
                {log.new_values && (
                    <div className="border border-gray-200 rounded-lg py-2 px-3 bg-gray-50">
                        <div className="text-green-700 rounded-md px-4 py-2.5 text-sm font-medium">
                            <div className="text-xs text-gray-500 mb-1 uppercase">New Value:</div>
                            {renderValue(log.new_values)}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Group logs by date
    const groupedLogs = useMemo(() => {
        const groups: Record<string, AuditLog[]> = {};
        logs.data.forEach((log) => {
            const date = new Date(log.created_at);
            const dateKey = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(log);
        });
        return groups;
    }, [logs.data]);

    // Sort dates in descending order
    const sortedDates = useMemo(() => {
        return Object.keys(groupedLogs).sort((a, b) => {
            return new Date(b).getTime() - new Date(a).getTime();
        });
    }, [groupedLogs]);

    // Helper function to format value for CSV export
    const formatValueForCSV = (value: any): string => {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return 'N/A';
            }
            return value.map(v => formatValueForCSV(v)).join(', ');
        }
        if (typeof value === 'object') {
            // Handle array_diff format
            if (value._change_type === 'array_diff') {
                const parts = [];
                if (value._added && value._added.length > 0) {
                    parts.push(`Added: ${value._added.join(', ')}`);
                }
                if (value._removed && value._removed.length > 0) {
                    parts.push(`Removed: ${value._removed.join(', ')}`);
                }
                return parts.join('; ') || 'N/A';
            }
            // If it's an object with a single key-value pair, show just the value
            const keys = Object.keys(value);
            if (keys.length === 1) {
                const val = value[keys[0]];
                return Array.isArray(val) ? val.map(v => formatValueForCSV(v)).join(', ') : formatValueForCSV(val);
            }
            return JSON.stringify(value);
        }
        const strValue = String(value);
        return strValue.trim() === '' ? 'N/A' : strValue;
    };

    // Export to CSV
    const exportToCSV = useCallback(() => {
        const headers = [
            'Date & Time',
            'Performed By',
            'User Role',
            'Action',
            'Module',
            'Target Record Type',
            'Target Record ID',
            'Field Changed',
            'Old Value',
            'New Value',
            'Description',
            'Reference Number'
        ];

        const excludedFields = [
            'created_at',
            'updated_at',
            'deleted_at',
            'guard_name',
            'id',
            'remember_token',
            'email_verified_at',
            'two_factor_secret',
            'two_factor_recovery_codes',
            'two_factor_confirmed_at',
        ];

        const rows: string[][] = [];

        logs.data.forEach(log => {
            const date = new Date(log.created_at);
            const formattedDate = date.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            const baseRow = [
                formattedDate,
                getUserName(log),
                getUserRole(log),
                getActionConfig(log.action).label,
                formatModule(log.module),
                log.entity_type || 'N/A',
                log.entity_id || 'N/A',
                '', // Field Changed - will be filled per field
                '', // Old Value - will be filled per field
                '', // New Value - will be filled per field
                log.description || 'N/A',
                log.reference_number || 'N/A'
            ];

            // If there are old_values and new_values, create a row for each field changed
            if (log.old_values && log.new_values && typeof log.old_values === 'object' && typeof log.new_values === 'object') {
                const oldKeys = Object.keys(log.old_values);
                const newKeys = Object.keys(log.new_values);
                const allKeys = Array.from(new Set([...oldKeys, ...newKeys]))
                    .filter(key => !excludedFields.includes(key.toLowerCase()));

                if (allKeys.length > 0) {
                    allKeys.forEach(key => {
                        const oldVal = log.old_values?.[key];
                        const newVal = log.new_values?.[key];
                        
                        // Skip if values are the same (and not array_diff)
                        const isArrayDiff = oldVal?._change_type === 'array_diff' || newVal?._change_type === 'array_diff';
                        if (!isArrayDiff && oldVal === newVal) return;

                        const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        
                        let oldValueText: string;
                        let newValueText: string;
                        
                        // Special handling for array_diff fields (checkboxes/arrays)
                        if (isArrayDiff) {
                            // For array_diff, both old and new contain the same structure with _added and _removed
                            // Old value should show what was removed (items that existed before)
                            // New value should show what was added (items that exist now)
                            const added = oldVal?._added || newVal?._added || [];
                            const removed = oldVal?._removed || newVal?._removed || [];
                            
                            // Old Value: Show removed items (what was there before that's now gone)
                            oldValueText = removed.length > 0 
                                ? removed.join(', ') 
                                : 'N/A';
                            
                            // New Value: Show added items (what's there now that wasn't before)
                            newValueText = added.length > 0 
                                ? added.join(', ') 
                                : 'N/A';
                        } else {
                            // Regular field changes
                            oldValueText = formatValueForCSV(oldVal) || 'N/A';
                            newValueText = formatValueForCSV(newVal) || 'N/A';
                        }

                        rows.push([
                            baseRow[0], // Date & Time
                            baseRow[1], // Performed By
                            baseRow[2], // User Role
                            baseRow[3], // Action
                            baseRow[4], // Module
                            baseRow[5], // Target Record Type
                            baseRow[6], // Target Record ID
                            fieldName, // Field Changed
                            oldValueText, // Old Value
                            newValueText, // New Value
                            baseRow[10], // Description
                            baseRow[11] // Reference Number
                        ]);
                    });
                } else {
                    // No field changes, but still log the entry
                    const noChangeRow = [...baseRow];
                    noChangeRow[7] = 'N/A'; // Field Changed
                    noChangeRow[8] = 'N/A'; // Old Value
                    noChangeRow[9] = 'N/A'; // New Value
                    rows.push(noChangeRow);
                }
            } else if (log.old_values || log.new_values) {
                // Has values but not in object format, or only one side
                const oldValueText = log.old_values ? formatValueForCSV(log.old_values) : 'N/A';
                const newValueText = log.new_values ? formatValueForCSV(log.new_values) : 'N/A';
                
                rows.push([
                    baseRow[0], // Date & Time
                    baseRow[1], // Performed By
                    baseRow[2], // User Role
                    baseRow[3], // Action
                    baseRow[4], // Module
                    baseRow[5], // Target Record Type
                    baseRow[6], // Target Record ID
                    'Multiple Fields', // Field Changed
                    oldValueText || 'N/A', // Old Value
                    newValueText || 'N/A', // New Value
                    baseRow[10], // Description
                    baseRow[11] // Reference Number
                ]);
            } else {
                // No old/new values, just log the entry
                const noValuesRow = [...baseRow];
                noValuesRow[7] = 'N/A'; // Field Changed
                noValuesRow[8] = 'N/A'; // Old Value
                noValuesRow[9] = 'N/A'; // New Value
                rows.push(noValuesRow);
            }
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Data exported to CSV');
    }, [logs.data]);

    const getUserName = (log: AuditLog) => {
        return log.user?.name || 'System';
    };

    const getUserRole = (log: AuditLog) => {
        if (log.user?.roles && log.user.roles.length > 0) {
            // Filter roles to only show those with permissions (roles are already filtered in backend)
            // Format all role names and join them
            const roleNames = log.user.roles.map(role => {
                return role.name
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            });
            return roleNames.length > 0 ? roleNames.join(', ') : 'User';
        }
        return 'User';
    };
    
    const getUserRoleInitials = (log: AuditLog) => {
        if (log.user?.roles && log.user.roles.length > 0) {
            // Get first 2 letters from the first role, or combine initials from multiple roles
            if (log.user.roles.length === 1) {
                const roleName = log.user.roles[0].name;
                return roleName.split('-').map(word => word[0].toUpperCase()).join('').slice(0, 2);
            } else {
                // For multiple roles, show first letter of first two roles
                return log.user.roles.slice(0, 2).map(role => {
                    return role.name.split('-')[0][0].toUpperCase();
                }).join('');
            }
        }
        return 'U';
    };

    const formatEmployeeName = (firstName: string, middleName: string, surname: string): string => {
        const middleInitial = middleName ? middleName.charAt(0).toUpperCase() + '.' : '';
        const parts = [surname, firstName].filter(Boolean);
        if (parts.length > 1) {
            return `${parts[0]}, ${parts[1]}${middleInitial ? ' ' + middleInitial : ''}`;
        }
        return parts[0] || '';
    };

    const getEntityName = (log: AuditLog) => {
        // For employees in specific actions, format as "Lastname, Firstname MI."
        if (log.entity_type === 'Employee' && log.module === 'employees') {
            const employeeActions = ['updated', 'soft-deleted', 'permanently-deleted', 'restored'];
            if (employeeActions.includes(log.action)) {
                // Try to get from snapshot first
                if (log.snapshot?.first_name) {
                    return formatEmployeeName(
                        log.snapshot.first_name || '',
                        log.snapshot.middle_name || '',
                        log.snapshot.surname || ''
                    );
                }
                // Try old_values (for deleted actions)
                if (log.old_values?.first_name) {
                    return formatEmployeeName(
                        log.old_values.first_name || '',
                        log.old_values.middle_name || '',
                        log.old_values.surname || ''
                    );
                }
                // Try new_values (for restored actions)
                if (log.new_values?.first_name) {
                    return formatEmployeeName(
                        log.new_values.first_name || '',
                        log.new_values.middle_name || '',
                        log.new_values.surname || ''
                    );
                }
                // Use entity_name from backend if available
                if (log.entity_name) {
                    return log.entity_name;
                }
            }
        }
        
        // Use entity_name from backend if available (for non-employee or other actions)
        if (log.entity_name) {
            return log.entity_name;
        }
        
        // Fallback: try to get from snapshot
        if (log.snapshot) {
            // For employees - other actions use full name
            if (log.entity_type === 'Employee' && log.snapshot.first_name) {
                const firstName = log.snapshot.first_name || '';
                const middleName = log.snapshot.middle_name || '';
                const surname = log.snapshot.surname || '';
                return `${firstName} ${middleName} ${surname}`.trim();
            }
            // For users
            if (log.entity_type === 'User' && log.snapshot.name) {
                return log.snapshot.name;
            }
            // For trainings
            if (log.entity_type === 'Training' && log.snapshot.training_title) {
                return log.snapshot.training_title;
            }
        }
        // For trainings, also check new_values or old_values if snapshot doesn't have it
        if (log.entity_type === 'Training') {
            const trainingTitle = log.new_values?.training_title || log.old_values?.training_title;
            if (trainingTitle) {
                return trainingTitle;
            }
        }
        return null;
    };

    const formatModule = (module: string) => {
        return module.charAt(0).toUpperCase() + module.slice(1);
    };

    const formatAction = (action: string) => {
        return action.toLowerCase();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Audit Logs" />
            <CustomToast />

            <div className="flex h-full flex-1 flex-col gap-3 md:gap-4 rounded-xl p-3 md:p-4">
                <div className="space-y-4 md:space-y-6">
                    {/* Header */}
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-xl md:text-2xl font-semibold text-foreground">Audit Logs</h1>
                            <p className="text-xs md:text-sm text-muted-foreground">
                                Showing {logs.from} to {logs.to} of {logs.total} log entries
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Export Button */}
                            <Button
                                size="default"
                                className="h-10 px-4 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all flex-shrink-0"
                                style={{
                                    background: 'hsl(221, 83%, 53%)',
                                    color: 'white',
                                }}
                                onClick={exportToCSV}
                                disabled={logs.total === 0}
                                onMouseEnter={(e) => {
                                    if (!e.currentTarget.disabled) {
                                        e.currentTarget.style.background = 'hsl(221, 83%, 48%)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!e.currentTarget.disabled) {
                                        e.currentTarget.style.background = 'hsl(221, 83%, 53%)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }
                                }}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-lg">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by description, entity ID, module, or user..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearch}
                            />
                        </div>
                        <Select value={filterModule} onValueChange={setFilterModule}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="All Modules" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Modules</SelectItem>
                                {modules.map((module) => (
                                    <SelectItem key={module} value={module}>
                                        {module.charAt(0).toUpperCase() + module.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterAction} onValueChange={setFilterAction}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="All Actions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Actions</SelectItem>
                                {actions.map((action) => {
                                    const config = getActionConfig(action);
                                    return (
                                        <SelectItem key={action} value={action}>
                                            {config.label}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                        <Select value={filterUser} onValueChange={setFilterUser}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="All Users" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {users.map((user) => (
                                    <SelectItem key={user.id} value={String(user.id)}>
                                        {user.name}
                                    </SelectItem>
                                ))}
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
                            onClick={applyFilters}
                            className="h-9 gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            Apply Filters
                        </Button>
                    </div>

                    {/* Logs List */}
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        {logs.data.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No logs found</p>
                                {(searchTerm || filterModule !== 'all' || filterAction !== 'all' || filterUser !== 'all' || dateFrom || dateTo) ? (
                                    <p className="text-xs mt-1">Try adjusting your filters</p>
                                ) : null}
                            </div>
                        ) : (
                            <div className="max-w-4xl mx-auto p-6 space-y-6">
                                {sortedDates.map((dateKey, dateIndex) => {
                                    const dateLogs = groupedLogs[dateKey];
                                    const eventCount = dateLogs.length;
                                    
                                    return (
                                        <div key={dateKey} className={dateIndex > 0 ? 'mt-6' : ''}>
                                            {/* Date Header */}
                                            <div className="flex items-center mb-4">
                                                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                                                <h3 className="text-sm font-semibold text-gray-500">
                                                    {dateKey}
                                                </h3>
                                                <span className="ml-auto text-sm text-gray-500">
                                                    {eventCount} {eventCount === 1 ? 'event' : 'events'}
                                                </span>
                                            </div>

                                            {/* Timeline Group - matches employment history structure */}
                                            <div className="relative">
                                                {/* Timeline line - matches employment history: left-4 */}
                                                {dateLogs.length > 1 && (
                                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                                                )}
                                                
                                                <div className="space-y-6">
                                                    {dateLogs.map((log, logIndex) => {
                                                        const config = getActionConfig(log.action);
                                                        const IconComponent = (LucideIcons as any)[config.icon] || LucideIcons.Info;

                                                        return (
                                                            <div key={log.id} className="relative pl-10">
                                                                {/* Icon Circle - positioned so line at left-4 is centered (icon center = 16px, so left edge at 0px) */}
                                                                <div className={`absolute left-0 top-0 w-8 h-8 rounded-full ${config.bgColor} border-2 border-white flex items-center justify-center z-10 shadow-sm`}>
                                                                    <IconComponent className={`h-4 w-4 ${config.color}`} />
                                                                </div>

                                                                {/* Content Card */}
                                                                <div>
                                                                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
                                                                    {/* Header */}
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                                                                <span className="text-xs font-semibold text-gray-600 uppercase">
                                                                                    {getUserRoleInitials(log)}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                                                                                    <span className="flex-shrink-0 whitespace-nowrap">{getUserName(log)}</span>
                                                                                    <span className="text-gray-400 mx-1 flex-shrink-0">{formatAction(config.label)}</span>
                                                                                    <span className="text-gray-600 mx-1 flex-shrink-0 bg-gray-100 rounded px-2 py-0.5 text-xs font-semibold">{formatModule(log.module)}</span>
                                                                                    {log.entity_id && (
                                                                                        <>
                                                                                            <span className="text-gray-400 mx-1 flex-shrink-0 font-normal">
                                                                                                ID: {log.entity_id}
                                                                                                {(() => {
                                                                                                    const code = getEntityCode(log);
                                                                                                    return code ? <span className="text-gray-900 font-semibold mx-1">{code}</span> : '';
                                                                                                })()}
                                                                                            </span>
                                                                                            {/* Show entity name for update/delete actions, or for non-Training entities, but NOT for employee create actions */}
                                                                                            {getEntityName(log) && (log.action !== 'created' || log.entity_type !== 'Training') && !(log.action === 'created' && log.module === 'employees') && (
                                                                                                <span className="text-gray-600 mx-1 truncate font-semibold min-w-0">{getEntityName(log)}</span>
                                                                                            )}
                                                                                        </>
                                                                                    )}
                                                                                    {log.reference_number && (
                                                                                        <span className="text-gray-400 font-medium ml-auto flex-shrink-0">Ref#: {log.reference_number}</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-xs text-gray-500">
                                                                                    {getUserRole(log)} • {formatTime(log.created_at)}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Description - only show if there are no changes */}
                                                                    {log.description && !log.old_values && !log.new_values && (
                                                                        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg py-2 px-3">
                                                                            <div className="flex items-center min-h-[40px]">
                                                                                <p className="text-sm text-gray-700">
                                                                                    {log.description}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Changes */}
                                                                    {renderChanges(log)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {logs.last_page > 1 && (
                        <div className="border-t border-border px-3 sm:px-6 py-2 sm:py-3">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    Showing {logs.from} to {logs.to} of {logs.total} entries
                                </p>
                                <div className="flex items-center gap-1">
                                    <Link
                                        href={logs.current_page > 1 ? `/audit-logs?page=${logs.current_page - 1}` : '#'}
                                        className={`h-8 sm:h-9 px-3 flex items-center justify-center rounded border ${
                                            logs.current_page === 1 
                                                ? 'pointer-events-none opacity-50 cursor-not-allowed' 
                                                : 'hover:bg-muted'
                                        }`}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Link>
                                    {Array.from({ length: Math.min(logs.last_page, 10) }, (_, i) => {
                                        let page: number;
                                        if (logs.last_page <= 10) {
                                            page = i + 1;
                                        } else if (logs.current_page <= 5) {
                                            page = i + 1;
                                        } else if (logs.current_page >= logs.last_page - 4) {
                                            page = logs.last_page - 9 + i;
                                        } else {
                                            page = logs.current_page - 5 + i;
                                        }
                                        return (
                                            <Link
                                                key={page}
                                                href={`/audit-logs?page=${page}`}
                                                className={`min-w-[40px] h-8 sm:h-9 px-3 flex items-center justify-center rounded border text-xs sm:text-sm ${
                                                    page === logs.current_page
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'hover:bg-muted'
                                                }`}
                                            >
                                                {page}
                                            </Link>
                                        );
                                    })}
                                    <Link
                                        href={logs.current_page < logs.last_page ? `/audit-logs?page=${logs.current_page + 1}` : '#'}
                                        className={`h-8 sm:h-9 px-3 flex items-center justify-center rounded border ${
                                            logs.current_page === logs.last_page 
                                                ? 'pointer-events-none opacity-50 cursor-not-allowed' 
                                                : 'hover:bg-muted'
                                        }`}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
