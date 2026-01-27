import { CustomModalForm } from '@/components/custom-modal-form';
import { EnterpriseEmployeeTable } from '@/components/EnterpriseEmployeeTable';
import { CustomToast, toast } from '@/components/custom-toast';
import { PageLayout } from '@/components/page-layout';
import { IconButton } from '@/components/ui/icon-button';
import { DepartmentModalFormConfig, DEPARTMENT_TYPE_DESCRIPTIONS } from '@/config/forms/department-modal-form';
import { DepartmentTableConfig } from '@/config/tables/department-table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { hasPermission } from '@/utils/authorization';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowUpDown, Archive, ArchiveRestore, Plus, Download } from 'lucide-react';
import { CompactPagination } from '@/components/CompactPagination';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DetailDrawer } from '@/components/DetailDrawer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Departments & Offices', href: '/departments' },
];

type DepartmentType = 'academic' | 'administrative'

interface Department {
  id?: number
  department_id?: number
  code?: string | null
  name?: string | null
  faculty_code?: string | null
  faculty_name?: string | null
  type?: DepartmentType | null
  faculty_id?: number | null
  faculty?: { id: number; name: string } | null
  description?: string | null
}

interface FacultyOption {
  id: number
  name: string
}

interface LinkProps {
  active: boolean;
  label: string;
  url: string;
}

