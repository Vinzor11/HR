import { memo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Clock, User, Monitor, Globe, FileText, Hash, Check } from 'lucide-react';
import { useState } from 'react';
import { type AuditLog, getActionConfig, getUserName, getUserRole, formatModule, formatTime } from './AuditLogCard';

interface AuditLogDetailModalProps {
    log: AuditLog | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const AuditLogDetailModal = memo(function AuditLogDetailModal({
    log,
    open,
    onOpenChange,
}: AuditLogDetailModalProps) {
    const [copied, setCopied] = useState<string | null>(null);

    if (!log) return null;

    const config = getActionConfig(log.action);

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(null), 2000);
    };

    const formatFullDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short',
        }).format(date);
    };

    const CopyButton = ({ text, field }: { text: string; field: string }) => (
        <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => copyToClipboard(text, field)}
            aria-label={`Copy ${field}`}
        >
            {copied === field ? (
                <Check className="h-3 w-3 text-green-600" />
            ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
            )}
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <Badge className={`${config.bgColor} ${config.color} border-0`}>
                            {config.label}
                        </Badge>
                        <DialogTitle className="text-lg">
                            Audit Log Details
                        </DialogTitle>
                    </div>
                    <DialogDescription className="sr-only">
                        Detailed view of audit log entry {log.id}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    {/* Summary Section */}
                    <section aria-labelledby="summary-heading">
                        <h3 id="summary-heading" className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-2">
                                    <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Performed By</p>
                                        <p className="text-sm font-medium">{getUserName(log)}</p>
                                        <p className="text-xs text-muted-foreground">{getUserRole(log)}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Date & Time</p>
                                        <p className="text-sm font-medium">{formatFullDateTime(log.created_at)}</p>
                                    </div>
                                </div>
                            </div>
                            {log.description && (
                                <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground">Description</p>
                                        <p className="text-sm">{log.description}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Entity Information */}
                    <section aria-labelledby="entity-heading">
                        <h3 id="entity-heading" className="text-sm font-semibold text-gray-900 mb-3">Entity Information</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Module</p>
                                    <p className="text-sm font-medium">{formatModule(log.module)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Entity Type</p>
                                    <p className="text-sm font-medium">{log.entity_type}</p>
                                </div>
                                {log.entity_id && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Entity ID</p>
                                        <div className="flex items-center gap-1">
                                            <p className="text-sm font-mono">{log.entity_id}</p>
                                            <CopyButton text={log.entity_id} field="entity_id" />
                                        </div>
                                    </div>
                                )}
                                {log.entity_name && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Entity Name</p>
                                        <p className="text-sm font-medium">{log.entity_name}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Reference & Technical Details */}
                    <section aria-labelledby="technical-heading">
                        <h3 id="technical-heading" className="text-sm font-semibold text-gray-900 mb-3">Technical Details</h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-2">
                                    <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Log ID</p>
                                        <div className="flex items-center gap-1">
                                            <p className="text-sm font-mono">{log.id}</p>
                                            <CopyButton text={String(log.id)} field="log_id" />
                                        </div>
                                    </div>
                                </div>
                                {log.reference_number && (
                                    <div className="flex items-start gap-2">
                                        <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Reference Number</p>
                                            <div className="flex items-center gap-1">
                                                <p className="text-sm font-mono">{log.reference_number}</p>
                                                <CopyButton text={log.reference_number} field="ref_number" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {log.ip_address && (
                                <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                                    <Globe className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">IP Address</p>
                                        <p className="text-sm font-mono">{log.ip_address}</p>
                                    </div>
                                </div>
                            )}
                            {log.user_agent && (
                                <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                                    <Monitor className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground">User Agent</p>
                                        <p className="text-xs font-mono text-gray-600 break-all">{log.user_agent}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Changes - Old Values */}
                    {log.old_values && Object.keys(log.old_values).length > 0 && (
                        <section aria-labelledby="old-values-heading">
                            <h3 id="old-values-heading" className="text-sm font-semibold text-gray-900 mb-3">
                                Previous Values
                            </h3>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <pre className="text-xs font-mono whitespace-pre-wrap break-words text-red-800 overflow-x-auto">
                                    {JSON.stringify(log.old_values, null, 2)}
                                </pre>
                            </div>
                        </section>
                    )}

                    {/* Changes - New Values */}
                    {log.new_values && Object.keys(log.new_values).length > 0 && (
                        <section aria-labelledby="new-values-heading">
                            <h3 id="new-values-heading" className="text-sm font-semibold text-gray-900 mb-3">
                                New Values
                            </h3>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <pre className="text-xs font-mono whitespace-pre-wrap break-words text-green-800 overflow-x-auto">
                                    {JSON.stringify(log.new_values, null, 2)}
                                </pre>
                            </div>
                        </section>
                    )}

                    {/* Snapshot */}
                    {log.snapshot && Object.keys(log.snapshot).length > 0 && (
                        <section aria-labelledby="snapshot-heading">
                            <h3 id="snapshot-heading" className="text-sm font-semibold text-gray-900 mb-3">
                                Entity Snapshot (at time of action)
                            </h3>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <pre className="text-xs font-mono whitespace-pre-wrap break-words text-blue-800 overflow-x-auto">
                                    {JSON.stringify(log.snapshot, null, 2)}
                                </pre>
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const logData = JSON.stringify(log, null, 2);
                            copyToClipboard(logData, 'full_log');
                        }}
                    >
                        {copied === 'full_log' ? (
                            <>
                                <Check className="h-4 w-4 mr-2 text-green-600" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Full Log
                            </>
                        )}
                    </Button>
                    <Button variant="default" size="sm" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
});

export default AuditLogDetailModal;
