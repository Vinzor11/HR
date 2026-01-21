import { EnterpriseEmployeeTable } from '@/components/EnterpriseEmployeeTable';
import { EmployeeDetailDrawer } from '@/components/EmployeeDetailDrawer';
import { AdvancedFilterPanel, type FilterCondition } from '@/components/AdvancedFilterPanel';
import { CustomToast, toast } from '@/components/custom-toast';
import { EmployeeTableConfig } from '@/config/tables/employee-table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Logs,
  UserPlus,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Columns3,
  LayoutGrid,
  Table2,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { debounce } from 'lodash';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Manage Employees', href: '/employees' }];

interface PaginationLink {
  active: boolean;
  label: string;
  url: string | null;
}

interface Department {
  id: number;
  faculty_name?: string;
  name?: string;
}

interface Position {
  id: number;
  pos_name?: string;
  name?: string;
}

interface Employee {
  id: string;
  surname: string;
  first_name: string;
  middle_name?: string;
  name_extension?: string;
  status: string;
  employment_status?: string;
  employee_type: string;
  date_hired?: string;
  date_regularized?: string;
  department: Department | null;
  position: Position | null;
  mobile_no?: string;
  email_address?: string;
  birth_date?: string;
  birth_place?: string;
  sex?: string;
  civil_status?: string;
  [key: string]: any;
}

interface EmployeeData {
  data: Employee[];
  links: PaginationLink[];
  meta?: {
    current_page: number;
    from: number;
    to: number;
    total: number;
    last_page: number;
    per_page: number;
    path: string;
  };
}

interface TableColumn {
  key: string;
  label: string;
  visible: boolean;
  alwaysVisible?: boolean;
}

const MAX_VISIBLE_COLUMNS = 100;
const PER_PAGE_OPTIONS = ['5', '10', '25', '50', '100'] as const;
const LOCAL_STORAGE_KEY = 'employeeTableVisibleColumns';

// Minimal core columns - shown by default
const CORE_COLUMNS = [
  'id',
  'surname',
  'first_name',
  'position.pos_name',
  'department.faculty_name',
  'status',
  'employment_status',
  'employee_type',
  'date_hired',
  'mobile_no',
  'email_address',
];

// Column group labels
const COLUMN_GROUP_LABELS: Record<string, string> = {
  identification: 'Identification',
  employment: 'Employment Details',
  contact: 'Contact Information',
  personal: 'Personal Details',
};

