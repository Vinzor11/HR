import { memo } from 'react';
import * as LucideIcons from 'lucide-react';
import { ArrowRight, ChevronDown, ChevronUp, Info } from 'lucide-react';

// Types
export interface AuditLog {
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
    ip_address?: string | null;
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

// Action configuration
export const actionConfig: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
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

// Helper functions
export const getActionConfig = (action: string) => {
    const actionLower = action.toLowerCase();
    
    if (actionConfig[actionLower]) {
        return actionConfig[actionLower];
    }
    
    // Map common action patterns to appropriate icons
    const actionIconMap: Record<string, { icon: string; color: string; bgColor: string }> = {
        'create': { icon: 'Plus', color: 'text-green-600', bgColor: 'bg-green-100' },
        'add': { icon: 'Plus', color: 'text-green-600', bgColor: 'bg-green-100' },
        'update': { icon: 'Edit', color: 'text-blue-600', bgColor: 'bg-blue-100' },
        'modify': { icon: 'Edit', color: 'text-blue-600', bgColor: 'bg-blue-100' },
        'delete': { icon: 'Trash2', color: 'text-red-600', bgColor: 'bg-red-100' },
        'remove': { icon: 'Trash2', color: 'text-red-600', bgColor: 'bg-red-100' },
        'view': { icon: 'Eye', color: 'text-gray-600', bgColor: 'bg-gray-100' },
        'approve': { icon: 'Check', color: 'text-green-600', bgColor: 'bg-green-100' },
        'reject': { icon: 'XCircle', color: 'text-red-600', bgColor: 'bg-red-100' },
        'restore': { icon: 'RotateCcw', color: 'text-purple-600', bgColor: 'bg-purple-100' },
        'export': { icon: 'Download', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
        'import': { icon: 'Upload', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
        'lock': { icon: 'Lock', color: 'text-orange-600', bgColor: 'bg-orange-100' },
        'unlock': { icon: 'Unlock', color: 'text-green-600', bgColor: 'bg-green-100' },
    };
    
    for (const [key, config] of Object.entries(actionIconMap)) {
        if (actionLower.includes(key)) {
            return {
                label: action.charAt(0).toUpperCase() + action.slice(1),
                ...config,
            };
        }
    }
    
    return {
        label: action.charAt(0).toUpperCase() + action.slice(1),
        icon: 'Info',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
    };
};

export const getUserName = (log: AuditLog) => {
    return log.user?.name || 'System';
};

export const getUserRole = (log: AuditLog) => {
    if (log.user?.roles && log.user.roles.length > 0) {
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

export const getUserRoleInitials = (log: AuditLog) => {
    if (log.user?.roles && log.user.roles.length > 0) {
        if (log.user.roles.length === 1) {
            const roleName = log.user.roles[0].name;
            return roleName.split('-').map(word => word[0].toUpperCase()).join('').slice(0, 2);
        } else {
            return log.user.roles.slice(0, 2).map(role => {
                return role.name.split('-')[0][0].toUpperCase();
            }).join('');
        }
    }
    return 'U';
};

export const formatModule = (module: string) => {
    return module.charAt(0).toUpperCase() + module.slice(1);
};

export const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

interface AuditLogCardProps {
    log: AuditLog;
    expandedFields: Set<string>;
    onToggleField: (fieldKey: string) => void;
    onCardClick?: (log: AuditLog) => void;
}

export const AuditLogCard = memo(function AuditLogCard({
    log,
    expandedFields,
    onToggleField,
    onCardClick,
}: AuditLogCardProps) {
    const config = getActionConfig(log.action);
    const IconComponent = (LucideIcons as any)[config.icon] || Info;

    const getEntityCode = (log: AuditLog): string | null => {
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

    const formatEmployeeName = (firstName: string, middleName: string, surname: string): string => {
        const middleInitial = middleName ? middleName.charAt(0).toUpperCase() + '.' : '';
        const parts = [surname, firstName].filter(Boolean);
        if (parts.length > 1) {
            return `${parts[0]}, ${parts[1]}${middleInitial ? ' ' + middleInitial : ''}`;
        }
        return parts[0] || '';
    };

    const getEntityName = (log: AuditLog) => {
        if (log.entity_type === 'Employee' && log.module === 'employees') {
            const employeeActions = ['updated', 'soft-deleted', 'permanently-deleted', 'restored'];
            if (employeeActions.includes(log.action)) {
                if (log.snapshot?.first_name) {
                    return formatEmployeeName(
                        log.snapshot.first_name || '',
                        log.snapshot.middle_name || '',
                        log.snapshot.surname || ''
                    );
                }
                if (log.old_values?.first_name) {
                    return formatEmployeeName(
                        log.old_values.first_name || '',
                        log.old_values.middle_name || '',
                        log.old_values.surname || ''
                    );
                }
                if (log.new_values?.first_name) {
                    return formatEmployeeName(
                        log.new_values.first_name || '',
                        log.new_values.middle_name || '',
                        log.new_values.surname || ''
                    );
                }
                if (log.entity_name) {
                    return log.entity_name;
                }
            }
        }
        
        if (log.entity_name) {
            return log.entity_name;
        }
        
        if (log.snapshot) {
            if (log.entity_type === 'Employee' && log.snapshot.first_name) {
                const firstName = log.snapshot.first_name || '';
                const middleName = log.snapshot.middle_name || '';
                const surname = log.snapshot.surname || '';
                return `${firstName} ${middleName} ${surname}`.trim();
            }
            if (log.entity_type === 'User' && log.snapshot.name) {
                return log.snapshot.name;
            }
            if (log.entity_type === 'Training' && log.snapshot.training_title) {
                return log.snapshot.training_title;
            }
        }
        if (log.entity_type === 'Training') {
            const trainingTitle = log.new_values?.training_title || log.old_values?.training_title;
            if (trainingTitle) {
                return trainingTitle;
            }
        }
        return null;
    };

    return (
        <div 
            className="relative pl-10 group"
            role="article"
            aria-label={`${config.label} action by ${getUserName(log)}`}
        >
            {/* Icon Circle */}
            <div 
                className={`absolute left-0 top-0 w-8 h-8 rounded-full ${config.bgColor} border-2 border-white flex items-center justify-center z-10 shadow-sm`}
                aria-hidden="true"
            >
                <IconComponent className={`h-4 w-4 ${config.color}`} />
            </div>

            {/* Content Card */}
            <div 
                className={`bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3 ${onCardClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                onClick={() => onCardClick?.(log)}
                role={onCardClick ? 'button' : undefined}
                tabIndex={onCardClick ? 0 : undefined}
                onKeyDown={onCardClick ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onCardClick(log);
                    }
                } : undefined}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div 
                            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"
                            aria-label={`User role: ${getUserRole(log)}`}
                        >
                            <span className="text-xs font-semibold text-gray-600 uppercase">
                                {getUserRoleInitials(log)}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 flex items-center gap-1 flex-wrap">
                                <span className="flex-shrink-0 whitespace-nowrap">{getUserName(log)}</span>
                                <span className="text-gray-500 mx-1 flex-shrink-0">{config.label.toLowerCase()}</span>
                                <span className="text-gray-600 mx-1 flex-shrink-0 bg-gray-100 rounded px-2 py-0.5 text-xs font-semibold">{formatModule(log.module)}</span>
                                {log.entity_id && (
                                    <>
                                        <span className="text-gray-500 mx-1 flex-shrink-0 font-normal">
                                            ID: {log.entity_id}
                                            {(() => {
                                                const code = getEntityCode(log);
                                                return code ? <span className="text-gray-900 font-semibold mx-1">{code}</span> : '';
                                            })()}
                                        </span>
                                        {getEntityName(log) && (log.action !== 'created' || log.entity_type !== 'Training') && !(log.action === 'created' && log.module === 'employees') && (
                                            <span className="text-gray-600 mx-1 truncate font-semibold min-w-0">{getEntityName(log)}</span>
                                        )}
                                    </>
                                )}
                                {log.reference_number && (
                                    <span className="text-gray-500 font-medium ml-auto flex-shrink-0">Ref#: {log.reference_number}</span>
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
                <AuditLogChanges 
                    log={log} 
                    expandedFields={expandedFields} 
                    onToggleField={onToggleField}
                />
            </div>
        </div>
    );
});

// Excluded fields constant
const EXCLUDED_FIELDS = [
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

// Character limits for content truncation
const ARRAY_CONTENT_LIMIT = 50;
const STRING_CONTENT_LIMIT = 100;

interface AuditLogChangesProps {
    log: AuditLog;
    expandedFields: Set<string>;
    onToggleField: (fieldKey: string) => void;
}

const AuditLogChanges = memo(function AuditLogChanges({ 
    log, 
    expandedFields, 
    onToggleField 
}: AuditLogChangesProps) {
    const formatValueForDisplay = (value: any): string => {
        if (value === null || value === undefined) {
            return '';
        }
        if (Array.isArray(value)) {
            return value.map(v => formatValueForDisplay(v)).join(', ');
        }
        if (typeof value === 'object') {
            const keys = Object.keys(value);
            if (keys.length === 1) {
                const val = value[keys[0]];
                return Array.isArray(val) ? val.map(v => formatValueForDisplay(v)).join(', ') : formatValueForDisplay(val);
            }
            return JSON.stringify(value);
        }
        
        const strValue = String(value);
        if (/^-?\d+\.?\d*$/.test(strValue.trim())) {
            const numValue = parseFloat(strValue);
            if (!isNaN(numValue)) {
                return numValue.toLocaleString('en-US', {
                    minimumFractionDigits: strValue.includes('.') ? 2 : 0,
                    maximumFractionDigits: strValue.includes('.') ? 2 : 0,
                });
            }
        }
        
        return strValue;
    };

    // Show description for standardized action types
    if (['created', 'soft-deleted', 'permanently-deleted', 'restored'].includes(log.action) && log.description) {
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

    if (!log.old_values && !log.new_values) {
        return null;
    }

    // Field-by-field changes for object values
    if (log.old_values && log.new_values && typeof log.old_values === 'object' && typeof log.new_values === 'object') {
        const oldKeys = Object.keys(log.old_values);
        const newKeys = Object.keys(log.new_values);
        const allKeys = Array.from(new Set([...oldKeys, ...newKeys]))
            .filter(key => !EXCLUDED_FIELDS.includes(key.toLowerCase()));

        if (allKeys.length === 0) return null;

        return (
            <div className="mt-4 space-y-3">
                {allKeys.map((key) => {
                    const oldVal = log.old_values?.[key];
                    const newVal = log.new_values?.[key];
                    
                    if (oldVal === newVal) return null;

                    const fieldName = key.replace(/_/g, ' ').toUpperCase();
                    const isArrayDiff = oldVal?._change_type === 'array_diff' || newVal?._change_type === 'array_diff';
                    
                    if (isArrayDiff) {
                        const added = oldVal?._added || newVal?._added || [];
                        const removed = oldVal?._removed || newVal?._removed || [];
                        
                        return (
                            <div key={key} className="field-change-row border border-gray-200 rounded-lg py-2 px-3 bg-gray-50">
                                <div className="mb-2">
                                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
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
                    const fieldKey = `${log.id}-${key}`;
                    const isExpanded = expandedFields.has(fieldKey);
                    const isLongContent = Array.isArray(oldVal) || Array.isArray(newVal) 
                        ? (oldValueText.length > ARRAY_CONTENT_LIMIT || newValueText.length > ARRAY_CONTENT_LIMIT)
                        : (oldValueText.length > STRING_CONTENT_LIMIT || newValueText.length > STRING_CONTENT_LIMIT);

                    return (
                        <div 
                            key={key} 
                            className="field-change-row border border-gray-200 rounded-lg py-2 px-3 bg-gray-50"
                        >
                            {/* Desktop Layout: Horizontal */}
                            <div className="hidden sm:block">
                                <div className="flex items-center gap-4 min-h-[40px]">
                                    <div className="flex-shrink-0 w-32">
                                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                            {fieldName}
                                        </span>
                                    </div>
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
                                    <div className="flex-shrink-0 flex items-center justify-center w-8">
                                        <ArrowRight className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                    </div>
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
                                    {isLongContent && (
                                        <div className="flex-shrink-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleField(fieldKey);
                                                }}
                                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                aria-label={isExpanded ? 'Collapse field' : 'Expand field'}
                                                aria-expanded={isExpanded}
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
                                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                        {fieldName}
                                    </span>
                                    {isLongContent && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleField(fieldKey);
                                            }}
                                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                                            aria-label={isExpanded ? 'Collapse field' : 'Expand field'}
                                            aria-expanded={isExpanded}
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-gray-600" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-gray-600" />
                                            )}
                                        </button>
                                    )}
                                </div>
                                <div className="text-red-700 rounded-md px-4 py-2.5 text-sm font-medium">
                                    <div className="text-xs text-gray-500 mb-1">Old Value:</div>
                                    {isExpanded ? (
                                        <span className="break-words whitespace-normal block">{oldValueText || <span className="text-gray-400 italic">(empty)</span>}</span>
                                    ) : (
                                        <span className="truncate block" title={oldValueText || '(empty)'}>{oldValueText || <span className="text-gray-400 italic">(empty)</span>}</span>
                                    )}
                                </div>
                                <div className="flex justify-center">
                                    <ArrowRight className="h-5 w-5 text-gray-400 rotate-90" aria-hidden="true" />
                                </div>
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
    const renderValue = (value: any) => {
        if (value === null || value === undefined) {
            return <span className="text-muted-foreground italic">null</span>;
        }
        if (Array.isArray(value)) {
            return <span className="text-foreground">{value.join(', ')}</span>;
        }
        if (typeof value === 'object') {
            const keys = Object.keys(value);
            if (keys.length === 1) {
                const key = keys[0];
                const val = value[key];
                if (Array.isArray(val)) {
                    return <span className="text-foreground">{key}: {val.join(', ')}</span>;
                }
                return <span className="text-foreground">{key}: {String(val)}</span>;
            }
            return (
                <pre className="text-xs bg-muted/30 p-2 rounded overflow-x-auto">
                    {JSON.stringify(value, null, 2)}
                </pre>
            );
        }
        return <span className="text-foreground">{String(value)}</span>;
    };

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
});

export default AuditLogCard;
