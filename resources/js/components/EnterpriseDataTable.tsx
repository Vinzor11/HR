import { usePage } from '@inertiajs/react';
import * as LucidIcons from 'lucide-react';
import { Button } from './ui/button';
import { hasPermission } from '@/utils/authorization';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Badge } from './ui/badge';
import { MoreVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

// Enhanced helper function
const getNestedValue = (obj: any, path: string): any => {
  if (!obj || typeof obj !== 'object') return null;
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return null;
    return acc[key] !== undefined ? acc[key] : null;
  }, obj);
};

interface TableColumn {
  label: string;
  key: string;
  isImage?: boolean;
  isAction?: boolean;
  className?: string;
  type?: string;
  displayKey?: string;
  defaultValue?: any;
  format?: (value: any) => string;
  group?: string;
  visible?: boolean;
  alwaysVisible?: boolean;
}

interface ActionConfig {
  label: string;
  icon: keyof typeof LucidIcons;
  route?: string;
  className?: string;
  permission?: string;
  confirm?: {
    title: string;
    message: string;
  };
  onClick?: (row: any) => void;
}

interface TableRow {
  [key: string]: any;
  id?: string | number;
}

interface EnterpriseDataTableProps {
  columns: TableColumn[];
  actions: ActionConfig[];
  data: TableRow[];
  from: number;
  onDelete?: (route: string) => void;
  onView?: (row: TableRow) => void;
  onEdit?: (row: TableRow) => void;
  onRowExpand?: (row: TableRow) => void;
  expandedRows?: Set<string | number>;
}

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { bg: string; text: string }> = {
    active: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    inactive: { bg: 'bg-red-50', text: 'text-red-700' },
    'on-leave': { bg: 'bg-amber-50', text: 'text-amber-700' },
  };

  const config = statusConfig[status.toLowerCase()] || { bg: 'bg-gray-50', text: 'text-gray-700' };

  return (
    <Badge className={`${config.bg} ${config.text} border-0 font-medium text-xs px-2 py-0.5`}>
      {status.replace('-', ' ')}
    </Badge>
  );
};

