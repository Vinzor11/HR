import { CustomToast, toast } from '@/components/custom-toast';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { FileText, Search, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, X, Loader2, SlidersHorizontal } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { AuditLogTimeline, AuditLogDetailModal, getActionConfig, getUserName, getUserRole, formatModule, type AuditLog } from '@/components/audit-logs';
import { cn } from '@/lib/utils';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

// Constants
const PER_PAGE_OPTIONS = ['10', '25', '50', '100'] as const;

/** Curated action filter options (matches actionConfig). Reduces dropdown clutter and ensures filter works. */
const ACTION_FILTER_OPTIONS = [
    'created',
    'updated',
    'viewed',
    'approved',
    'rejected',
    'soft-deleted',
    'permanently-deleted',
    'restored',
    'exported',
] as const;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Audit Logs',
        href: '/audit-logs',
    },
];

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
        search_mode?: string;
        date_from?: string;
        date_to?: string;
        per_page?: number;
        advanced_filters?: string;
    };
    modules: string[];
    actions: string[];
    entityTypes: string[];
    users: Array<{ id: number; name: string; email: string }>;
}

export default function AuditLogs() {
    const { logs, filters: initialFilters, modules } = usePage<AuditLogsProps>().props;
    
    const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
    type SearchMode = 'any' | 'target_id' | 'reference' | 'performed_by' | 'field';
    const SEARCH_MODE_LABELS: Record<SearchMode, string> = {
        any: 'Any',
        target_id: 'Target ID',
        reference: 'Reference',
        performed_by: 'Performed By',
        field: 'Field',
    };
    const [searchMode, setSearchMode] = useState<SearchMode>(() => {
        const v = initialFilters.search_mode as SearchMode | undefined;
        return (v && ['any', 'target_id', 'reference', 'performed_by', 'field'].includes(v)) ? v : 'any';
    });
    const [filterModule, setFilterModule] = useState(initialFilters.module || 'all');
    const [filterAction, setFilterAction] = useState(initialFilters.action || 'all');
    const [dateFrom, setDateFrom] = useState(initialFilters.date_from || '');
    const [dateTo, setDateTo] = useState(initialFilters.date_to || '');
    const [perPage, setPerPage] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('audit_logs_perPage');
            if (saved && PER_PAGE_OPTIONS.includes(saved as any)) {
                return saved;
            }
        }
        return String(initialFilters.per_page ?? 50);
    });
    const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    // Handle log card click to show detail modal
    const handleLogClick = useCallback((log: AuditLog) => {
        setSelectedLog(log);
        setDetailModalOpen(true);
    }, []);

    // Handle toggle field expand/collapse
    const handleToggleField = useCallback((fieldKey: string) => {
        setExpandedFields(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fieldKey)) {
                newSet.delete(fieldKey);
            } else {
                newSet.add(fieldKey);
            }
            return newSet;
        });
    }, []);

    // Check if any filters are active
    const hasActiveFilters = useMemo(() => {
        return (
            searchTerm !== '' ||
            filterModule !== 'all' ||
            filterAction !== 'all' ||
            dateFrom !== '' ||
            dateTo !== ''
        );
    }, [searchTerm, filterModule, filterAction, dateFrom, dateTo]);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (searchTerm) count++;
        if (filterModule !== 'all') count++;
        if (filterAction !== 'all') count++;
        if (dateFrom || dateTo) count++;
        return count;
    }, [searchTerm, filterModule, filterAction, dateFrom, dateTo]);

    const applyFilters = useCallback((options: {
        page?: number;
        newPerPage?: string;
        newModule?: string;
        newAction?: string;
        newSearch?: string;
        newSearchMode?: string;
        newDateFrom?: string;
        newDateTo?: string;
    } = {}) => {
        setIsLoading(true);
        const params: any = {};
        const effectiveSearch = options.newSearch !== undefined ? options.newSearch : searchTerm;
        if (effectiveSearch) params.search = effectiveSearch;
        const effectiveSearchMode = options.newSearchMode !== undefined ? options.newSearchMode : searchMode;
        if (effectiveSearch) params.search_mode = effectiveSearchMode;
        
        const effectiveModule = options.newModule !== undefined ? options.newModule : filterModule;
        if (effectiveModule !== 'all') params.module = effectiveModule;
        
        const effectiveAction = options.newAction !== undefined ? options.newAction : filterAction;
        if (effectiveAction !== 'all') params.action = effectiveAction;
        
        const effectiveDateFrom = options.newDateFrom !== undefined ? options.newDateFrom : dateFrom;
        const effectiveDateTo = options.newDateTo !== undefined ? options.newDateTo : dateTo;
        if (effectiveDateFrom) params.date_from = effectiveDateFrom;
        if (effectiveDateTo) params.date_to = effectiveDateTo;
        
        const effectivePerPage = options.newPerPage || perPage;
        params.per_page = parseInt(effectivePerPage, 10);
        
        if (options.page) {
            params.page = options.page;
        }

        router.get('/audit-logs', params, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setIsLoading(false),
        });
    }, [searchTerm, searchMode, filterModule, filterAction, dateFrom, dateTo, perPage]);

    // Clear all filters
    const clearAllFilters = useCallback(() => {
        setSearchTerm('');
        setSearchMode('any');
        setFilterModule('all');
        setFilterAction('all');
        setDateFrom('');
        setDateTo('');
        setIsLoading(true);
        
        router.get('/audit-logs', { per_page: parseInt(perPage, 10) }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setIsLoading(false),
        });
    }, [perPage]);

    // Handle per page change
    const handlePerPageChange = useCallback((value: string) => {
        setPerPage(value);
        if (typeof window !== 'undefined') {
            localStorage.setItem('audit_logs_perPage', value);
        }
        applyFilters({ page: 1, newPerPage: value });
    }, [applyFilters]);

    const handleSearch = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applyFilters({ page: 1, newSearch: searchTerm, newSearchMode: searchMode });
        }
    }, [applyFilters, searchTerm, searchMode]);

    // Remove individual filter
    const removeFilter = useCallback((filterType: string) => {
        switch (filterType) {
            case 'search':
                setSearchTerm('');
                setSearchMode('any');
                break;
            case 'module':
                setFilterModule('all');
                break;
            case 'action':
                setFilterAction('all');
                break;
            case 'date':
                setDateFrom('');
                setDateTo('');
                break;
        }
    }, []);

    // Helper for CSV export - format values for display
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

            <div className="flex flex-col overflow-hidden bg-background" style={{ height: 'calc(100vh - 80px)' }}>
                    {/* YouTube-style Module Filter Bar */}
                    <div className="flex-shrink-0 z-20 px-3 md:px-4 py-3 bg-background border-b border-border">
                        <div className="flex items-center gap-3">
                            {/* Module Chips - Horizontally Scrollable */}
                            <div className="flex-1 overflow-x-auto scrollbar-hide">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setFilterModule('all');
                                            applyFilters({ page: 1, newModule: 'all' });
                                        }}
                                        disabled={isLoading}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                                            filterModule === 'all'
                                                ? "bg-foreground text-background shadow-sm"
                                                : "bg-muted hover:bg-muted/80 text-foreground"
                                        )}
                                    >
                                        All
                                    </button>
                                    {modules.map((module) => (
                                        <button
                                            key={module}
                                            onClick={() => {
                                                setFilterModule(module);
                                                applyFilters({ page: 1, newModule: module });
                                            }}
                                            disabled={isLoading}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                                                filterModule === module
                                                    ? "bg-foreground text-background shadow-sm"
                                                    : "bg-muted hover:bg-muted/80 text-foreground"
                                            )}
                                        >
                                            {module.charAt(0).toUpperCase() + module.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Search Bar - integrated with search-by dropdown */}
                            <div className="flex flex-shrink-0 min-w-[280px] w-[300px] sm:w-[360px] rounded-lg border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                                <Select
                                    value={searchMode}
                                    onValueChange={(v) => {
                                        setSearchMode(v as SearchMode);
                                        if (searchTerm) applyFilters({ page: 1, newSearchMode: v });
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-[100px] sm:w-[110px] shrink-0 border-0 rounded-none bg-muted/50 border-r border-border text-xs focus:ring-0 focus:ring-offset-0">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Any</SelectItem>
                                        <SelectItem value="target_id">Target ID</SelectItem>
                                        <SelectItem value="reference">Reference</SelectItem>
                                        <SelectItem value="performed_by">Performed By</SelectItem>
                                        <SelectItem value="field">Field</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="relative flex-1 min-w-0">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        type="text"
                                        placeholder={searchMode === 'any' ? 'Search...' : `Search by ${SEARCH_MODE_LABELS[searchMode]}...`}
                                        className="h-9 w-full min-w-0 pl-8 pr-3 border-0 rounded-none bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={handleSearch}
                                    />
                                </div>
                            </div>

                            {/* Export Button - Icon Only */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-9 p-0 flex-shrink-0"
                                onClick={exportToCSV}
                                disabled={logs.total === 0 || isLoading}
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
                                        {(() => {
                                            const advancedCount = activeFilterCount - (filterModule !== 'all' ? 1 : 0);
                                            return advancedCount > 0 ? (
                                                <span
                                                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
                                                    aria-label={`${advancedCount} active filters`}
                                                >
                                                    {advancedCount}
                                                </span>
                                            ) : null;
                                        })()}
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
                                        {/* Action Filter */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">Action</label>
                                            <Select
                                                value={filterAction}
                                                onValueChange={(value) => {
                                                    setFilterAction(value);
                                                    applyFilters({ page: 1, newAction: value });
                                                }}
                                            >
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="All Actions" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Actions</SelectItem>
                                                    {ACTION_FILTER_OPTIONS.map((action) => {
                                                        const config = getActionConfig(action);
                                                        return (
                                                            <SelectItem key={action} value={action}>
                                                                {config.label}
                                                            </SelectItem>
                                                        );
                                                    })}
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
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setDateFrom(v);
                                                            applyFilters({ page: 1, newDateFrom: v, newDateTo: dateTo });
                                                        }}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground">To</span>
                                                    <Input
                                                        type="date"
                                                        className="h-10"
                                                        value={dateTo}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setDateTo(v);
                                                            applyFilters({ page: 1, newDateFrom: dateFrom, newDateTo: v });
                                                        }}
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
                                                applyFilters({ page: 1, newSearch: '', newSearchMode: 'any' });
                                            }}
                                            className="ml-1 inline-flex items-center justify-center hover:text-destructive transition-colors"
                                            aria-label="Remove search filter"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {filterModule !== 'all' && (
                                    <Badge variant="outline" className="h-6 gap-1 font-normal">
                                        {filterModule}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFilter('module');
                                                applyFilters({ page: 1, newModule: 'all' });
                                            }}
                                            className="ml-1 inline-flex items-center justify-center hover:text-destructive transition-colors"
                                            aria-label="Remove module filter"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {filterAction !== 'all' && (
                                    <Badge variant="outline" className="h-6 gap-1 font-normal">
                                        {getActionConfig(filterAction).label}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFilter('action');
                                                applyFilters({ page: 1, newAction: 'all' });
                                            }}
                                            className="ml-1 inline-flex items-center justify-center hover:text-destructive transition-colors"
                                            aria-label="Remove action filter"
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
                                                applyFilters({ page: 1, newDateFrom: '', newDateTo: '' });
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

                        {/* Logs List */}
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                        {isLoading ? (
                            /* Loading Skeleton */
                            <div className="max-w-4xl mx-auto p-6 space-y-6">
                                {/* Skeleton Date Header */}
                                <div className="flex items-center mb-4">
                                    <Skeleton className="w-2 h-2 rounded-full mr-2" />
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-4 w-16 ml-auto" />
                                </div>
                                {/* Skeleton Cards */}
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="relative pl-10">
                                        <Skeleton className="absolute left-0 top-0 w-8 h-8 rounded-full" />
                                        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="w-8 h-8 rounded-full" />
                                                <div className="flex-1 space-y-2">
                                                    <Skeleton className="h-4 w-3/4" />
                                                    <Skeleton className="h-3 w-1/2" />
                                                </div>
                                            </div>
                                            <Skeleton className="h-16 w-full rounded-lg" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : logs.data.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                                <p className="text-sm font-medium">No logs found</p>
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
                                    <p className="text-xs mt-1">No audit log entries have been recorded yet.</p>
                                )}
                            </div>
                        ) : (
                            <AuditLogTimeline
                                logs={logs.data}
                                expandedFields={expandedFields}
                                onToggleField={handleToggleField}
                                onCardClick={handleLogClick}
                            />
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
                                        Showing <span className="font-medium text-foreground">{logs.from || 0}</span> to <span className="font-medium text-foreground">{logs.to || 0}</span> of <span className="font-medium text-foreground">{logs.total}</span>
                                    </span>
                                    <span className="text-xs text-muted-foreground sm:hidden">
                                        {logs.from || 0}-{logs.to || 0} of {logs.total}
                                    </span>
                                </div>

                                {/* Pagination Controls - Right (only show when more than 1 page) */}
                                {logs.last_page > 1 && (
                                    <div className="flex items-center gap-1">
                                        {/* First Page Button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyFilters({ page: 1 })}
                                            disabled={logs.current_page === 1 || isLoading}
                                            className="h-7 px-1.5 hidden sm:flex"
                                            aria-label="First page"
                                        >
                                            <ChevronsLeft className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyFilters({ page: logs.current_page - 1 })}
                                            disabled={logs.current_page === 1 || isLoading}
                                            className="h-7 px-2"
                                            aria-label="Previous page"
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </Button>
                                        {/* Page Numbers - Desktop */}
                                        <div className="hidden sm:flex items-center gap-1">
                                            {/* First page if not in range */}
                                            {logs.last_page > 7 && logs.current_page > 4 && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => applyFilters({ page: 1 })}
                                                        disabled={isLoading}
                                                        className="min-w-[32px] h-7 text-xs"
                                                    >
                                                        1
                                                    </Button>
                                                    {logs.current_page > 5 && (
                                                        <span className="px-1 text-xs text-muted-foreground">...</span>
                                                    )}
                                                </>
                                            )}
                                            {/* Middle page numbers */}
                                            {Array.from({ length: Math.min(logs.last_page, 5) }, (_, i) => {
                                                let page: number;
                                                if (logs.last_page <= 5) {
                                                    page = i + 1;
                                                } else if (logs.current_page <= 3) {
                                                    page = i + 1;
                                                } else if (logs.current_page >= logs.last_page - 2) {
                                                    page = logs.last_page - 4 + i;
                                                } else {
                                                    page = logs.current_page - 2 + i;
                                                }
                                                // Skip if page is 1 or lastPage (shown separately)
                                                if (logs.last_page > 7 && (page === 1 || page === logs.last_page)) {
                                                    return null;
                                                }
                                                return (
                                                    <Button
                                                        key={page}
                                                        variant={page === logs.current_page ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => applyFilters({ page })}
                                                        disabled={isLoading}
                                                        className="min-w-[32px] h-7 text-xs"
                                                    >
                                                        {page}
                                                    </Button>
                                                );
                                            })}
                                            {/* Last page if not in range */}
                                            {logs.last_page > 7 && logs.current_page < logs.last_page - 3 && (
                                                <>
                                                    {logs.current_page < logs.last_page - 4 && (
                                                        <span className="px-1 text-xs text-muted-foreground">...</span>
                                                    )}
                                                    <Button
                                                        variant={logs.current_page === logs.last_page ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => applyFilters({ page: logs.last_page })}
                                                        disabled={isLoading}
                                                        className="min-w-[32px] h-7 text-xs"
                                                    >
                                                        {logs.last_page}
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                        {/* Page Indicator - Mobile */}
                                        <div className="flex sm:hidden items-center gap-1 px-2 text-xs">
                                            <span className="font-semibold text-foreground">{logs.current_page}</span>
                                            <span className="text-muted-foreground">/</span>
                                            <span className="text-muted-foreground">{logs.last_page}</span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyFilters({ page: logs.current_page + 1 })}
                                            disabled={logs.current_page === logs.last_page || isLoading}
                                            className="h-7 px-2"
                                            aria-label="Next page"
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Button>
                                        {/* Last Page Button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyFilters({ page: logs.last_page })}
                                            disabled={logs.current_page === logs.last_page || isLoading}
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

            {/* Log Detail Modal */}
            <AuditLogDetailModal
                log={selectedLog}
                open={detailModalOpen}
                onOpenChange={setDetailModalOpen}
            />
        </AppLayout>
    );
}
