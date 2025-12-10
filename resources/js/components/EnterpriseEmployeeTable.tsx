import { usePage } from '@inertiajs/react';
import * as LucideIcons from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { hasPermission } from '@/utils/authorization';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ChevronDown, ChevronRight, Eye, Pencil, Trash2, MoreVertical, RotateCcw } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { route } from 'ziggy-js';

// Helper function
const getNestedValue = (obj: any, path: string): any => {
  if (!obj || typeof obj !== 'object') return null;
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return null;
    return acc[key] !== undefined ? acc[key] : null;
  }, obj);
};

// Helper function to extract ID from a row, checking multiple possible ID fields
const getRowId = (row: TableRow): string | number | undefined => {
  // First check the standard 'id' field
  if (row.id !== undefined && row.id !== null) {
    return row.id;
  }
  
  // Then check common resource-specific ID fields
  if (row.department_id !== undefined && row.department_id !== null) {
    return row.department_id;
  }
  if (row.position_id !== undefined && row.position_id !== null) {
    return row.position_id;
  }
  if (row.training_id !== undefined && row.training_id !== null) {
    return row.training_id;
  }
  if (row.employee_id !== undefined && row.employee_id !== null) {
    return row.employee_id;
  }
  if (row.category_id !== undefined && row.category_id !== null) {
    return row.category_id;
  }
  if (row.role_id !== undefined && row.role_id !== null) {
    return row.role_id;
  }
  if (row.permission_id !== undefined && row.permission_id !== null) {
    return row.permission_id;
  }
  if (row.user_id !== undefined && row.user_id !== null) {
    return row.user_id;
  }
  
  return undefined;
};

// Helper function to build route with correct parameter name for Laravel resource routes
const buildRoute = (routeName: string, id: string | number | undefined): string => {
  if (!id) {
    console.error(`buildRoute: Missing ID for route ${routeName}`);
    throw new Error(`ID is required for route ${routeName}`);
  }
  
  // Extract resource name from route (e.g., 'departments' from 'departments.destroy')
  const routeParts = routeName.split('.');
  if (routeParts.length >= 1) {
    const resourceName = routeParts[0];
    // Convert plural to singular for parameter name
    // Handle common pluralization patterns
    let singularResource = resourceName;
    
    if (resourceName.endsWith('ies')) {
      // categories -> category
      singularResource = resourceName.slice(0, -3) + 'y';
    } else if (resourceName.endsWith('es')) {
      // Check if removing just 's' would leave a word ending in 'e'
      // (like roles -> role, names -> name, types -> type)
      const withoutS = resourceName.slice(0, -1);
      if (withoutS.endsWith('e')) {
        // roles -> role, names -> name, types -> type
        singularResource = withoutS;
      } else if (resourceName.endsWith('ses') || resourceName.endsWith('ches') || resourceName.endsWith('shes') || resourceName.endsWith('xes')) {
        // addresses -> address, boxes -> box, etc.
        singularResource = resourceName.slice(0, -2);
      } else {
        // positions -> position (ends with 'es' but not 'e' + 's')
        singularResource = resourceName.slice(0, -2);
      }
    } else if (resourceName.endsWith('s')) {
      // departments -> department, users -> user
      singularResource = resourceName.slice(0, -1);
    }
    
    // Use explicit parameter name for resource routes
    return route(routeName, { [singularResource]: id });
  }
  
  // Fallback to simple ID if pattern doesn't match
  return route(routeName, id);
};

interface TableColumn {
  key: string;
  label: string;
  className?: string;
  group?: string;
  visible?: boolean;
  alwaysVisible?: boolean;
  isAction?: boolean;
  type?: 'multi-values' | string;
  displayKey?: string;
  format?: (value: any, row?: any) => string | React.ReactNode;
  defaultValue?: string;
}

interface ActionConfig {
  label: string;
  icon: string;
  route?: string;
  className?: string;
  permission?: string;
  onClick?: (row: any) => void;
  confirm?: { message: string };
}

interface TableRow {
  [key: string]: any;
  id?: string | number;
}