export default function Index() {
  const { employees, filters, flash, departments = [], positions = [], auth, filter_fields_config } = usePage<{
    employees: EmployeeData;
    filters?: {
      search?: string;
      per_page?: number;
      status?: string;
      department_id?: string;
      department_ids?: string[];
      position_id?: string;
      position_ids?: string[];
      employee_type?: string;
      show_deleted?: boolean;
      sort_by?: string;
      sort_order?: string;
      advanced_filters?: FilterCondition[];
    };
    flash?: { success?: string; error?: string };
    departments?: Department[];
    positions?: Position[];
    auth?: { permissions?: string[] };
    filter_fields_config?: Record<string, Record<string, { type: string; label: string; options?: string[] }>>;
  }>().props;
  
  const permissions = auth?.permissions || [];

  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>(() => {
    // Always start with empty array, don't load from filters prop
    // This ensures we don't accidentally restore filters from URL
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('employees_advanced_filters');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [searchTerm, setSearchTerm] = useState(filters?.search || '');
  const [searchMode, setSearchMode] = useState<'any' | 'id' | 'name' | 'position' | 'department'>('any');
  const [sortBy, setSortBy] = useState(filters?.sort_by || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((filters?.sort_order as 'asc' | 'desc') || 'asc');
  // Load filters from localStorage or use defaults
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('employees_filter_status');
      if (saved) return saved;
    }
    return filters?.status || '';
  });
  const [departmentFilter, setDepartmentFilter] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('employees_filter_department');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed) ? parsed : (parsed ? [String(parsed)] : []);
        } catch {
          return saved ? [saved] : [];
        }
      }
    }
    // Handle both old single value and new array format from backend
    if (filters?.department_ids && Array.isArray(filters.department_ids)) {
      return filters.department_ids.map(String);
    }
    return filters?.department_id ? [String(filters.department_id)] : [];
  });
  const [positionFilter, setPositionFilter] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('employees_filter_position');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed) ? parsed : (parsed ? [String(parsed)] : []);
        } catch {
          return saved ? [saved] : [];
        }
      }
    }
    // Handle both old single value and new array format from backend
    if (filters?.position_ids && Array.isArray(filters.position_ids)) {
      return filters.position_ids.map(String);
    }
    return filters?.position_id ? [String(filters.position_id)] : [];
  });
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('employees_filter_employee_type');
      if (saved) return saved;
    }
    return filters?.employee_type || '';
  });
  const [showDeleted, setShowDeleted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('employees_filter_show_deleted');
      if (saved === 'true') return true;
      if (saved === 'false') return false;
    }
    return filters?.show_deleted || false;
  });
  const [perPage, setPerPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('employees_perPage');
      if (saved && ['5', '10', '25', '50', '100'].includes(saved)) {
        return saved;
      }
    }
    return String(filters?.per_page ?? 10);
  });
  const [dataVersion, setDataVersion] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [columnSearchTerm, setColumnSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'card'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('employeeTableViewMode');
      return (saved as 'auto' | 'table' | 'card') || 'auto';
    }
    return 'auto';
  });

  const allColumns = EmployeeTableConfig.columns;

  // Load visible columns from localStorage, default to core columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const savedColumns = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedColumns) {
        try {
          return JSON.parse(savedColumns);
        } catch {
          // Invalid JSON, use core columns
        }
      }
    }
    // Default to core columns + actions
    return [...CORE_COLUMNS, 'actions'];
  });

  // Save visible columns to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  // Save view mode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('employeeTableViewMode', viewMode);
    }
  }, [viewMode]);

  // Sync localStorage perPage with backend on mount
  const hasSyncedPerPageRef = useRef(false);
  useEffect(() => {
    if (hasSyncedPerPageRef.current) return;
    hasSyncedPerPageRef.current = true;
    
    const savedPerPage = typeof window !== 'undefined' ? localStorage.getItem('employees_perPage') : null;
    const currentPerPage = String(filters?.per_page ?? 10);
    
    // If localStorage has a different perPage than what backend sent, sync it
    if (savedPerPage && savedPerPage !== currentPerPage && ['5', '10', '25', '50', '100'].includes(savedPerPage)) {
      triggerFetch({ per_page: parseInt(savedPerPage, 10) });
    }
  }, []); // Only run on mount

  // Create a mapping of group to its columns
  const groupToColumns = useMemo(() => {
    return EmployeeTableConfig.columns.reduce(
      (acc, col) => {
        if (col.group && col.group !== 'actions') {
          if (!acc[col.group]) {
            acc[col.group] = [];
          }
          acc[col.group].push(col.key);
        }
        return acc;
      },
      {} as Record<string, string[]>
    );
  }, []);

  // Extract unique groups from the columns
  const columnGroups = useMemo(() => {
    return Array.from(
      new Set(EmployeeTableConfig.columns.map((col) => col.group))
    ).filter((group): group is string => !!group && group !== 'actions');
  }, []);

  // Filter columns by search term
  const filteredColumnGroups = useMemo(() => {
    if (!columnSearchTerm) return columnGroups;
    const searchLower = columnSearchTerm.toLowerCase();
    return columnGroups.filter((group) => {
      const groupLabel = COLUMN_GROUP_LABELS[group] || group;
      if (groupLabel.toLowerCase().includes(searchLower)) return true;
      return EmployeeTableConfig.columns.some(
        (col) =>
          col.group === group &&
          (col.label.toLowerCase().includes(searchLower) ||
            col.key.toLowerCase().includes(searchLower))
      );
    });
  }, [columnGroups, columnSearchTerm]);

  // Normalize employees data
  const normalizedEmployees = useMemo(() => {
    return (
      employees?.data?.map((employee) => ({
        ...employee,
        department: employee.department || null,
        position: employee.position || null,
      })) || []
    );
  }, [employees?.data]);

  // Filter columns based on visibility
  const filteredColumns = useMemo(() => {
    return allColumns.filter(
      (col) => visibleColumns.includes(col.key) || col.alwaysVisible
    );
  }, [visibleColumns, allColumns]);

  // Flash messages
  useEffect(() => {
    if (flash?.success) toast.success(flash.success);
    if (flash?.error) toast.error(flash.error);
  }, [flash]);

  // Trigger fetch with all filters
  const triggerFetch = useCallback(
    (params: {
      page?: number;
      search?: string;
      search_mode?: string;
      status?: string;
      department_id?: string;
      position_id?: string;
      employee_type?: string;
      per_page?: number;
      sort_by?: string;
      sort_order?: string;
      need_dropdowns?: boolean;
      show_deleted?: boolean;
    } = {}) => {
      setIsLoading(true);
      const queryParams: any = {
        page: params.page || employees?.meta?.current_page || 1,
        per_page: params.per_page || parseInt(perPage, 10),
        search: params.search !== undefined ? params.search : searchTerm,
        search_mode: params.search_mode !== undefined ? params.search_mode : searchMode,
        status: params.status !== undefined ? params.status : statusFilter,
        department_ids: params.department_ids !== undefined ? params.department_ids : (Array.isArray(departmentFilter) ? departmentFilter : (departmentFilter ? [departmentFilter] : [])),
        position_ids: params.position_ids !== undefined ? params.position_ids : (Array.isArray(positionFilter) ? positionFilter : (positionFilter ? [positionFilter] : [])),
        // Keep backward compatibility
        department_id: params.department_id !== undefined ? params.department_id : (Array.isArray(departmentFilter) && departmentFilter.length === 1 ? departmentFilter[0] : ''),
        position_id: params.position_id !== undefined ? params.position_id : (Array.isArray(positionFilter) && positionFilter.length === 1 ? positionFilter[0] : ''),
        employee_type: params.employee_type !== undefined ? params.employee_type : employeeTypeFilter,
        show_deleted: params.show_deleted !== undefined ? params.show_deleted : showDeleted,
        sort_by: params.sort_by || filters?.sort_by || 'created_at',
        sort_order: params.sort_order || filters?.sort_order || 'asc',
        visible_columns: JSON.stringify(visibleColumns),
      };

      // Only add advanced_filters if there are valid filters
      // Filter out incomplete filters (no field selected or no value)
      const validFilters = (advancedFilters || []).filter(f => {
        if (!f || !f.field) return false;
        if (['is_null', 'is_not_null'].includes(f.operator)) return true;
        if (f.value === null || f.value === '') return false;
        if (Array.isArray(f.value) && f.value.length === 0) return false;
        return true;
      });
      
      // CRITICAL: Only add advanced_filters if we have valid filters
      // If empty, explicitly DO NOT include it in queryParams
      if (validFilters.length > 0) {
        queryParams.advanced_filters = JSON.stringify(validFilters);
      }

      // Request dropdowns if filters are active
      if (statusFilter || (departmentFilter && departmentFilter.length > 0) || (positionFilter && positionFilter.length > 0) || employeeTypeFilter || params.need_dropdowns) {
        queryParams.need_dropdowns = true;
      }

      // Remove empty filters
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === '' || queryParams[key] === null || queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });

      router.get(
        route('employees.index'),
        queryParams,
        {
          preserveState: true,
          preserveScroll: false,
          replace: true,
          onFinish: () => setIsLoading(false),
        }
      );
    },
    [searchTerm, statusFilter, departmentFilter, positionFilter, employeeTypeFilter, showDeleted, perPage, visibleColumns, searchMode, employees?.meta?.current_page, advancedFilters]
  );

  // Debounced search
  const handleSearch = useCallback(
    debounce((term: string) => {
      triggerFetch({ search: term, search_mode: searchMode, page: 1 });
    }, 500),
    [triggerFetch, searchMode]
  );

  // Handle page change
  const handlePageChange = (page: number) => {
    setDataVersion((prev) => prev + 1);
    triggerFetch({ page });
  };

  // Handle per page change
  const handlePerPageChange = (value: string) => {
    setPerPage(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('employees_perPage', value);
    }
    setDataVersion((prev) => prev + 1);
    triggerFetch({ per_page: parseInt(value, 10), page: 1 });
  };

  // Toggle column visibility
  const toggleColumn = (key: string) => {
    if (allColumns.find((col) => col.key === key)?.alwaysVisible) return;
    setVisibleColumns((prev) => {
      if (prev.includes(key)) {
        return prev.filter((colKey) => colKey !== key);
      } else {
        if (prev.length >= MAX_VISIBLE_COLUMNS) {
          toast.error(`You can only show up to ${MAX_VISIBLE_COLUMNS} columns at once`);
          return prev;
        }
        const newColumns = [...prev, key];
        // Trigger fetch with new columns
        setTimeout(() => {
          triggerFetch({});
        }, 0);
        return newColumns;
      }
    });
  };

  // Toggle group columns
  const toggleGroupColumns = (group: string) => {
    const groupColumns = groupToColumns[group] || [];
    const allVisible =
      groupColumns.length > 0 &&
      groupColumns.every((col) => visibleColumns.includes(col));

    if (allVisible) {
      setVisibleColumns((prev) => prev.filter((col) => !groupColumns.includes(col)));
    } else {
      setVisibleColumns((prev) => {
        const newColumns = [...prev];
        groupColumns.forEach((col) => {
          if (
            !newColumns.includes(col) &&
            !allColumns.find((c) => c.key === col)?.alwaysVisible
          ) {
            if (newColumns.length >= MAX_VISIBLE_COLUMNS) {
              toast.error(`You can only show up to ${MAX_VISIBLE_COLUMNS} columns at once`);
              return prev;
            }
            newColumns.push(col);
          }
        });
        return newColumns;
      });
    }
  };

  // Reset to default columns (core columns)
  const resetToDefaultColumns = () => {
    setVisibleColumns([...CORE_COLUMNS, 'actions']);
    toast.success('Columns reset to default');
  };


  // Handle view employee
  const handleViewEmployee = (row: any) => {
    setSelectedEmployee(row as Employee);
    setDrawerOpen(true);
  };

  // Handle edit employee
  const handleEditEmployee = (row: any) => {
    router.visit(route('employees.edit', row.id));
  };

  // Handle delete
  const handleDelete = useCallback(
    (routePath: string) => {
      router.delete(routePath, {
        preserveScroll: true,
        onSuccess: () => {
          triggerFetch({});
        },
        onError: () => toast.error('Failed to delete employee'),
      });
    },
    [triggerFetch]
  );

  // Handle restore
  const handleRestore = useCallback(
    (id: string | number) => {
      router.post(route('employees.restore', id), {}, {
        preserveScroll: true,
        onSuccess: () => {
          triggerFetch({});
        },
        onError: () => toast.error('Failed to restore employee'),
      });
    },
    [triggerFetch]
  );

  // Handle force delete
  const handleForceDelete = useCallback(
    (id: string | number) => {
      router.delete(route('employees.force-delete', id), {
        preserveScroll: true,
        onSuccess: () => {
          // Flash message will be handled by useEffect watching flash prop
          triggerFetch({});
        },
        onError: () => toast.error('Failed to permanently delete employee'),
      });
    },
    [triggerFetch]
  );

  // Export to CSV function
  const exportToCSV = useCallback(() => {
    const headers = filteredColumns
      .filter(col => !col.isAction)
      .map(col => col.label);
    
    const rows = normalizedEmployees.map(employee => 
      filteredColumns
        .filter(col => !col.isAction)
        .map(col => {
          const colAny = col as any;
          const cellKey = colAny.type === 'multi-values' 
            ? col.key.split('.')[0] 
            : col.key;
          const value = getNestedValue(employee, cellKey);
          
          if (col.key === 'status') return value || '-';
          
          if (colAny.type === 'multi-values') {
            const items = Array.isArray((employee as any)[cellKey]) ? (employee as any)[cellKey] : [];
            return items.map((item: any) => {
              const prop = colAny.displayKey || col.key.split('.')[1];
              return getNestedValue(item, prop) || '-';
            }).join('; ');
          }
          
          // Handle nested values (e.g., department.faculty_name)
          if (cellKey.includes('.')) {
            return value || '-';
          }
          
          return value || '-';
        })
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `employees_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Data exported to CSV');
  }, [filteredColumns, normalizedEmployees]);

  // Helper function for nested values
  const getNestedValue = (obj: any, path: string): any => {
    if (!obj || typeof obj !== 'object') return null;
    return path.split('.').reduce((acc, key) => {
      if (acc === null || acc === undefined || typeof acc !== 'object') return null;
      return acc[key] !== undefined ? acc[key] : null;
    }, obj);
  };

  // Helper functions to update filters and save to localStorage
  const updateStatusFilter = (value: string) => {
    setStatusFilter(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('employees_filter_status', value);
    }
  };

  const updateDepartmentFilter = (value: string[]) => {
    setDepartmentFilter(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('employees_filter_department', JSON.stringify(value));
    }
  };

  const updatePositionFilter = (value: string[]) => {
    setPositionFilter(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('employees_filter_position', JSON.stringify(value));
    }
  };

  const toggleDepartmentFilter = (deptId: string) => {
    const current = departmentFilter || [];
    const updated = current.includes(deptId)
      ? current.filter(id => id !== deptId)
      : [...current, deptId];
    updateDepartmentFilter(updated);
  };

  const togglePositionFilter = (posId: string) => {
    const current = positionFilter || [];
    const updated = current.includes(posId)
      ? current.filter(id => id !== posId)
      : [...current, posId];
    updatePositionFilter(updated);
  };

  const updateEmployeeTypeFilter = (value: string) => {
    setEmployeeTypeFilter(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('employees_filter_employee_type', value);
    }
  };

  const updateShowDeleted = (value: boolean) => {
    setShowDeleted(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('employees_filter_show_deleted', String(value));
    }
  };

  // Clear all filters
  const clearFilters = () => {
    updateStatusFilter('');
    updateDepartmentFilter([]);
    updatePositionFilter([]);
    updateEmployeeTypeFilter('');
    updateShowDeleted(false);
    setAdvancedFilters([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('employees_advanced_filters');
    }
    triggerFetch({
      status: '',
      department_ids: [],
      position_ids: [],
      employee_type: '',
      show_deleted: false,
      page: 1,
    });
  };

  // Handle advanced filters
  const handleAdvancedFiltersChange = (filters: FilterCondition[]) => {
    setAdvancedFilters(filters);
    if (typeof window !== 'undefined') {
      localStorage.setItem('employees_advanced_filters', JSON.stringify(filters));
    }
  };

  const handleApplyAdvancedFilters = useCallback((updatedFilters?: FilterCondition[]) => {
    // If updatedFilters is provided, use those; otherwise use current state
    const filtersToApply = updatedFilters !== undefined ? updatedFilters : advancedFilters;
    
    // Update state if different filters were passed
    if (updatedFilters !== undefined) {
      setAdvancedFilters(filtersToApply);
      if (typeof window !== 'undefined') {
        if (filtersToApply.length > 0) {
          localStorage.setItem('employees_advanced_filters', JSON.stringify(filtersToApply));
        } else {
          localStorage.removeItem('employees_advanced_filters');
        }
      }
    }
    
    setAdvancedFilterOpen(false);
    
    // Build query params with the filters to apply
    setIsLoading(true);
    const queryParams: any = {
      page: 1,
      per_page: parseInt(perPage, 10),
      search: searchTerm || '',
      search_mode: searchMode,
      status: statusFilter || '',
      employee_type: employeeTypeFilter || '',
      show_deleted: showDeleted,
      sort_by: sortBy,
      sort_order: sortOrder,
      visible_columns: JSON.stringify(visibleColumns),
    };
    
    // Add department/position filters if they exist
    if (Array.isArray(departmentFilter) && departmentFilter.length > 0) {
      queryParams.department_ids = departmentFilter;
    }
    if (Array.isArray(positionFilter) && positionFilter.length > 0) {
      queryParams.position_ids = positionFilter;
    }
    
    // Only add advanced_filters if there are valid filters
    const validFilters = (filtersToApply || []).filter(f => {
      if (!f || !f.field) return false;
      if (['is_null', 'is_not_null'].includes(f.operator)) return true;
      if (f.value === null || f.value === '') return false;
      if (Array.isArray(f.value) && f.value.length === 0) return false;
      return true;
    });
    
    if (validFilters.length > 0) {
      queryParams.advanced_filters = JSON.stringify(validFilters);
    }
    
    // Remove empty values
    Object.keys(queryParams).forEach((key) => {
      if (queryParams[key] === '' || queryParams[key] === null || queryParams[key] === undefined || 
          (Array.isArray(queryParams[key]) && queryParams[key].length === 0)) {
        delete queryParams[key];
      }
    });
    
    // Explicitly ensure advanced_filters is not included if empty
    if (validFilters.length === 0) {
      delete queryParams.advanced_filters;
    }
    
    router.get(
      route('employees.index'),
      queryParams,
      {
        preserveState: false,
        preserveScroll: false,
        replace: true,
        onFinish: () => setIsLoading(false),
      }
    );
  }, [advancedFilters, perPage, searchTerm, searchMode, statusFilter, departmentFilter, positionFilter, employeeTypeFilter, showDeleted, sortBy, sortOrder, visibleColumns]);

  const handleClearAdvancedFilters = useCallback(() => {
    // Clear filters in state FIRST
    setAdvancedFilters([]);
    // Clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('employees_advanced_filters');
    }
    
    // Build clean query params WITHOUT advanced_filters
    setIsLoading(true);
    const cleanQueryParams: any = {
      page: 1,
      per_page: parseInt(perPage, 10),
      search: searchTerm || '',
      search_mode: searchMode,
      status: statusFilter || '',
      employee_type: employeeTypeFilter || '',
      show_deleted: showDeleted,
      sort_by: sortBy,
      sort_order: sortOrder,
      visible_columns: JSON.stringify(visibleColumns),
    };
    
    // Add department/position filters if they exist
    if (Array.isArray(departmentFilter) && departmentFilter.length > 0) {
      cleanQueryParams.department_ids = departmentFilter;
    }
    if (Array.isArray(positionFilter) && positionFilter.length > 0) {
      cleanQueryParams.position_ids = positionFilter;
    }
    
    // Remove empty values
    Object.keys(cleanQueryParams).forEach((key) => {
      if (cleanQueryParams[key] === '' || cleanQueryParams[key] === null || cleanQueryParams[key] === undefined || 
          (Array.isArray(cleanQueryParams[key]) && cleanQueryParams[key].length === 0)) {
        delete cleanQueryParams[key];
      }
    });
    
    // CRITICAL: Do NOT include advanced_filters at all
    // This ensures the backend doesn't process any filters
    
    router.get(
      route('employees.index'),
      cleanQueryParams,
      {
        preserveState: false, // Don't preserve state to get fresh data
        preserveScroll: false,
        replace: true, // Replace URL to remove advanced_filters from query string
        onFinish: () => setIsLoading(false),
      }
    );
  }, [perPage, searchTerm, searchMode, statusFilter, departmentFilter, positionFilter, employeeTypeFilter, showDeleted, sortBy, sortOrder, visibleColumns]);

  const removeAdvancedFilter = useCallback((filterId: string) => {
    // Filter out the removed filter
    const updated = advancedFilters.filter((f) => f.id !== filterId);
    
    // Update state
    setAdvancedFilters(updated);
    
    // Update localStorage
    if (typeof window !== 'undefined') {
      if (updated.length > 0) {
        localStorage.setItem('employees_advanced_filters', JSON.stringify(updated));
      } else {
        localStorage.removeItem('employees_advanced_filters');
      }
    }
    
    // Trigger fetch with updated filters
    setIsLoading(true);
    const queryParams: any = {
      page: 1,
      per_page: parseInt(perPage, 10),
      search: searchTerm || '',
      search_mode: searchMode,
      status: statusFilter || '',
      employee_type: employeeTypeFilter || '',
      show_deleted: showDeleted,
      sort_by: sortBy,
      sort_order: sortOrder,
      visible_columns: JSON.stringify(visibleColumns),
    };
    
    // Add department/position filters if they exist
    if (Array.isArray(departmentFilter) && departmentFilter.length > 0) {
      queryParams.department_ids = departmentFilter;
    }
    if (Array.isArray(positionFilter) && positionFilter.length > 0) {
      queryParams.position_ids = positionFilter;
    }
    
    // Only add advanced_filters if there are valid filters remaining
    const validFilters = updated.filter(f => {
      if (!f || !f.field) return false;
      if (['is_null', 'is_not_null'].includes(f.operator)) return true;
      if (f.value === null || f.value === '') return false;
      if (Array.isArray(f.value) && f.value.length === 0) return false;
      return true;
    });
    
    if (validFilters.length > 0) {
      queryParams.advanced_filters = JSON.stringify(validFilters);
    }
    
    // Remove empty values
    Object.keys(queryParams).forEach((key) => {
      if (queryParams[key] === '' || queryParams[key] === null || queryParams[key] === undefined || 
          (Array.isArray(queryParams[key]) && queryParams[key].length === 0)) {
        delete queryParams[key];
      }
    });
    
    // Explicitly ensure advanced_filters is not included if empty
    if (validFilters.length === 0) {
      delete queryParams.advanced_filters;
    }
    
    router.get(
      route('employees.index'),
      queryParams,
      {
        preserveState: false,
        preserveScroll: false,
        replace: true,
        onFinish: () => setIsLoading(false),
      }
    );
  }, [advancedFilters, perPage, searchTerm, searchMode, statusFilter, departmentFilter, positionFilter, employeeTypeFilter, showDeleted, sortBy, sortOrder, visibleColumns]);

  // Remove individual filters
  const removeStatusFilter = () => {
    updateStatusFilter('');
    triggerFetch({ status: '', page: 1 });
  };

  const removeDepartmentFilter = () => {
    updateDepartmentFilter([]);
    triggerFetch({ department_ids: [], page: 1 });
  };

  const removePositionFilter = () => {
    updatePositionFilter([]);
    triggerFetch({ position_ids: [], page: 1 });
  };

  const removeEmployeeTypeFilter = () => {
    updateEmployeeTypeFilter('');
    triggerFetch({ employee_type: '', page: 1 });
  };

  // Get filter field label helper
  const getFilterFieldLabel = (fieldKey: string): string => {
    if (!filter_fields_config) return fieldKey;
    for (const group of Object.values(filter_fields_config)) {
      if (group && typeof group === 'object' && fieldKey in group) {
        const field = group[fieldKey];
        if (field && typeof field === 'object' && 'label' in field) {
          return String(field.label);
        }
      }
    }
    return fieldKey;
  };

  // Get operator label helper
  const getOperatorLabel = (operator: string): string => {
    const operatorMap: Record<string, string> = {
      equals: '=',
      not_equals: '≠',
      contains: 'contains',
      not_contains: 'does not contain',
      starts_with: 'starts with',
      ends_with: 'ends with',
      greater_than: '>',
      greater_than_or_equal: '≥',
      less_than: '<',
      less_than_or_equal: '≤',
      in: 'is one of',
      not_in: 'is not one of',
      is_null: 'is empty',
      is_not_null: 'is not empty',
      between: 'between',
    };
    return operatorMap[operator] || operator;
  };

  // Format filter value for display
  const formatFilterValue = (filter: FilterCondition): string => {
    if (['is_null', 'is_not_null'].includes(filter.operator)) {
      return '';
    }
    if (Array.isArray(filter.value)) {
      return filter.value.join(', ');
    }
    return String(filter.value || '');
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    return (
      (statusFilter ? 1 : 0) +
      (departmentFilter && departmentFilter.length > 0 ? 1 : 0) +
      (positionFilter && positionFilter.length > 0 ? 1 : 0) +
      (employeeTypeFilter ? 1 : 0) +
      (showDeleted ? 1 : 0) +
      (advancedFilters && advancedFilters.length > 0 ? advancedFilters.filter(f => f.field).length : 0)
    );
  }, [statusFilter, departmentFilter, positionFilter, employeeTypeFilter, showDeleted, advancedFilters]);

  // Pagination data
  const currentPage = employees?.meta?.current_page || 1;
  const lastPage = employees?.meta?.last_page || 1;
  const from = employees?.meta?.from || 0;
  const to = employees?.meta?.to || 0;
  const total = employees?.meta?.total || 0;

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Employee Records" />
      <CustomToast />

      <div className="flex flex-col overflow-hidden bg-background" style={{ height: 'calc(100vh - 80px)' }}>
            {/* Top Section - Controls */}
            <div className="flex-shrink-0 bg-card border-b border-border shadow-sm z-40">
              <div className="px-3 md:px-6 py-2 md:py-3">
            {/* Mobile-first responsive layout */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search Section - Full width on mobile */}
              <div className="flex flex-col sm:flex-row gap-2 flex-1">
                {/* Smart Search Bar */}
                    <div className="relative flex-1 max-w-full lg:max-w-md">
                      <div className="flex items-center gap-2">
                        <Select 
                          value={searchMode} 
                          onValueChange={(value: any) => {
                            setSearchMode(value);
                            if (searchTerm) {
                              triggerFetch({ search: searchTerm, search_mode: value, page: 1 });
                            }
                          }}
                        >
                          <SelectTrigger className="w-[100px] sm:w-[140px] h-9 text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="id">Employee ID</SelectItem>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="position">Position</SelectItem>
                            <SelectItem value="department">Department</SelectItem>
                          </SelectContent>
                        </Select>
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder={`Search ${searchMode === 'any' ? 'employees...' : `by ${searchMode}...`}`}
                        className="pl-10 pr-4 py-2 h-9 text-sm border-border focus:border-primary focus:ring-primary rounded-lg"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          handleSearch(e.target.value);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Filters Button */}
                {filter_fields_config && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdvancedFilterOpen(true)}
                    className="gap-1.5 sm:gap-2 relative h-9 px-2 sm:px-3"
                  >
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Advanced Filters</span>
                    {advancedFilters && advancedFilters.filter(f => f.field).length > 0 && (
                      <Badge className="ml-0.5 sm:ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground text-xs">
                        {advancedFilters.filter(f => f.field).length}
                      </Badge>
                    )}
                  </Button>
                )}

                {/* Quick Filters Button */}
                <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2 relative h-9 px-2 sm:px-3">
                      <Filter className="h-4 w-4" />
                      <span className="hidden sm:inline">Quick Filters</span>
                      {(statusFilter || (departmentFilter && departmentFilter.length > 0) || (positionFilter && positionFilter.length > 0) || employeeTypeFilter) && (
                        <Badge className="ml-0.5 sm:ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground text-xs">
                          {(statusFilter ? 1 : 0) + (departmentFilter && departmentFilter.length > 0 ? 1 : 0) + (positionFilter && positionFilter.length > 0 ? 1 : 0) + (employeeTypeFilter ? 1 : 0)}
                        </Badge>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[85vh] overflow-y-auto mx-auto">
                    <DialogTitle className="text-lg font-semibold">Filter Employees</DialogTitle>
                    <DialogDescription>
                      Apply filters to narrow down your search results
                    </DialogDescription>

                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Status
                        </label>
                        <Select
                          value={statusFilter || 'all'}
                          onValueChange={(value) =>
                            updateStatusFilter(value === 'all' ? '' : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="on-leave">On Leave</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-foreground">
                            Department
                          </label>
                          {departmentFilter.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => updateDepartmentFilter([])}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <div className="border border-border rounded-lg p-3 max-h-[200px] overflow-y-auto">
                          <div className="space-y-2">
                            {departments.map((dept) => {
                              const isChecked = departmentFilter.includes(String(dept.id));
                              return (
                                <label
                                  key={dept.id}
                                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded"
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => toggleDepartmentFilter(String(dept.id))}
                                  />
                                  <span>{dept.faculty_name || dept.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        {departmentFilter.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {departmentFilter.length} department{departmentFilter.length !== 1 ? 's' : ''} selected
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-foreground">
                            Position
                          </label>
                          {positionFilter.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => updatePositionFilter([])}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        <div className="border border-border rounded-lg p-3 max-h-[200px] overflow-y-auto">
                          <div className="space-y-2">
                            {positions.map((pos) => {
                              const isChecked = positionFilter.includes(String(pos.id));
                              return (
                                <label
                                  key={pos.id}
                                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded"
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => togglePositionFilter(String(pos.id))}
                                  />
                                  <span>{pos.pos_name || pos.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        {positionFilter.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {positionFilter.length} position{positionFilter.length !== 1 ? 's' : ''} selected
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Employee Type
                        </label>
                        <Select
                          value={employeeTypeFilter || 'all'}
                          onValueChange={(value) =>
                            updateEmployeeTypeFilter(value === 'all' ? '' : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="Teaching">Teaching</SelectItem>
                            <SelectItem value="Non-Teaching">Non-Teaching</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-between gap-2 mt-6">
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                      <Button
                        onClick={() => {
                          // Save current filter values to localStorage
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('employees_filter_status', statusFilter);
                            localStorage.setItem('employees_filter_department', departmentFilter);
                            localStorage.setItem('employees_filter_position', positionFilter);
                            localStorage.setItem('employees_filter_employee_type', employeeTypeFilter);
                            localStorage.setItem('employees_filter_show_deleted', String(showDeleted));
                          }
                          triggerFetch({ page: 1 });
                          setFilterModalOpen(false);
                        }}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Page Size Dropdown - Hidden on mobile */}
                <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="whitespace-nowrap">Rows:</span>
                  <Select value={perPage} onValueChange={handlePerPageChange}>
                    <SelectTrigger className="h-9 w-[70px]">
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
                </div>
              </div>

              {/* Action Buttons - Scrollable on mobile */}
              <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 md:overflow-visible">
              <div className="flex items-center gap-2 min-w-max">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-0.5 border border-border rounded-lg p-0.5 bg-card shadow-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 sm:w-auto sm:px-3 p-0 ${viewMode === 'table' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:bg-muted'}`}
                    onClick={() => setViewMode('table')}
                    title="Table View"
                  >
                    <Table2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 sm:w-auto sm:px-3 p-0 ${viewMode === 'card' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:bg-muted'}`}
                    onClick={() => setViewMode('card')}
                    title="Card View"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-2 sm:px-3 text-xs ${viewMode === 'auto' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:bg-muted'}`}
                    onClick={() => setViewMode('auto')}
                    title="Auto (Switch based on viewport)"
                  >
                    Auto
                  </Button>
                </div>

                {/* Show Deleted Employees Toggle - Only show if user has restore or force delete permission */}
                {(hasPermission(permissions, 'restore-employee') || hasPermission(permissions, 'force-delete-employee')) && (
                  <Button 
                    variant={showDeleted ? "default" : "outline"}
                    size="sm" 
                    className="gap-1.5 sm:gap-2 h-9 px-2 sm:px-3"
                    onClick={() => {
                      const newValue = !showDeleted;
                      updateShowDeleted(newValue);
                      triggerFetch({ show_deleted: newValue, page: 1, per_page: parseInt(perPage, 10) });
                    }}
                  >
                    {showDeleted ? (
                      <>
                        <ArchiveRestore className="h-4 w-4" />
                        <span className="hidden sm:inline">Show Active</span>
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4" />
                        <span className="hidden sm:inline">Show Deleted</span>
                      </>
                    )}
                  </Button>
                )}

                {/* Export Button - Hidden on mobile */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="hidden sm:flex gap-2 h-9"
                  onClick={exportToCSV}
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>

                {/* Column Visibility - Hidden on mobile */}
                <Dialog open={columnModalOpen} onOpenChange={setColumnModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="hidden sm:flex gap-2 h-9">
                      <Columns3 className="h-4 w-4" />
                      <span className="hidden md:inline">Columns</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="!max-w-[95vw] sm:!max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
                    {/* Header Section */}
                    <div className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-r from-muted/50 to-transparent">
                      <DialogTitle className="text-2xl font-bold text-foreground mb-2">
                        Column Visibility
                      </DialogTitle>
                      <DialogDescription className="text-sm text-muted-foreground">
                        Select which columns to display. Maximum {MAX_VISIBLE_COLUMNS} columns can be visible at once.
                      </DialogDescription>
                    </div>

                    {/* Search and Stats Section */}
                    <div className="px-6 py-4 space-y-4 bg-card border-b border-border">
                      {/* Column Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search columns..."
                          className="pl-10 h-10 bg-background border-border focus:border-primary focus:ring-primary"
                          value={columnSearchTerm}
                          onChange={(e) => setColumnSearchTerm(e.target.value)}
                        />
                      </div>

                      {/* Stats and Actions */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1.5 bg-primary/10 text-primary rounded-md text-sm font-medium">
                            {visibleColumns.length} of {allColumns.filter((col) => !col.alwaysVisible).length} columns visible
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetToDefaultColumns}
                          className="text-sm h-9"
                        >
                          Reset to Default
                        </Button>
                      </div>
                    </div>

                    {/* Column Groups Grid */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 bg-muted/20">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredColumnGroups.map((group) => {
                          const groupColumns = groupToColumns[group] || [];
                          const allGroupColumnsVisible =
                            groupColumns.length > 0 &&
                            groupColumns.every((key) => visibleColumns.includes(key));
                          const someGroupColumnsVisible =
                            groupColumns.length > 0 &&
                            groupColumns.some((key) => visibleColumns.includes(key));

                          return (
                            <div
                              key={group}
                              className="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                            >
                              {/* Group Header */}
                              <div className="bg-gradient-to-r from-muted/50 to-muted/30 px-4 py-3 border-b border-border">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={allGroupColumnsVisible}
                                    ref={(el) => {
                                      if (el) {
                                        el.indeterminate =
                                          someGroupColumnsVisible && !allGroupColumnsVisible;
                                      }
                                    }}
                                    onChange={() => toggleGroupColumns(group)}
                                    className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer accent-primary"
                                  />
                                  <span className="font-semibold text-sm text-foreground capitalize">
                                    {COLUMN_GROUP_LABELS[group] || group.replace(/_/g, ' ')}
                                  </span>
                                  <span className="ml-auto text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                                    {groupColumns.filter((key) => visibleColumns.includes(key)).length}/{groupColumns.length}
                                  </span>
                                </div>
                              </div>

                              {/* Column List */}
                              <div className="p-3 space-y-1 max-h-64 overflow-y-auto">
                                {EmployeeTableConfig.columns
                                  .filter((col) => col.group === group && !col.alwaysVisible)
                                  .map((col) => (
                                    <label
                                      key={col.key}
                                      className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors duration-150 group"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={visibleColumns.includes(col.key)}
                                        onChange={() => toggleColumn(col.key)}
                                        className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer accent-primary"
                                      />
                                      <span className="text-foreground group-hover:text-primary transition-colors duration-150 flex-1">
                                        {col.label}
                                      </span>
                                    </label>
                                  ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Add Employee Button */}
                {hasPermission(permissions, 'create-employee') && (
                <Button
                  onClick={() => router.visit(route('employees.create'))}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 sm:gap-2 h-9 px-2 sm:px-3"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add New</span>
                </Button>
                )}
              </div>
              </div>
            </div>

            {/* Filter Chips - Scrollable on mobile */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border overflow-x-auto">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium whitespace-nowrap">Filters:</span>
                {statusFilter && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Status: {statusFilter}
                    <button
                      onClick={removeStatusFilter}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {departmentFilter && departmentFilter.length > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Department{departmentFilter.length > 1 ? 's' : ''}:{' '}
                    {departmentFilter.length === 1
                      ? (departments.find((d) => d.id.toString() === departmentFilter[0]) as any)
                          ?.faculty_name ||
                        departments.find((d) => d.id.toString() === departmentFilter[0])?.name ||
                        departmentFilter[0]
                      : `${departmentFilter.length} selected`}
                    <button
                      onClick={removeDepartmentFilter}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {positionFilter && positionFilter.length > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Position{positionFilter.length > 1 ? 's' : ''}:{' '}
                      {positionFilter.length === 1
                      ? (positions.find((p) => p.id.toString() === positionFilter[0]) as any)?.pos_name ||
                        positions.find((p) => p.id.toString() === positionFilter[0])?.name ||
                        String(positionFilter[0])
                      : `${positionFilter.length} selected`}
                    <button
                      onClick={removePositionFilter}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {employeeTypeFilter && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Type: {employeeTypeFilter}
                    <button
                      type="button"
                      onClick={removeEmployeeTypeFilter}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {/* Advanced Filter Badges */}
                {advancedFilters && advancedFilters.length > 0 && advancedFilters
                  .filter(filter => filter.field) // Only show filters with a field
                  .map((filter) => {
                    const value = formatFilterValue(filter);
                    return (
                      <Badge key={filter.id} variant="outline" className="flex items-center gap-1">
                        {getFilterFieldLabel(filter.field)} {getOperatorLabel(filter.operator)} {value && `"${value}"`}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeAdvancedFilter(filter.id);
                          }}
                          className="ml-1 hover:bg-muted rounded-full p-0.5 transition-colors"
                          aria-label="Remove filter"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Table Container - Auto expand/contract based on data */}
        <div className="flex-1 min-h-0 bg-background p-2 sm:p-4 overflow-y-auto">
          <EnterpriseEmployeeTable
            key={`employee-table-${dataVersion}`}
            columns={filteredColumns}
            actions={EmployeeTableConfig.actions}
            data={normalizedEmployees}
            from={from}
            onDelete={handleDelete}
            onView={handleViewEmployee}
            onEdit={handleEditEmployee}
            onRestore={handleRestore}
            onForceDelete={handleForceDelete}
            enableExpand={false}
            isLoading={isLoading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={(column) => {
              const newOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
              setSortBy(column);
              setSortOrder(newOrder);
              triggerFetch({ sort_by: column, sort_order: newOrder, page: 1 });
            }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>

        {/* Pagination - Fixed at bottom of viewport */}
        <div className="flex-shrink-0 bg-card border-t border-border shadow-sm z-30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3">
            {/* Results Info */}
            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              <span className="hidden sm:inline">
              Showing <span className="font-semibold text-foreground">{from || 0}</span> to{' '}
              <span className="font-semibold text-foreground">{to || 0}</span> of{' '}
              <span className="font-semibold text-foreground">{total || 0}</span> employees
              </span>
              <span className="sm:hidden">
                <span className="font-semibold text-foreground">{from || 0}</span>-
                <span className="font-semibold text-foreground">{to || 0}</span> of{' '}
                <span className="font-semibold text-foreground">{total || 0}</span>
              </span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 sm:h-9 px-2 sm:px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>

              {/* Page Numbers - Desktop only */}
              <div className="hidden sm:flex items-center gap-1">
                {lastPage > 1 ? (
                  <>
                    {/* First Page */}
                    {currentPage > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        className="h-9 min-w-[40px] hover:bg-muted"
                      >
                        1
                      </Button>
                    )}

                    {/* Ellipsis before current pages */}
                    {currentPage > 3 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}

                    {/* Current page range */}
                    {Array.from({ length: Math.min(5, lastPage - 2) }, (_, i) => {
                      const page =
                        Math.max(2, Math.min(currentPage - 2, lastPage - 4)) + i;
                      if (page >= 2 && page < lastPage) {
                        return (
                          <Button
                            key={page}
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className={`h-9 min-w-[40px] ${
                              currentPage === page
                                ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                                : 'hover:bg-muted'
                            }`}
                          >
                            {page}
                          </Button>
                        );
                      }
                      return null;
                    })}

                    {/* Ellipsis after current pages */}
                    {currentPage < lastPage - 2 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}

                    {/* Last Page */}
                    {lastPage > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(lastPage)}
                        className={`h-9 min-w-[40px] ${
                          currentPage === lastPage
                            ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                            : 'hover:bg-muted'
                        }`}
                      >
                        {lastPage}
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="h-9 min-w-[40px] bg-primary text-primary-foreground border-primary"
                  >
                    1
                  </Button>
                )}
              </div>

              {/* Page Indicator - Mobile only */}
              <div className="flex sm:hidden items-center gap-1 px-2 text-sm">
                <span className="font-semibold text-foreground">{currentPage}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{lastPage || 1}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === lastPage || lastPage === 0}
                className="h-8 sm:h-9 px-2 sm:px-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Detail Drawer */}
      {selectedEmployee && (
        <EmployeeDetailDrawer
          employee={selectedEmployee as any}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      )}

      {/* Advanced Filter Panel */}
      {filter_fields_config && (
        <AdvancedFilterPanel
          open={advancedFilterOpen}
          onOpenChange={setAdvancedFilterOpen}
          filters={advancedFilters}
          onFiltersChange={handleAdvancedFiltersChange}
          filterFieldsConfig={filter_fields_config}
          onApply={handleApplyAdvancedFilters}
          onClear={handleClearAdvancedFilters}
        />
      )}
    </AppLayout>
  );
}
