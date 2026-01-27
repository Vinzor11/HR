import { memo, useMemo } from 'react';
import { type AuditLog } from './AuditLogCard';
import { AuditLogCard } from './AuditLogCard';

interface AuditLogTimelineProps {
    logs: AuditLog[];
    expandedFields: Set<string>;
    onToggleField: (fieldKey: string) => void;
    onCardClick?: (log: AuditLog) => void;
}

export const AuditLogTimeline = memo(function AuditLogTimeline({
    logs,
    expandedFields,
    onToggleField,
    onCardClick,
}: AuditLogTimelineProps) {
    // Group logs by date
    const groupedLogs = useMemo(() => {
        const groups: Record<string, AuditLog[]> = {};
        logs.forEach((log) => {
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
    }, [logs]);

    // Sort dates in descending order
    const sortedDates = useMemo(() => {
        return Object.keys(groupedLogs).sort((a, b) => {
            return new Date(b).getTime() - new Date(a).getTime();
        });
    }, [groupedLogs]);

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {sortedDates.map((dateKey, dateIndex) => {
                const dateLogs = groupedLogs[dateKey];
                const eventCount = dateLogs.length;
                
                return (
                    <section 
                        key={dateKey} 
                        className={dateIndex > 0 ? 'mt-6' : ''}
                        aria-labelledby={`date-header-${dateIndex}`}
                    >
                        {/* Date Header */}
                        <div className="flex items-center mb-4">
                            <div 
                                className="w-2 h-2 rounded-full bg-green-500 mr-2"
                                aria-hidden="true"
                            ></div>
                            <h2 
                                id={`date-header-${dateIndex}`}
                                className="text-sm font-semibold text-gray-600"
                            >
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
                                <div 
                                    className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"
                                    aria-hidden="true"
                                ></div>
                            )}
                            
                            <div className="space-y-6">
                                {dateLogs.map((log) => (
                                    <AuditLogCard
                                        key={log.id}
                                        log={log}
                                        expandedFields={expandedFields}
                                        onToggleField={onToggleField}
                                        onCardClick={onCardClick}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                );
            })}
        </div>
    );
});

export default AuditLogTimeline;