interface EnterpriseEmployeeTableProps {
  columns: TableColumn[];
  actions: ActionConfig[];
  data: TableRow[];
  from: number;
  onDelete?: (route: string) => void;
  onView?: (row: TableRow) => void;
  onEdit?: (row: TableRow) => void;
  resourceType?: string;
  onRestore?: (id: string | number) => void;
  onForceDelete?: (id: string | number) => void;
  onRowExpand?: (row: TableRow) => void;
  expandedRows?: Set<string | number>;
  isLoading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  viewMode?: 'auto' | 'table' | 'card';
  onViewModeChange?: (mode: 'auto' | 'table' | 'card') => void;
  enableExpand?: boolean; // Enable/disable expand column
}

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
    active: { 
      bg: 'bg-green-100', 
      text: 'text-green-800',
      darkBg: 'dark:bg-green-900/30',
      darkText: 'dark:text-green-400'
    },
    inactive: { 
      bg: 'bg-red-100', 
      text: 'text-red-800',
      darkBg: 'dark:bg-red-900/30',
      darkText: 'dark:text-red-400'
    },
    'on-leave': { 
      bg: 'bg-yellow-100', 
      text: 'text-yellow-800',
      darkBg: 'dark:bg-yellow-900/30',
      darkText: 'dark:text-yellow-400'
    },
  };

  const config = statusConfig[status.toLowerCase()] || { 
    bg: 'bg-muted', 
    text: 'text-muted-foreground',
    darkBg: 'dark:bg-muted',
    darkText: 'dark:text-muted-foreground'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${config.darkBg} ${config.darkText}`}>
      {status.replace('-', ' ')}
    </span>
  );
};

// Truncate text helper
const truncateText = (text: string, maxLength: number = 30): string => {
  if (!text || text.length <= maxLength) return text || '-';
  return text.substring(0, maxLength) + '...';
};

export const EnterpriseEmployeeTable = ({
  columns,
  actions,
  data,
  from,
  onDelete,
  onView,
  onEdit,
  resourceType = 'employee',
  onRestore,
  onForceDelete,
  onRowExpand,
  expandedRows = new Set(),
  isLoading = false,
  sortBy,
  sortOrder = 'asc',
  onSort,
  viewMode = 'auto',
  onViewModeChange,
  enableExpand = true, // Default to true for backward compatibility
}: EnterpriseEmployeeTableProps) => {
  const { auth } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [stickyPositions, setStickyPositions] = useState<number[]>([]);
  const [autoDetectedCardMode, setAutoDetectedCardMode] = useState(false);
  
  // Determine if we should show card mode
  const isCardMode = viewMode === 'card' || (viewMode === 'auto' && autoDetectedCardMode);
  
  // Essential columns for card view (shown at top) - employee-specific
  const essentialColumnKeys = ['id', 'surname', 'first_name', 'position.pos_name', 'department.faculty_name', 'status', 'employment_status', 'employee_type'];
  
  // Helper to find the primary title/name column for generic card view
  const getPrimaryColumn = (cols: TableColumn[]): TableColumn | null => {
    // Look for common name/title fields first
    const nameKeys = ['name', 'label', 'title', 'faculty_name', 'pos_name', 'first_name', 'surname'];
    for (const key of nameKeys) {
      const col = cols.find(c => c.key === key || c.key.includes(key));
      if (col) return col;
    }
    // Fallback to first non-ID, non-action column
    return cols.find(c => c.key !== 'id' && !c.isAction) || cols[0] || null;
  };

  // Check if table width exceeds viewport and switch to card mode (only in auto mode)
  useEffect(() => {
    // Skip auto-detection if view mode is manually set
    if (viewMode !== 'auto') return;
    
    const checkTableWidth = () => {
      // If in auto-detected card mode, check if we should switch back to table mode
      if (autoDetectedCardMode) {
        if (!containerRef.current) return;
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        
        // Estimate minimum table width needed
        const dataColumns = columns.filter(col => !col.isAction);
        const estimatedMinWidth = dataColumns.length * 150 + 300; // 300px for fixed columns
        
        // Switch back to table mode if container is wide enough
        if (containerWidth > estimatedMinWidth + 100) {
          setAutoDetectedCardMode(false);
        }
        return;
      }
      
      // If in table mode, check if we need to switch to card mode
      if (!tableRef.current || !scrollContainerRef.current) return;
      
      const table = tableRef.current;
      const scrollContainer = scrollContainerRef.current;
      
      // Check if horizontal scrollbar is present (indicates overflow)
      const hasHorizontalScroll = scrollContainer.scrollWidth > scrollContainer.clientWidth;
      
      // Also calculate estimated table width based on columns
      const dataColumns = columns.filter(col => !col.isAction);
      const estimatedTableWidth = dataColumns.length * 150 + 300;
      const visibleWidth = scrollContainer.clientWidth;
      
      // Switch to card mode if scrollbar is present or estimated width exceeds visible width
      const shouldBeCardMode = hasHorizontalScroll || estimatedTableWidth > visibleWidth;
      
      if (shouldBeCardMode !== autoDetectedCardMode) {
        setAutoDetectedCardMode(shouldBeCardMode);
      }
    };

    // Initial check with delays to ensure DOM is ready
    const timeoutId = setTimeout(checkTableWidth, 200);
    const timeoutId2 = setTimeout(checkTableWidth, 500);

    // Use ResizeObserver to watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(checkTableWidth, 50);
    });

    if (tableRef.current) {
      resizeObserver.observe(tableRef.current);
    }
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }

    // Also listen to window resize
    window.addEventListener('resize', checkTableWidth);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkTableWidth);
    };
  }, [data, columns, autoDetectedCardMode, viewMode]);

  // Calculate sticky column positions (only in table mode)
  useEffect(() => {
    if (isCardMode || !tableRef.current || data.length === 0) return;
    
    const table = tableRef.current;
    const firstRow = table.querySelector('tbody tr');
    if (firstRow) {
      if (!enableExpand) {
        // When expand is disabled: Row # at 0, then Employee ID
        const positions: number[] = [0]; // Row # at 0
        const cells = firstRow.querySelectorAll('td');
        if (cells.length > 0) {
          const rowNumberWidth = cells[0].getBoundingClientRect().width;
          positions.push(rowNumberWidth); // Employee ID position
        }
        setStickyPositions(positions);
      } else {
        // When expand is enabled: Expand icon at 0, Row # at 48px
        const positions: number[] = [0, 48]; // Expand icon at 0, Row # at 48px
        let cumulativeWidth = 48; // Start after expand icon (48px) and row # (60px)
        
        const cells = firstRow.querySelectorAll('td');
        // Calculate Employee ID position (third column)
        if (cells.length > 1) {
          cumulativeWidth += cells[1].getBoundingClientRect().width; // Row # width
          positions.push(cumulativeWidth);
        }
        setStickyPositions(positions);
      }
    }
  }, [data, isCardMode]);

  const renderCellValue = (col: TableColumn, cellValue: any, row: TableRow) => {
    if (col.isAction) {
      return renderActionButtons(row);
    }

    // Check for format function first - it might need to handle null values
    if (col.format) {
      // Pass both cellValue and row to format function if it accepts 2 parameters
      const formattedValue = col.format.length === 2 
        ? col.format(cellValue, row)
        : col.format(cellValue);
      
      // Check if the formatted value is already a React element (JSX)
      if (React.isValidElement(formattedValue)) {
        return formattedValue;
      }
      
      return <span className="text-sm text-foreground">{formattedValue ?? '-'}</span>;
    }

    if (cellValue === null || cellValue === undefined) {
      return <span className="text-muted-foreground">-</span>;
    }

    if (col.key === 'status') {
      return <StatusBadge status={cellValue} />;
    }

    if (col.type === 'multi-values') {
      const arrayKey = col.key.split('.')[0];
      const itemsArray = Array.isArray(row[arrayKey]) ? row[arrayKey] : [];
      if (itemsArray.length === 0) return <span className="text-muted-foreground">-</span>;
      
      const propertyName = col.displayKey || col.key.split('.')[1];
      
      return (
        <div className="flex flex-wrap items-center gap-1">
          {itemsArray
            .filter((item: any) => item != null)
            .map((item: any, index: number) => {
              const displayValue = propertyName 
                ? (getNestedValue(item, propertyName) || '-')
                : (item.name || item.label || item.title || '-');
              
              // Generate unique key: prefer id, fallback to index with a prefix
              const uniqueKey = item.id ? `badge-${item.id}` : `badge-${col.key}-${index}`;
              
              return (
                <Badge 
                  key={uniqueKey}
                  className="bg-primary/20 text-black border border-primary/30 dark:bg-primary/30 dark:text-black px-3 py-0.5"
                >
                  {displayValue}
                </Badge>
              );
            })}
        </div>
      );
    }

    const text = String(cellValue);
    return (
      <span className="text-sm text-foreground" title={text.length > 30 ? text : undefined}>
        {truncateText(text, 30)}
      </span>
    );
  };

  // Helper function to get delete confirmation message based on resource type
  const getDeleteConfirmMessage = (row: TableRow): string => {
    // Special handling for users with employee_id (deactivate vs delete)
    if (resourceType === 'user') {
      const hasEmployee = row.employee_id !== null && row.employee_id !== undefined && row.employee_id !== '';
      if (hasEmployee) {
        return 'Are you sure you want to deactivate this user? The account will be disabled but can be restored later.';
      }
      return 'Are you sure you want to delete this user?';
    }

    // Resource-specific messages
    const resourceMessages: Record<string, string> = {
      employee: 'Are you sure you want to delete this employee?',
      faculty: 'Are you sure you want to delete this faculty?',
      department: 'Are you sure you want to delete this department?',
      position: 'Are you sure you want to delete this position?',
      role: 'Are you sure you want to delete this role?',
      permission: 'Are you sure you want to delete this permission?',
      training: 'Are you sure you want to delete this training?',
    };

    return resourceMessages[resourceType] || 'Are you sure you want to delete this item?';
  };

  const renderActionButtons = (row: TableRow) => {
    const isSoftDeleted = row.deleted_at !== null && row.deleted_at !== undefined;
    
    // If soft-deleted, show restore and force delete buttons
    if (isSoftDeleted) {
      // Determine restore and force-delete permissions based on the resource type prop
      const restorePermission = resourceType === 'faculty' ? 'restore-faculty' 
        : resourceType === 'department' ? 'restore-department'
        : resourceType === 'position' ? 'restore-position'
        : resourceType === 'user' ? 'restore-user'
        : resourceType === 'training' ? 'restore-training'
        : 'restore-employee';
      const forceDeletePermission = resourceType === 'faculty' ? 'force-delete-faculty'
        : resourceType === 'department' ? 'force-delete-department'
        : resourceType === 'position' ? 'force-delete-position'
        : resourceType === 'user' ? 'force-delete-user'
        : resourceType === 'training' ? 'force-delete-training'
        : 'force-delete-employee';

      return (
        <div className="flex items-center gap-1">
          {onRestore && hasPermission(permissions, restorePermission) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30"
                    onClick={() => {
                      if (confirm('Are you sure you want to restore this item?')) {
                        onRestore(row.id!);
                      }
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Restore</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onForceDelete && hasPermission(permissions, forceDeletePermission) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                    onClick={() => {
                      if (confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) {
                        onForceDelete(row.id!);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Permanently Delete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      );
    }
    
    const availableActions = actions.filter(action => {
      if (action.permission) {
        return hasPermission(permissions, action.permission);
      }
      return true;
    });

    if (availableActions.length === 0) {
      return <span className="text-muted-foreground text-xs">No actions</span>;
    }

    // Use dropdown menu for 3+ actions, otherwise show icon buttons
    if (availableActions.length > 2) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableActions.map((action) => {
              const IconComponent = (LucideIcons as any)[action.icon] || LucideIcons.Circle;
              
              if (action.label === 'View' && onView) {
                return (
                  <DropdownMenuItem key={action.label} onClick={() => onView(row)}>
                    <IconComponent className="mr-2 h-4 w-4" />
                    View
                  </DropdownMenuItem>
                );
              }
              
              if (action.label === 'Edit' && onEdit) {
                return (
                  <DropdownMenuItem key={action.label} onClick={() => onEdit(row)}>
                    <IconComponent className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                );
              }
              
              if ((action.label === 'Delete' || action.label === 'Delete/Deactivate') && action.route && onDelete) {
                const confirmMessage = getDeleteConfirmMessage(row);
                // For users, determine if it's deactivate or delete
                const actionLabel = resourceType === 'user' && row.employee_id 
                  ? 'Deactivate' 
                  : 'Delete';
                
                return (
                  <DropdownMenuItem
                    key={action.label}
                    onClick={() => {
                      if (!confirm(confirmMessage)) return;
                      const rowId = getRowId(row);
                      if (!rowId) {
                        console.error('Delete action: row ID is missing', row);
                        return;
                      }
                      onDelete(buildRoute(action.route!, rowId));
                    }}
                    className="text-red-600"
                  >
                    <IconComponent className="mr-2 h-4 w-4" />
                    {actionLabel}
                  </DropdownMenuItem>
                );
              }
              
              return null;
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    // Show icon buttons with tooltips for 1-2 actions
    return (
      <div className="flex items-center gap-1">
        {availableActions.map((action) => {
          const IconComponent = (LucideIcons as any)[action.icon] || LucideIcons.Circle;
          
          if (action.label === 'View' && onView) {
            return (
              <TooltipProvider key={action.label}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => onView(row)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          
          if (action.label === 'Edit' && onEdit) {
            return (
              <TooltipProvider key={action.label}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      onClick={() => onEdit(row)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          
          if ((action.label === 'Delete' || action.label === 'Delete/Deactivate') && action.route && onDelete) {
            const confirmMessage = getDeleteConfirmMessage(row);
            // For users, determine if it's deactivate or delete
            const actionLabel = resourceType === 'user' && row.employee_id 
              ? 'Deactivate' 
              : 'Delete';
            
            return (
              <TooltipProvider key={action.label}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (!confirm(confirmMessage)) return;
                        const rowId = getRowId(row);
                        if (!rowId) {
                          console.error('Delete action: row ID is missing', row);
                          return;
                        }
                        onDelete(buildRoute(action.route!, rowId));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{actionLabel}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          
          return null;
        })}
      </div>
    );
  };

  const isRowExpanded = (rowId: string | number | undefined) => {
    if (!rowId) return false;
    return expandedRows.has(rowId);
  };

  const getStickyStyle = (colIndex: number) => {
    // colIndex: 0 = expand (if enabled), 1 = row #, 2 = employee ID
    if (!enableExpand) {
      // When expand is disabled: 0 = row #, 1 = employee ID
      if (colIndex === 0) return { left: '0px' }; // Row #
      if (colIndex === 1) return { left: `${stickyPositions[1] !== undefined ? stickyPositions[1] : 60}px` }; // Employee ID
      return {};
    } else {
      // When expand is enabled: 0 = expand, 1 = row #, 2 = employee ID
      if (colIndex > 2) return {};
      return { left: `${stickyPositions[colIndex] !== undefined ? stickyPositions[colIndex] : colIndex * 60}px` };
    }
  };

  const getStickyClass = (colIndex: number, isHeader: boolean = false) => {
    if (!enableExpand) {
      // When expand is disabled: 0 = row #, 1 = employee ID
      if (colIndex > 1) return '';
      const zIndex = isHeader ? 'z-30' : 'z-10';
      const bgColor = isHeader ? 'bg-muted/70 dark:bg-muted-dark/70' : 'bg-card';
      const shadow = colIndex > 0 ? 'shadow-[2px_0_4px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_4px_rgba(0,0,0,0.3)]' : '';
      return `sticky ${bgColor} ${zIndex} border-r border-border ${shadow}`;
    } else {
      // When expand is enabled: 0 = expand, 1 = row #, 2 = employee ID
      if (colIndex > 2) return '';
      const zIndex = isHeader ? 'z-30' : 'z-10';
      const bgColor = isHeader ? 'bg-muted/70 dark:bg-muted-dark/70' : 'bg-card';
      const shadow = colIndex > 0 ? 'shadow-[2px_0_4px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_4px_rgba(0,0,0,0.3)]' : '';
      return `sticky ${bgColor} ${zIndex} border-r border-border ${shadow}`;
    }
  };

  // Get action column (should be sticky right)
  const actionColumn = columns.find(col => col.isAction);
  const dataColumns = columns.filter(col => !col.isAction);

  // Separate essential and other columns for card view
  const essentialColumns = dataColumns.filter(col => 
    essentialColumnKeys.includes(col.key)
  );
  const otherColumns = dataColumns.filter(col => 
    !essentialColumnKeys.includes(col.key) && !col.isAction
  );
  
  // For generic card view (non-employee tables), determine primary and secondary columns
  const primaryColumn = getPrimaryColumn(dataColumns);
  const secondaryColumns = dataColumns.filter(col => 
    col.key !== 'id' && 
    !col.isAction && 
    col.key !== primaryColumn?.key &&
    col.key !== 'status'
  ).slice(0, 3); // Show first 3 secondary columns
  const remainingColumns = dataColumns.filter(col => 
    col.key !== 'id' && 
    !col.isAction && 
    col.key !== primaryColumn?.key &&
    !secondaryColumns.includes(col) &&
    col.key !== 'status'
  );

  // Render card view
  const renderCardView = () => {
    if (isLoading) {
      return (
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={`skeleton-card-${idx}`} className="bg-card border border-border rounded-lg p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                  <div className="h-5 bg-muted rounded w-16 animate-pulse"></div>
                </div>
                <div className="h-5 bg-muted rounded w-3/4 animate-pulse mb-3"></div>
                <div className="space-y-1.5 mb-3">
                  <div className="h-3 bg-muted rounded w-full animate-pulse"></div>
                  <div className="h-3 bg-muted rounded w-4/5 animate-pulse"></div>
                  <div className="h-3 bg-muted rounded w-3/5 animate-pulse"></div>
                </div>
                <div className="space-y-1 pt-2 border-t border-border">
                  <div className="h-3 bg-muted rounded w-full animate-pulse"></div>
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-muted-foreground mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-md font-bold text-muted-foreground">No data found.</p>
          <p className="text-sm text-muted-foreground/80 mt-1">Try adjusting your search or filters.</p>
        </div>
      );
    }
    
    // Check if this is an employee table (has employee-specific essential columns)
    const isEmployeeTable = essentialColumns.length > 0;

    return (
      <div className="p-4">
        {/* Grid Layout - Responsive columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {data.map((row, rowIndex) => {
            const rowNumber = from + rowIndex;
            const rowId = getRowId(row);
            const isExpanded = isRowExpanded(rowId);
            
            // For employee tables, use the hardcoded employee-specific display
            if (isEmployeeTable) {
              const employeeId = getNestedValue(row, 'id') || '-';
              const surname = getNestedValue(row, 'surname') || '';
              const firstName = getNestedValue(row, 'first_name') || '';
              const position = getNestedValue(row, 'position.pos_name') || getNestedValue(row, 'position.name') || '-';
              const department = getNestedValue(row, 'department.faculty_name') || getNestedValue(row, 'department.name') || '-';
              const status = getNestedValue(row, 'status') || '-';
              const employeeType = getNestedValue(row, 'employee_type') || '-';
              const email = getNestedValue(row, 'email_address') || '-';
              const mobile = getNestedValue(row, 'mobile_no') || '-';
              
              return (
                <div
                  key={`card-${rowId || rowIndex}`}
                  className={`bg-card border border-border rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group ${enableExpand ? 'cursor-pointer' : ''}`}
                  onClick={enableExpand ? () => onRowExpand?.(row) : undefined}
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">#{rowNumber}</span>
                        <span className="text-xs font-mono text-muted-foreground/80">ID: {employeeId}</span>
                      </div>
                      {status && status !== '-' && (
                        <StatusBadge status={status} />
                      )}
                    </div>
                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-foreground line-clamp-1">
                        {firstName} {surname}
                      </h3>
                    </div>
                    <div className="space-y-1.5 mb-3">
                      {position && position !== '-' && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground min-w-[60px]">Position:</span>
                          <span className="text-foreground font-medium truncate">{position}</span>
                        </div>
                      )}
                      {department && department !== '-' && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground min-w-[60px]">Dept:</span>
                          <span className="text-foreground font-medium truncate">{department}</span>
                        </div>
                      )}
                      {employeeType && employeeType !== '-' && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground min-w-[60px]">Type:</span>
                          <span className="text-foreground font-medium">{employeeType}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground border-t border-border pt-2">
                      {email && email !== '-' && (
                        <div className="truncate" title={email}>
                          📧 {email}
                        </div>
                      )}
                      {mobile && mobile !== '-' && (
                        <div>📱 {mobile}</div>
                      )}
                    </div>
                    {actionColumn && (
                      <div 
                        className="mt-3 pt-2 border-t border-border flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {renderActionButtons(row)}
                      </div>
                    )}
                    {enableExpand && (
                      <div className="flex items-center justify-center mt-2 pt-2 border-t border-border">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                  {enableExpand && isExpanded && otherColumns.length > 0 && (
                    <div className="p-3 bg-muted/20 border-t border-border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {otherColumns.map((col) => {
                          const cellKey = col.type === 'multi-values' 
                            ? col.key.split('.')[0] 
                            : col.key;
                          const cellValue = getNestedValue(row, cellKey);
                          return (
                            <div key={col.key} className="space-y-0.5">
                              <div className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">
                                {col.label}
                              </div>
                              <div className="text-foreground text-xs">
                                {renderCellValue(col, cellValue, row)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            
            // Generic card view for non-employee tables
            const primaryValue = primaryColumn ? getNestedValue(row, primaryColumn.key) : null;
            const primaryText = primaryValue ? String(primaryValue) : `Item #${rowNumber}`;
            const statusValue = getNestedValue(row, 'status');
            
            return (
              <div
                key={`card-${rowId || rowIndex}`}
                className={`bg-card border border-border rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group ${enableExpand ? 'cursor-pointer' : ''}`}
                onClick={enableExpand ? () => onRowExpand?.(row) : undefined}
              >
                <div className="p-3">
                  {/* Header - Row Number and Status */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">#{rowNumber}</span>
                      {rowId && (
                        <span className="text-xs font-mono text-muted-foreground/80">ID: {rowId}</span>
                      )}
                    </div>
                    {statusValue && statusValue !== '-' && (
                      <StatusBadge status={String(statusValue)} />
                    )}
                  </div>

                  {/* Primary Title/Name */}
                  {primaryColumn && (
                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-foreground line-clamp-2">
                        {primaryText}
                      </h3>
                    </div>
                  )}

                  {/* Secondary Details */}
                  {secondaryColumns.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {secondaryColumns.map((col) => {
                        const cellKey = col.type === 'multi-values' 
                          ? col.key.split('.')[0] 
                          : col.key;
                        const cellValue = getNestedValue(row, cellKey);
                        const displayValue = renderCellValue(col, cellValue, row);
                        
                        if (!cellValue || (typeof displayValue === 'string' && displayValue === '-')) {
                          return null;
                        }
                        
                        return (
                          <div key={col.key} className="flex items-start gap-1.5 text-xs">
                            <span className="text-muted-foreground min-w-[70px] flex-shrink-0">
                              {col.label}:
                            </span>
                            <span className="text-foreground font-medium line-clamp-2">
                              {displayValue}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  {actionColumn && (
                    <div 
                      className="mt-3 pt-2 border-t border-border flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderActionButtons(row)}
                    </div>
                  )}

                  {/* Expand Indicator */}
                  {enableExpand && (remainingColumns.length > 0 || otherColumns.length > 0) && (
                    <div className="flex items-center justify-center mt-2 pt-2 border-t border-border">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {enableExpand && isExpanded && (remainingColumns.length > 0 || otherColumns.length > 0) && (
                  <div className="p-3 bg-muted/20 border-t border-border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {[...remainingColumns, ...otherColumns].map((col) => {
                        const cellKey = col.type === 'multi-values' 
                          ? col.key.split('.')[0] 
                          : col.key;
                        const cellValue = getNestedValue(row, cellKey);
                        return (
                          <div key={col.key} className="space-y-0.5">
                            <div className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">
                              {col.label}
                            </div>
                            <div className="text-foreground text-xs">
                              {renderCellValue(col, cellValue, row)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // If in card mode, render cards instead of table
  if (isCardMode) {
    return (
      <div ref={containerRef} className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        {renderCardView()}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      <div ref={scrollContainerRef} className="overflow-x-auto">
        <table ref={tableRef} className="w-full divide-y divide-border/50">
          <thead className="bg-muted/70 dark:bg-muted-dark/70 sticky top-0 z-30 border-b border-border">
            <tr>
              {/* Expand/Collapse column */}
              {enableExpand && (
                <th className="sticky left-0 z-30 bg-muted/70 dark:bg-muted-dark/70 w-12 px-3 py-3 border-r border-border"></th>
              )}
              
              {/* Row # */}
              <th 
                className={`sticky ${enableExpand ? 'left-12' : 'left-0'} z-30 bg-muted/70 dark:bg-muted-dark/70 px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border ${getStickyClass(enableExpand ? 1 : 0, true)}`}
                style={getStickyStyle(enableExpand ? 1 : 0)}
              >
                #
              </th>
              
              {/* Data columns */}
              {dataColumns.map((column, colIndex) => {
                // Employee ID is the first data column (index 0), make it sticky
                const isSticky = colIndex === 0;
                const isSortable = onSort && !column.isAction && column.key !== 'status';
                const isCurrentSort = sortBy === column.key;
                const canSort = isSortable && !column.type?.includes('multi-values');
                const stickyIndex = enableExpand ? 2 : 1; // Index 2 when expand enabled, index 1 when disabled
                
                return (
                  <th
                    key={`header-${column.key}`}
                    className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider ${
                      isSticky ? getStickyClass(stickyIndex, true) : ''
                    } ${column.className || ''} ${canSort ? 'cursor-pointer hover:bg-muted select-none transition-colors' : ''}`}
                    style={isSticky ? getStickyStyle(stickyIndex) : {}}
                    onClick={canSort ? () => onSort(column.key) : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      {canSort && (
                        <span className="text-muted-foreground">
                          {isCurrentSort ? (
                            sortOrder === 'asc' ? '↑' : '↓'
                          ) : (
                            <span className="opacity-30">⇅</span>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
              
              {/* Actions column - sticky right */}
              {actionColumn && (
                <th className="sticky right-0 z-30 bg-muted/70 dark:bg-muted-dark/70 px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border shadow-[-2px_0_4px_rgba(0,0,0,0.05)] dark:shadow-[-2px_0_4px_rgba(0,0,0,0.3)]">
                  {actionColumn.label}
                </th>
              )}
            </tr>
          </thead>

          <tbody className="bg-card divide-y divide-border/50">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="hover:bg-muted/30">
                  <td className="sticky left-0 z-10 bg-card w-12 px-3 py-4 border-r border-border"></td>
                  <td className="sticky left-12 z-10 bg-card px-4 py-4 border-r border-border">
                    <div className="h-4 w-8 bg-muted rounded animate-pulse"></div>
                  </td>
                  {dataColumns.map((col) => (
                    <td key={`skeleton-${idx}-${col.key}`} className="px-4 py-4">
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                    </td>
                  ))}
                  {actionColumn && (
                    <td className="sticky right-0 z-10 bg-card px-4 py-4 border-l border-border">
                      <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
                    </td>
                  )}
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((row, rowIndex) => {
                const isExpanded = isRowExpanded(row.id);
                const rowNumber = from + rowIndex;
                const rowKey = `row-${row.id || rowIndex}`;
                
                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      key={rowKey}
                      className={`bg-card hover:bg-muted/30 even:bg-muted/10 transition-colors duration-150 ${enableExpand ? 'cursor-pointer' : ''}`}
                      onClick={enableExpand ? () => onRowExpand?.(row) : undefined}
                    >
                      {/* Expand/Collapse icon */}
                      {enableExpand && (
                        <td className="sticky left-0 z-10 bg-card w-12 px-3 py-4 border-r border-border">
                          <div className="flex items-center justify-center">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </td>
                      )}
                      
                      {/* Row # */}
                      <td 
                        className={`sticky ${enableExpand ? 'left-12' : 'left-0'} z-10 bg-card px-4 py-4 text-sm text-muted-foreground border-r border-border ${getStickyClass(enableExpand ? 1 : 0)}`}
                        style={getStickyStyle(enableExpand ? 1 : 0)}
                      >
                        {rowNumber}
                      </td>
                      
                      {/* Data cells */}
                      {dataColumns.map((col, colIndex) => {
                        const cellKey = col.type === 'multi-values' 
                          ? col.key.split('.')[0] 
                          : col.key;
                        const cellValue = getNestedValue(row, cellKey);
                        const isSticky = colIndex === 0; // Employee ID
                        const stickyIndex = enableExpand ? 2 : 1; // Index 2 when expand enabled, index 1 when disabled
                        
                        return (
                          <td
                            key={`cell-${col.key}-${row.id || rowIndex}`}
                            className={`px-4 py-4 ${isSticky ? getStickyClass(stickyIndex) : ''} ${col.className || ''}`}
                            style={isSticky ? getStickyStyle(stickyIndex) : {}}
                            onClick={(e) => {
                              // Don't expand when clicking on action buttons
                              if (col.isAction) {
                                e.stopPropagation();
                              }
                            }}
                          >
                            {renderCellValue(col, cellValue, row)}
                          </td>
                        );
                      })}
                      
                      {/* Actions cell - sticky right */}
                      {actionColumn && (
                        <td 
                          className="sticky right-0 z-10 bg-card px-4 py-4 border-l border-border"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {renderActionButtons(row)}
                        </td>
                      )}
                    </tr>
                    
                    {/* Expanded row detail */}
                    {isExpanded && enableExpand && (
                      <tr key={`expanded-${row.id || rowIndex}`} className="bg-muted/20">
                        <td colSpan={columns.length + (enableExpand ? 2 : 1)} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                            {dataColumns
                              .filter(col => !col.isAction && col.key !== 'id')
                              .slice(0, 12)
                              .map((col) => {
                                const cellKey = col.type === 'multi-values' 
                                  ? col.key.split('.')[0] 
                                  : col.key;
                                const cellValue = getNestedValue(row, cellKey);
                                
                                return (
                                  <div key={col.key} className="space-y-1">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      {col.label}
                                    </div>
                                    <div className="text-sm text-foreground">
                                      {renderCellValue(col, cellValue, row)}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length + 2} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-muted-foreground mb-2">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-foreground">No employees found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
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

