import { Link, usePage } from '@inertiajs/react';
import * as LucidIcons from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { hasPermission } from '@/utils/authorization';

// Helper function with null/undefined protection
const getNestedValue = (obj: any, path: string): any => {
  if (!obj) return '';
  
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) return '';
    return acc[key] !== undefined ? acc[key] : '';
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
}

interface ActionConfig {
    label: string;
    icon: keyof typeof LucidIcons;
    route: string;
    className: string;
    permission?: string;
    confirm?: {
        title: string;
        message: string;
    };
}

interface TableRow {
    [key: string]: any;
}

interface CustomTableProps {
    columns: TableColumn[];
    actions: ActionConfig[];
    data: TableRow[];
    from: number;
    onDelete?: (route: string) => void;
    onView?: (row: TableRow) => void;
    onEdit?: (row: TableRow) => void;
    isModal?: boolean;
}

export const CustomTable = ({ columns, actions, data, from, onDelete, onView, onEdit, isModal }: CustomTableProps) => {
    const { auth } = usePage().props as any;
    const permissions = auth.permissions;

    const renderActionButtons = (row: TableRow) => {
        return (
            <div className="flex justify-center">
                {actions.map((action, index) => {
                    if (action.permission && !hasPermission(permissions, action.permission)) {
                        return null;
                    }

                    const IconComponent = LucidIcons[action.icon] as React.ElementType;

                    if (isModal) {
                        if (action.label === 'View') {
                            return (
                                <Button key={index} className={action.className} onClick={() => onView?.(row)}>
                                    <IconComponent size={18} />
                                </Button>
                            );
                        }

                        if (action.label === 'Edit') {
                            return (
                                <Button key={index} className={action.className} onClick={() => onEdit?.(row)}>
                                    <IconComponent size={18} />
                                </Button>
                            );
                        }
                    }

                    if (action.label === 'Delete') {
                        return (
                            <Button 
                                key={index} 
                                className={action.className} 
                                onClick={() => {
                                    if (action.confirm) {
                                        if (confirm(action.confirm.message)) {
                                            onDelete?.(route(action.route, row.id));
                                        }
                                    } else {
                                        onDelete?.(route(action.route, row.id));
                                    }
                                }}
                            >
                                <IconComponent size={18} />
                            </Button>
                        );
                    }

                    return (
                        <Link key={index} as="button" href={route(action.route, row.id)} className={action.className}>
                            <IconComponent size={18} />
                        </Link>
                    );
                })}
            </div>
        );
    };

    const renderCellValue = (col: TableColumn, cellValue: any, row: TableRow) => {
        // Handle null/undefined values
        if (cellValue === null || cellValue === undefined) {
            return col.defaultValue || '-';
        }

        if (col.isImage) {
            return (
                <div>
                    <img 
                        src={cellValue || ''} 
                        alt={row.name || 'Image'} 
                        className="h-16 w-20 rounded-lg object-cover" 
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                </div>
            );
        }

        if (col.isAction) {
            return renderActionButtons(row);
        }

        if (col.type === 'multi-values') {
            // Ensure we have an array to work with
            const itemsArray = Array.isArray(cellValue) ? cellValue : [];
            
            if (itemsArray.length === 0) {
                return col.defaultValue || '-';
            }

            return (
                <div className="flex flex-wrap items-center justify-center gap-1">
                    {itemsArray.map((item: any) => {
                        if (!item) return null;
                        
                        const displayValue = col.displayKey 
                            ? (item[col.displayKey] || '-')
                            : item.name || item.label || '-';
                            
                        return (
                            <Badge 
                                className='bg-primary/20 text-black border border-primary/30 dark:bg-primary/30 dark:text-black px-3 py-0.5' 
                                key={item.id || Math.random()}
                            >
                                {displayValue}
                            </Badge>
                        );
                    })}
                </div>
            );
        }

        return cellValue || col.defaultValue || '-';
    };

    return (
        <div className="rounded-lg border bg-white shadow-sm w-full">
            <table className="w-full table-auto">
                <thead>
                    <tr className="bg-gray-700 text-white">
                        <th className="sticky top-0 z-30 border p-4 bg-gray-700">#</th>
                        {columns.map((column) => (
                            <th key={column.key} className={`sticky top-0 z-30 bg-gray-700 ${column.className}`}>
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>

                    <tbody>
                    {data.length > 0 ? (
                        data.map((row, index) => (
                            <tr key={index}>
                                <td className="border px-4 py-2 text-center">{from + index}</td>
                                {columns.map((col) => {
                                    const cellValue = getNestedValue(row, col.key);
                                    return (
                                        <td 
                                            key={`${col.key}-${index}`} 
                                            className={`border px-4 py-2 text-center ${col.className}`}
                                        >
                                            {renderCellValue(col, cellValue, row)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length + 1} className="text-md py-4 text-center font-bold text-red-600">
                                No Data Found!
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};