interface Pagination<T> {
  data: T[];
  links: LinkProps[];
  from: number;
  to: number;
  total: number;
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

interface FlashProps extends Record<string, any> {
  flash?: {
    success?: string;
    error?: string;
  };
}

interface FilterProps {
  search: string;
  perPage: string;
  type?: DepartmentType | '';
  faculty_id?: string;
  show_deleted?: boolean;
}

interface IndexProps {
  departments: Pagination<Department>;
  faculties: FacultyOption[];
  filters?: FilterProps;
}

export default function DepartmentIndex({ departments, faculties, filters }: IndexProps) {
  const { flash, auth } = usePage<FlashProps & { auth?: { permissions?: string[] } }>().props;
  const permissions = auth?.permissions || [];
  const flashMessage = flash?.success || flash?.error;

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDepartmentForView, setSelectedDepartmentForView] = useState<Department | null>(null);
  const [sortKey, setSortKey] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('departments_sortKey');
      if (saved && ['name-asc', 'name-desc', 'date-asc', 'date-desc'].includes(saved)) {
        return saved as typeof sortKey;
      }
    }
    return 'name-asc';
  });
  const [searchTerm, setSearchTerm] = useState(filters?.search ?? '');
  const [perPage, setPerPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('departments_perPage');
      if (saved && ['5', '10', '25', '50', '100'].includes(saved)) {
        return saved;
      }
    }
    return String(filters?.perPage ?? 10);
  });
  const [typeFilter, setTypeFilter] = useState<DepartmentType | ''>(filters?.type ?? '');
  const [facultyFilter, setFacultyFilter] = useState(filters?.faculty_id ? String(filters?.faculty_id) : '');
  const [showDeleted, setShowDeleted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('departments_filter_show_deleted');
      if (saved === 'true') return true;
      if (saved === 'false') return false;
    }
    return filters?.show_deleted || false;
  });
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasSyncedRef = useRef(false);

  const { data, setData, errors, processing, reset, post, transform } = useForm({
    code: '',
    name: '',
    type: 'academic' as DepartmentType,
    faculty_id: '',
    description: '',
    _method: 'POST',
  });

  const handleFieldChange = (field: string, value: any) => {
    if (field === 'faculty_id') {
      setData(field, value ?? '');
      return;
    }

    if (field === 'type') {
      setData(field, (value as DepartmentType) ?? 'academic');
      return;
    }

    setData(field, value);
  };

  const facultyOptions = faculties.map((faculty) => ({
    key: String(faculty.id),
    value: String(faculty.id),
    label: faculty.name,
  }));

  // Flash messages
  useEffect(() => {
    if (flash?.success) toast.success(flash.success);
    if (flash?.error) toast.error(flash.error);
  }, [flash]);

  // Clear faculty_id when type changes to administrative
  useEffect(() => {
    if (data.type === 'administrative' && (data.faculty_id !== '' && data.faculty_id !== null && data.faculty_id !== undefined)) {
      setData('faculty_id', '');
    }
  }, [data.type]);

  const modalFields = DepartmentModalFormConfig.fields
    .map((field) => {
      if (field.name === 'type') {
        return {
          ...field,
          description: data.type && DEPARTMENT_TYPE_DESCRIPTIONS[data.type]
            ? DEPARTMENT_TYPE_DESCRIPTIONS[data.type]
            : undefined,
        };
      }
      if (field.name === 'faculty_id') {
        return {
          ...field,
          options: facultyOptions,
          label: data.type === 'academic' ? 'Faculty (Required for Academic Departments)' : 'Faculty',
          required: data.type === 'academic',
        };
      }
      if (field.name === 'code') {
        return {
          ...field,
          label: data.type === 'administrative' ? 'Office Code' : 'Department Code',
          placeholder: data.type === 'administrative' ? 'e.g. HR, IT, FIN' : 'e.g. CS, ENG, MATH',
        };
      }
      if (field.name === 'name') {
        return {
          ...field,
          label: data.type === 'administrative' ? 'Office Name' : 'Department Name',
          placeholder: data.type === 'administrative' ? 'e.g. Human Resources Office' : 'e.g. Computer Science Department',
        };
      }
      if (field.name === 'description') {
        return {
          ...field,
          label: data.type === 'administrative' ? 'Office Description' : 'Department Description',
          placeholder: data.type === 'administrative' ? 'Optional description for this office' : 'Optional description for this department',
        };
      }

      return field;
    })
    .filter((field) => field.name !== 'faculty_id' || data.type === 'academic');

  const refreshTable = () => {
    triggerFetch();
  };

  const handleRestore = (id: string | number) => {
    router.post(route('departments.restore', id), {}, {
      preserveScroll: true,
      onSuccess: () => {
        triggerFetch({})
      },
      onError: () => toast.error('Failed to restore department'),
    })
  }

  const handleForceDelete = (id: string | number) => {
    router.delete(route('departments.force-delete', id), {
      preserveScroll: true,
      onSuccess: () => {
        // Flash message will be handled by useEffect watching flash prop
        triggerFetch({})
      },
      onError: () => toast.error('Failed to permanently delete department'),
    })
  }

  const handleDelete = (routePath: string) => {
    router.delete(routePath, {
      preserveScroll: true,
      onSuccess: () => {
        closeModal();
        refreshTable();
      },
      onError: (error: Record<string, string | string[]>) => {
        if (typeof error?.message === 'string') {
          toast.error(error.message);
        }
        closeModal();
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission - check if already processing
    if (processing) {
      return;
    }

    const isEditMode = mode === 'edit' && selectedDepartment;
    const departmentId = selectedDepartment?.id ?? selectedDepartment?.department_id;

    // Set the method for the form
    setData('_method', isEditMode ? 'PUT' : 'POST');

    const routePath =
      isEditMode && departmentId
        ? route('departments.update', { department: departmentId })
        : route('departments.store');

    // Use transform to modify the data before submission
    transform((formData) => {
      const payload = {
        ...formData,
        // Only include faculty_id for academic departments
        faculty_id: formData.type === 'academic' && formData.faculty_id && formData.faculty_id !== ''
          ? Number(formData.faculty_id)
          : null,
      };

      return payload;
    });

    post(routePath, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        // Flash message will be handled by useEffect watching flash prop
        closeModal();
        refreshTable();
      },
      onError: (error: Record<string, string | string[]>) => {
        if (typeof error?.message === 'string') {
          toast.error(error.message);
        }
      },
    });
  };

  // Handle view department
  const handleViewDepartment = (row: any) => {
    setSelectedDepartmentForView(row);
    setDrawerOpen(true);
  };

  const openModal = (mode: 'create' | 'view' | 'edit', department?: Department | any) => {
    // If view mode, use drawer instead
    if (mode === 'view') {
      handleViewDepartment(department);
      return;
    }

    setMode(mode);
    if (department) {
      // Ensure department_id is set - use id if department_id is missing
      const deptWithId: Department = {
        ...department,
        department_id: department.department_id ?? department.id,
      };
      setSelectedDepartment(deptWithId);
      const normalizedType = (department.type as DepartmentType) ?? 'academic';
      const facultyValue =
        normalizedType === 'academic'
          ? String(
              department.faculty_id ??
                department.faculty?.id ??
                ''
            )
          : '';
      setData({
        code: department.code ?? department.faculty_code ?? '',
        name: department.name ?? department.faculty_name ?? '',
        type: normalizedType,
        faculty_id: facultyValue,
        description: department.description || '',
        _method: 'PUT',
      });
    } else {
      // Reset form for create mode - ensure faculty_id is empty
      reset();
      // Explicitly set type to academic as default and clear faculty_id
      setData({
        code: '',
        name: '',
        type: 'academic' as DepartmentType,
        faculty_id: '',
        description: '',
        _method: 'POST',
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setMode('create');
    setSelectedDepartment(null);
    reset();
    setModalOpen(false);
  };

  const handleModalToggle = (open: boolean) => {
  setModalOpen(open);
  if (!open) closeModal();
  };

const handleTypeFilterChange = (value: string) => {
  const normalized = value === 'all' ? '' : (value as DepartmentType);
  setTypeFilter(normalized);
  triggerFetch({ type: normalized, page: 1 });
};

const handleFacultyFilterChange = (value: string) => {
  const normalized = value === 'all' ? '' : value;
  setFacultyFilter(normalized);
  triggerFetch({ faculty_id: normalized, page: 1 });
};

  // No client-side sorting - backend handles it
  const tableData = departments.data.map((dept) => {
    const id = dept.id ?? dept.department_id;
    const isAdministrative = dept.type === 'administrative';
    
    // Only use faculty data for academic departments
    // For administrative offices, faculty_name is just a copy of the name field
    const normalizedFaculty = isAdministrative
      ? null
      : (dept.faculty ??
        (dept.faculty_id && dept.faculty_name
          ? {
              id: dept.faculty_id,
              name: dept.faculty_name,
            }
          : null));
    
    const typeLabel = dept.type
      ? `${dept.type.charAt(0).toUpperCase()}${dept.type.slice(1)}`
      : 'Academic';
    
    const facultyDisplay = isAdministrative
      ? 'Not Applicable'
      : (normalizedFaculty?.name ?? 'Unassigned');

    return {
      ...dept,
      id,
      code: dept.code ?? dept.faculty_code ?? '',
      name: dept.name ?? dept.faculty_name ?? '',
      faculty: normalizedFaculty,
      faculty_display: facultyDisplay,
      type_label: typeLabel,
    };
  });

  // Convert sortKey to sort_by and sort_order
  const getSortParams = (key: typeof sortKey) => {
    const [field, order] = key.split('-');
    const sortByMap: Record<string, string> = {
      'name': 'name',
      'date': 'created_at',
    };
    return {
      sort_by: sortByMap[field] || 'name',
      sort_order: order || 'asc',
    };
  };

  const triggerFetch = (params: Record<string, any> = {}) => {
    const sortParams = getSortParams(sortKey);
    const requestParams = {
      search: searchTerm,
      perPage,
      type: typeFilter,
      faculty_id: facultyFilter,
      show_deleted: params.show_deleted !== undefined ? params.show_deleted : showDeleted,
      sort_by: params.sort_by !== undefined ? params.sort_by : sortParams.sort_by,
      sort_order: params.sort_order !== undefined ? params.sort_order : sortParams.sort_order,
      ...params,
    };

    router.get(route('departments.index'), requestParams, {
      preserveState: true,
      replace: true,
      preserveScroll: false,
      onStart: () => setIsSearching(true),
      onFinish: () => setIsSearching(false),
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      triggerFetch({ search: value });
    }, 300);
  };

  const handlePerPageChange = (value: string) => {
    setPerPage(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('departments_perPage', value);
    }
    triggerFetch({ perPage: value });
  };

  const handleSortKeyChange = (value: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc') => {
    setSortKey(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('departments_sortKey', value);
    }
    const sortParams = getSortParams(value);
    triggerFetch({ sort_by: sortParams.sort_by, sort_order: sortParams.sort_order, page: 1 });
  };

  // Pagination data - use root level properties (Laravel paginator structure)
  const from = departments?.from ?? 0;
  const to = departments?.to ?? 0;
  const total = departments?.total ?? 0;
  const currentPage = departments?.meta?.current_page || (from > 0 ? Math.floor((from - 1) / (parseInt(perPage) || 10)) + 1 : 1);
  const lastPage = departments?.meta?.last_page || (total > 0 ? Math.ceil(total / (parseInt(perPage) || 10)) : 1);

  const handlePageChange = (page: number) => {
    // Ensure page is a valid positive number
    const validPage = Math.max(1, Math.min(page, lastPage || 1));
    triggerFetch({ page: validPage });
  };

  // Export to CSV function
  const exportToCSV = useCallback(() => {
    const columns = DepartmentTableConfig.columns.filter(col => !col.isAction && !col.alwaysVisible);
    const headers = columns.map(col => col.label);
    
    const rows = tableData.map(item => 
      columns.map(col => {
        const value = getNestedValue(item, col.key);
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
    link.setAttribute('download', `departments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Data exported to CSV');
  }, [tableData]);

  // Helper function for nested values
  const getNestedValue = (obj: any, path: string): any => {
    if (!obj || typeof obj !== 'object') return null;
    return path.split('.').reduce((acc, key) => {
      if (acc === null || acc === undefined || typeof acc !== 'object') return null;
      return acc[key] !== undefined ? acc[key] : null;
    }, obj);
  };

  useEffect(() => {
    if (data.type === 'administrative' && data.faculty_id) {
      setData('faculty_id', '');
    }
  }, [data.type, data.faculty_id, setData]);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  // Sync localStorage values with backend on mount
  useEffect(() => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    
    const savedPerPage = typeof window !== 'undefined' ? localStorage.getItem('departments_perPage') : null;
    const currentPerPage = String(filters?.perPage ?? 10);
    
    // If localStorage has a different perPage than what backend sent, sync it
    if (savedPerPage && savedPerPage !== currentPerPage && ['5', '10', '25', '50', '100'].includes(savedPerPage)) {
      triggerFetch({ search: searchTerm, perPage: savedPerPage });
    }
  }, []); // Only run on mount

  // Disable page scrolling
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    
    const originalHtmlOverflow = html.style.overflow;
    const originalBodyOverflow = body.style.overflow;
    
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    
    return () => {
      html.style.overflow = originalHtmlOverflow;
      body.style.overflow = originalBodyOverflow;
    };
  }, []);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Departments & Offices" />
      <CustomToast />

      <PageLayout
        title="Departments & Offices"
        subtitle={showDeleted ? "Viewing deleted departments and offices. You can restore or permanently delete them." : "Manage academic departments and administrative offices."}
        primaryAction={
          hasPermission(permissions, 'create-department') ? {
            label: 'Add Department',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => openModal('create'),
            permission: true,
          } : undefined
        }
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        isSearching={isSearching}
        searchPlaceholder="Search departments..."
        perPage={{
          value: perPage,
          onChange: handlePerPageChange,
        }}
        filtersSlot={
            <>
              {/* Type filter */}
              <div className="hidden md:flex items-center">
                <Select value={typeFilter || 'all'} onValueChange={handleTypeFilterChange}>
                  <SelectTrigger className="h-9 w-[160px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="academic">Departments</SelectItem>
                    <SelectItem value="administrative">Offices</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Faculty filter */}
              <div className="hidden lg:flex items-center">
                <Select value={facultyFilter || 'all'} onValueChange={handleFacultyFilterChange}>
                  <SelectTrigger className="h-9 w-[160px]">
                    <SelectValue placeholder="All Faculties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Faculties</SelectItem>
                    {faculties.map((faculty) => (
                      <SelectItem key={faculty.id} value={String(faculty.id)}>
                        {faculty.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          }
        actionsSlot={
          <>
            {/* Secondary Actions - Icon Buttons */}
            <div className="flex items-center gap-1">
              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton
                    icon={<ArrowUpDown className="h-4 w-4" />}
                    tooltip="Sort"
                    variant="outline"
                    aria-label="Sort"
                    className="h-9 w-9 rounded-lg"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSortKeyChange('name-asc')}>
                    A → Z
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('name-desc')}>
                    Z → A
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('date-asc')}>
                    Oldest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortKeyChange('date-desc')}>
                    Newest First
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Show Deleted Toggle */}
              {(hasPermission(permissions, 'restore-department') || hasPermission(permissions, 'force-delete-department')) && (
                <IconButton
                  icon={showDeleted ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  tooltip={showDeleted ? "Show Active" : "Show Deleted"}
                  variant={showDeleted ? "default" : "outline"}
                  onClick={() => {
                    const newValue = !showDeleted
                    setShowDeleted(newValue)
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('departments_filter_show_deleted', String(newValue))
                    }
                    triggerFetch({ show_deleted: newValue, page: 1, perPage })
                  }}
                  aria-label={showDeleted ? "Show Active" : "Show Deleted"}
                  className="h-9 w-9 rounded-lg"
                />
              )}
            </div>

            {/* Export Button */}
            <IconButton
              icon={<Download className="h-4 w-4" />}
              tooltip="Export"
              variant="outline"
              onClick={exportToCSV}
              aria-label="Export"
              className="h-9 w-9 rounded-lg"
            />
          </>
        }
        pagination={
          <CompactPagination
            currentPage={currentPage}
            lastPage={lastPage}
            perPage={perPage}
            total={total}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            perPageOptions={['5', '10', '25', '50', '100']}
          />
        }
      >
        {/* Subtle Status Indicator */}
        {showDeleted && (
          <div className="mb-3 px-3 md:px-6">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <Archive className="h-4 w-4" />
              <span>Viewing deleted departments</span>
            </div>
          </div>
        )}
        <EnterpriseEmployeeTable
          columns={DepartmentTableConfig.columns}
          actions={DepartmentTableConfig.actions}
          data={tableData}
          from={departments.from}
          onDelete={handleDelete}
          onView={handleViewDepartment}
          onEdit={(item) => openModal('edit', item)}
          onRestore={handleRestore}
          onForceDelete={handleForceDelete}
          resourceType="department"
          enableExpand={false}
          viewMode="table"
        />
      </PageLayout>

      {/* Department Modal */}
      <CustomModalForm
                addButtonWrapperClassName="hidden"
                addButton={{
                  ...DepartmentModalFormConfig.addButton,
                  label: '',
                  className: 'h-9 w-9 p-0',
                }}
                title={
                  mode === 'view'
                    ? selectedDepartment?.type === 'administrative' ? 'View Office' : 'View Department'
                    : mode === 'edit'
                    ? selectedDepartment?.type === 'administrative' ? 'Update Office' : 'Update Department'
                    : data.type === 'administrative' ? 'Create Office' : 'Create Department'
                }
                description={
                  mode === 'view'
                    ? selectedDepartment?.type === 'administrative' 
                      ? 'View administrative office details.'
                      : 'View academic department details.'
                    : mode === 'edit'
                    ? selectedDepartment?.type === 'administrative'
                      ? 'Update the administrative office information below.'
                      : 'Update the academic department information below.'
                    : data.type === 'administrative'
                      ? 'Create an administrative office (non-teaching unit like HR, Finance, IT).'
                      : data.type === 'academic'
                      ? 'Create an academic department (teaching unit within a faculty).'
                      : DepartmentModalFormConfig.description
                }
                fields={modalFields}
                buttons={DepartmentModalFormConfig.buttons.map((btn) => 
                  btn.key === 'submit' 
                    ? { 
                        ...btn, 
                        label: mode === 'edit' 
                          ? selectedDepartment?.type === 'administrative' ? 'Update Office' : 'Update Department'
                          : data.type === 'administrative' ? 'Create Office' : 'Create Department'
                      }
                    : btn
                )}
                data={data}
                setData={handleFieldChange}
                errors={errors}
                processing={processing}
                handleSubmit={handleSubmit}
                open={modalOpen}
                onOpenChange={handleModalToggle}
                mode={mode}
      />

      {/* Department Detail Drawer */}
      {selectedDepartmentForView && (
        <DetailDrawer
          item={selectedDepartmentForView}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          fields={DepartmentModalFormConfig.fields}
          titleKey="name"
          subtitleKey="id"
          subtitleLabel="Department ID"
          extraData={{ faculties: faculties.map((f) => ({ id: f.id, name: f.name, label: f.name, value: f.id.toString() })) }}
        />
      )}
    </AppLayout>
  );
}