// Truncate text with tooltip
const TruncatedText = ({ text, maxLength = 30 }: { text: string; maxLength?: number }) => {
  if (!text || text.length <= maxLength) {
    return <span className="text-gray-900">{text || '-'}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help truncate block text-gray-900">{text.substring(0, maxLength)}...</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs break-words">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const EnterpriseDataTable = ({
  columns,
  actions,
  data,
  from,
  onDelete,
  onView,
  onEdit,
  onRowExpand,
  expandedRows = new Set(),
}: EnterpriseDataTableProps) => {
  const { auth } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const tableRef = useRef<HTMLTableElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [stickyPositions, setStickyPositions] = useState<number[]>([]);

  // Calculate sticky column positions (Employee ID column)
  useEffect(() => {
    if (tableRef.current && data.length > 0) {
      const table = tableRef.current;
      const firstRow = table.querySelector('tbody tr');
      if (firstRow) {
        const positions: number[] = [0]; // Row number column
        const cells = firstRow.querySelectorAll('td');
        if (cells.length > 0) {
          positions.push(cells[0].getBoundingClientRect().width); // Employee ID column
        }
        setStickyPositions(positions);
      }
    }
  }, [data, columns]);

  const renderActionButtons = (row: TableRow) => {
    const availableActions = actions.filter(
      (action) => !action.permission || hasPermission(permissions, action.permission)
    );

    if (availableActions.length === 0) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
            <MoreVertical className="h-4 w-4 text-gray-600" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {availableActions.map((action, index) => {
            const IconComponent = LucidIcons[action.icon] as React.ElementType;

            if (action.label === 'View' && onView) {
              return (
                <DropdownMenuItem
                  key={index}
                  onClick={() => onView(row)}
                  className="cursor-pointer"
                >
                  <IconComponent className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
              );
            }

            if (action.label === 'Edit' && onEdit) {
              return (
                <DropdownMenuItem
                  key={index}
                  onClick={() => onEdit(row)}
                  className="cursor-pointer"
                >
                  <IconComponent className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              );
            }

            if (action.label === 'Delete' && action.route && onDelete) {
              return (
                <DropdownMenuItem
                  key={index}
                  onClick={() => {
                    if (action.confirm && !confirm(action.confirm.message)) return;
                    onDelete(route(action.route!, row.id));
                  }}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <IconComponent className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              );
            }

            if (action.onClick) {
              return (
                <DropdownMenuItem
                  key={index}
                  onClick={() => action.onClick?.(row)}
                  className="cursor-pointer"
                >
                  {IconComponent && <IconComponent className="mr-2 h-4 w-4" />}
                  {action.label}
                </DropdownMenuItem>
              );
            }

            return null;
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderMultiValuesAsText = (items: any[], column: TableColumn) => {
    if (!items || items.length === 0) {
      return <span className="text-gray-400">-</span>;
    }

    const propertyName = column.displayKey || column.key.split('.')[1];
    const values = items
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        let displayValue = '-';
        if (propertyName) {
          displayValue = getNestedValue(item, propertyName) ?? '-';
        } else if (column.format) {
          displayValue = column.format(item) ?? '-';
        } else {
          displayValue = item.name || item.title || item.full_name || '-';
        }
        return displayValue;
      })
      .filter(Boolean)
      .slice(0, 3);

    if (values.length === 0) {
      return <span className="text-gray-400">-</span>;
    }

    const remaining = items.length - values.length;
    const displayText = values.join(', ') + (remaining > 0 ? ` (+${remaining})` : '');

    return <TruncatedText text={displayText} maxLength={40} />;
  };

  const renderCellValue = (col: TableColumn, cellValue: any, row: TableRow) => {
    if (col.isAction) {
      return renderActionButtons(row);
    }

    // Handle "Name" column - show full name (first name + surname)
    if (col.key === 'surname' && col.label === 'Name') {
      const firstName = getNestedValue(row, 'first_name') || '';
      const surname = getNestedValue(row, 'surname') || '';
      const fullName = `${firstName} ${surname}`.trim() || '-';
      return <TruncatedText text={fullName} maxLength={30} />;
    }

    if (cellValue === null || cellValue === undefined) {
      return <span className="text-gray-400">{col.defaultValue ?? '-'}</span>;
    }

    if (col.isImage) {
      return (
        <div className="flex justify-center">
          <img
            src={cellValue || ''}
            alt={row.name || 'Image'}
            className="h-10 w-10 rounded-full object-cover border border-gray-200"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      );
    }

    if (col.type === 'multi-values') {
      const arrayKey = col.key.split('.')[0];
      const itemsArray = Array.isArray(row[arrayKey]) ? row[arrayKey] : [];
      return renderMultiValuesAsText(itemsArray, col);
    }

    if (col.key === 'status') {
      return <StatusBadge status={cellValue} />;
    }

    if (col.format) {
      return <TruncatedText text={col.format(cellValue) ?? '-'} />;
    }

    return <TruncatedText text={String(cellValue)} />;
  };

  const isRowExpanded = (rowId: string | number) => expandedRows.has(rowId);

  const getStickyStyle = (colIndex: number) => {
    if (colIndex === 0) return { left: '0px' };
    if (colIndex === 1 && stickyPositions[1]) {
      return { left: `${stickyPositions[1]}px` };
    }
    return {};
  };

  const getStickyClass = (colIndex: number, isHeader: boolean = false) => {
    if (colIndex > 1) return '';
    const zIndex = isHeader ? 'z-20' : 'z-10';
    const bgColor = isHeader ? 'bg-white' : 'bg-white';
    const shadow = colIndex > 0 ? 'shadow-[2px_0_4px_rgba(0,0,0,0.05)]' : '';
    return `sticky ${bgColor} ${zIndex} border-r border-gray-200 ${shadow}`;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-auto"
        style={{
          maxHeight: 'calc(100vh - 400px)',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <table ref={tableRef} className="w-full divide-y divide-gray-100">
          <thead className="bg-gray-50 sticky top-0 z-30 border-b-2 border-gray-200">
            <tr>
              <th
                className={`px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider ${getStickyClass(0, true)}`}
                style={getStickyStyle(0)}
              >
                #
              </th>
              {columns.map((column, colIndex) => {
                const isSticky = colIndex === 0; // Employee ID is first data column
                return (
                  <th
                    key={`header-${column.key}`}
                    className={`px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap ${
                      column.className || ''
                    } ${isSticky ? getStickyClass(1, true) : ''}`}
                    style={isSticky ? getStickyStyle(1) : {}}
                  >
                    {column.label}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-100">
            {data.length > 0 ? (
              data.map((row, rowIndex) => {
                const rowId = row.id || rowIndex;
                const expanded = isRowExpanded(rowId);
                const employeeId = getNestedValue(row, 'id');
                const employeeName = `${getNestedValue(row, 'first_name') || ''} ${getNestedValue(row, 'surname') || ''}`.trim();

                return (
                  <>
                    <tr
                      key={`row-${rowId}`}
                      className={`hover:bg-gray-50 transition-colors duration-150 cursor-pointer group ${
                        rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                      onClick={() => onRowExpand?.(row)}
                    >
                      <td
                        className={`px-6 py-4 text-sm text-gray-500 font-medium ${getStickyClass(0)}`}
                        style={getStickyStyle(0)}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRowExpand?.(row);
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <span>{from + rowIndex}</span>
                        </div>
                      </td>
                      {columns.map((col, colIndex) => {
                        const cellKey = col.type === 'multi-values' ? col.key.split('.')[0] : col.key;
                        const cellValue = getNestedValue(row, cellKey);
                        const isSticky = colIndex === 0; // Employee ID column

                        return (
                          <td
                            key={`cell-${col.key}-${rowId}`}
                            className={`px-6 py-4 text-sm text-gray-900 whitespace-nowrap ${
                              col.isAction
                                ? 'sticky right-0 bg-white z-15 border-l border-gray-200 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]'
                                : ''
                            } ${isSticky ? getStickyClass(1) : ''} ${col.className || ''}`}
                            style={col.isAction ? {} : isSticky ? getStickyStyle(1) : {}}
                            onClick={(e) => {
                              if (col.isAction) {
                                e.stopPropagation();
                              }
                            }}
                          >
                            {renderCellValue(col, cellValue, row)}
                          </td>
                        );
                      })}
                    </tr>
                    {expanded && (
                      <tr key={`expanded-${rowId}`} className="bg-gray-50/30">
                        <td colSpan={columns.length + 1} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-semibold text-gray-700">Employee ID:</span>
                              <span className="ml-2 text-gray-900">{employeeId}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Full Name:</span>
                              <span className="ml-2 text-gray-900">{employeeName}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Status:</span>
                              <span className="ml-2">
                                <StatusBadge status={getNestedValue(row, 'status') || ''} />
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Position:</span>
                              <span className="ml-2 text-gray-900">
                                {getNestedValue(row, 'position.pos_name') || '-'}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Department:</span>
                              <span className="ml-2 text-gray-900">
                                {getNestedValue(row, 'department.faculty_name') || '-'}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-700">Email:</span>
                              <span className="ml-2 text-gray-900">
                                {getNestedValue(row, 'email_address') || '-'}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-900">No employees found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

