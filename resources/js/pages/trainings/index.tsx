import { CustomModalForm } from '@/components/custom-modal-form';
import { EnterpriseEmployeeTable } from '@/components/EnterpriseEmployeeTable';
import { CustomToast, toast } from '@/components/custom-toast';
import { PageLayout } from '@/components/page-layout';
import { IconButton } from '@/components/ui/icon-button';
import { TrainingsModalFormConfig } from '@/config/forms/trainings-modal-form';
import { TrainingsTableConfig } from '@/config/tables/trainings-table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { ArrowUpDown, Archive, ArchiveRestore, Plus, Download } from 'lucide-react';
import { CompactPagination } from '@/components/CompactPagination';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DetailDrawer } from '@/components/DetailDrawer';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manage Trainings',
        href: '/trainings',
    },
];

interface LinkProps {
    active: boolean;
    label: string;
    url: string;
}

interface Training {
    id: number;
    training_id: number;
    training_title: string;
    date_from: string;
    date_to: string;
    hours: string | number;
    facilitator?: string;
    venue?: string;
    capacity?: number;
    remarks?: string;
    allowed_faculties?: { id: number; name: string }[];
    allowed_departments: { id: number; faculty_name: string }[];
    allowed_positions: { id: number; pos_name: string }[];
    schedule?: string;
    requires_approval?: boolean;
    request_type_id?: number | null;
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

interface OptionItem {
    id: number;
    label: string;
    name?: string;
    value?: string;
}

interface FormDataShape {
    training_title: string;
    date_from: string;
    date_to: string;
    hours: string;
    facilitator: string;
    venue: string;
    capacity: string;
    remarks: string;
    organization_type: string;
    faculty_ids: string[];
    department_ids: string[];
    position_ids: string[];
    requires_approval: boolean;
    request_type_id: string | null;
    _method: string;
}

interface IndexProps {
    trainings: Pagination<Training>;
    formOptions: {
        faculties: OptionItem[];
        departments: OptionItem[];
        positions: OptionItem[];
        requestTypes: OptionItem[];
    };
    filters?: {
        search?: string;
        perPage?: number;
        show_deleted?: boolean;
    };
}

const toInputDate = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toISOString().split('T')[0];
};

const toStringArray = (items?: Array<{ id?: number }>) =>
    Array.isArray(items) ? items.map((item) => String(item?.id ?? '')).filter(Boolean) : [];

const normalizeCollection = (items: any[] | undefined, fallbackKeys: string[]): any[] => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
        const label =
            item?.name ||
            item?.label ||
            fallbackKeys.map((key) => item?.[key]).find((value) => Boolean(value)) ||
            '-';
        return {
            ...item,
            name: label,
            label,
        };
    });
};

const normalizeTrainingForView = (training: any) => {
    if (!training) return training;

    return {
        ...training,
        allowed_faculties: normalizeCollection(training.allowed_faculties, ['faculty_name', 'name']),
        allowed_departments: normalizeCollection(training.allowed_departments, ['faculty_name', 'name', 'department_name']),
        allowed_positions: normalizeCollection(training.allowed_positions, ['pos_name', 'name']),
    };
};

export default function TrainingsIndex({ trainings, formOptions, filters }: IndexProps) {
    const { flash, auth } = usePage<{ flash?: { success?: string; error?: string }; auth?: { permissions?: string[] } }>().props;
    const permissions = auth?.permissions || [];
    const [modalOpen, setModalOpen] = useState(false);
    const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create');
    const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedTrainingForView, setSelectedTrainingForView] = useState<Training | null>(null);
    const [sortKey, setSortKey] = useState<'title-asc' | 'title-desc' | 'date-asc' | 'date-desc'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('trainings_sortKey');
            if (saved && ['title-asc', 'title-desc', 'date-asc', 'date-desc'].includes(saved)) {
                return saved as typeof sortKey;
            }
        }
        return 'title-asc';
    });

    // Convert sortKey to sort_by and sort_order
    const getSortParams = (key: typeof sortKey) => {
        const [field, order] = key.split('-');
        const sortByMap: Record<string, string> = {
            'title': 'training_title',
            'date': 'date_from',
        };
        return {
            sort_by: sortByMap[field] || 'training_title',
            sort_order: order || 'asc',
        };
    };
    const [searchTerm, setSearchTerm] = useState(filters?.search ?? '');
    const [showDeleted, setShowDeleted] = useState(filters?.show_deleted ?? false);
    const [perPage, setPerPage] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('trainings_perPage');
            if (saved && ['5', '10', '25', '50', '100'].includes(saved)) {
                return saved;
            }
        }
        return String(filters?.perPage ?? 10);
    });
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const hasSyncedRef = useRef(false);

    const { data, setData, errors, processing, reset, post } = useForm<FormDataShape>({
        training_title: '',
        date_from: '',
        date_to: '',
        hours: '',
        facilitator: '',
        venue: '',
        capacity: '',
        remarks: '',
        organization_type: 'academic', // Default to academic
        faculty_ids: [],
        department_ids: [],
        position_ids: [],
        requires_approval: false, // Default to false
        request_type_id: null,
        _method: 'POST',
    });

    // Organization type helpers
    const isAcademic = data.organization_type === 'academic';
    const isAdministrative = data.organization_type === 'administrative';
    const facultySelected = data.faculty_ids && data.faculty_ids.length > 0;

    // Create department lookup for efficient filtering
    const departmentLookup = useMemo(() => {
        const lookup = new Map();
        (formOptions.departments || []).forEach((dept: any) => {
            lookup.set(String(dept.id), dept);
        });
        return lookup;
    }, [formOptions.departments]);

    // Filter departments based on organization type and selected faculties
    const filteredDepartments = useMemo(() => {
        const allDepartments = formOptions.departments || [];
        
        // For academic: require faculty selection first
        if (isAcademic) {
            if (!facultySelected) {
                return []; // No departments available until faculty is selected
            }
            // Filter by organization type and selected faculties
            const selectedFacultyIds = data.faculty_ids.map(id => Number(id));
            return allDepartments.filter((dept: any) => {
                const deptType = dept.type || 'academic';
                return deptType === 'academic' && 
                       dept.faculty_id && 
                       selectedFacultyIds.includes(dept.faculty_id);
            });
        }
        
        // For administrative: show only administrative departments (offices)
        if (isAdministrative) {
            return allDepartments.filter((dept: any) => {
                const deptType = dept.type || 'academic';
                return deptType === 'administrative';
            });
        }

        return [];
    }, [data.organization_type, data.faculty_ids, formOptions.departments, isAcademic, isAdministrative, facultySelected]);

    // Filter positions based on organization type, selected departments, and faculties
    const filteredPositions = useMemo(() => {
        const availablePositions = formOptions.positions || [];
        const selectedDepartments = data.department_ids || [];
        const selectedFaculties = data.faculty_ids || [];
        const departmentSelected = selectedDepartments.length > 0;

        // For academic: require faculty selection first
        if (isAcademic) {
            if (!facultySelected) {
                return []; // No positions available until faculty is selected
            }

            const selectedFacultyIds = selectedFaculties.map(id => Number(id));

            // If departments are selected, show positions from those departments AND faculty-level positions
            if (departmentSelected) {
                return availablePositions.filter((position: any) => {
                    const departmentId = position.department_id ? String(position.department_id) : null;
                    const facultyId = position.faculty_id ? Number(position.faculty_id) : null;

                    // Check if position belongs to a selected department
                    if (departmentId && selectedDepartments.includes(departmentId)) {
                        // Verify the department is academic
                        const dept = departmentLookup.get(departmentId);
                        if (dept && dept.type === 'academic') {
                            return true;
                        }
                    }

                    // Check if position is faculty-level (no department) and matches selected faculties
                    if (!departmentId && facultyId && selectedFacultyIds.includes(facultyId)) {
                        return true;
                    }

                    return false;
                });
            }

            // If only faculty is selected (no departments), show only faculty-level positions
            return availablePositions.filter((position: any) => {
                // Must be faculty-level (no department_id) and match selected faculties
                return !position.department_id && 
                       position.faculty_id && 
                       selectedFacultyIds.includes(Number(position.faculty_id));
            });
        }

        // For administrative: show positions from administrative departments
        if (isAdministrative) {
            if (departmentSelected) {
                // Show positions from selected administrative departments
                return availablePositions.filter((position: any) => {
                    if (!position.department_id) {
                        return false; // Administrative positions must have a department
                    }
                    const departmentId = String(position.department_id);
                    if (!selectedDepartments.includes(departmentId)) {
                        return false;
                    }
                    // Verify the department is administrative
                    const dept = departmentLookup.get(departmentId);
                    return dept && dept.type === 'administrative';
                });
            }

            // If no departments selected, show all positions from administrative departments
            return availablePositions.filter((position: any) => {
                if (!position.department_id) {
                    return false; // Administrative positions must have a department
                }
                const dept = departmentLookup.get(String(position.department_id));
                return dept && dept.type === 'administrative';
            });
        }

        return [];
    }, [data.organization_type, data.department_ids, data.faculty_ids, formOptions.positions, isAcademic, isAdministrative, facultySelected, departmentLookup]);

    // Handle organization type change
    const handleOrganizationTypeChange = (value: string) => {
        if (data.organization_type === value) {
            return;
        }
        setData('organization_type', value);
        // Clear related fields when switching types
        setData('faculty_ids', []);
        setData('department_ids', []);
        setData('position_ids', []);
    };

    // Clear invalid departments when organization type or faculties change
    useEffect(() => {
        if (data.department_ids && data.department_ids.length > 0) {
            const validDepartmentIds = filteredDepartments.map((dept: any) => String(dept.id));
            const invalidDepartments = data.department_ids.filter((deptId: string) => !validDepartmentIds.includes(deptId));
            
            if (invalidDepartments.length > 0) {
                const updatedDepartmentIds = data.department_ids.filter((deptId: string) => validDepartmentIds.includes(deptId));
                setData('department_ids', updatedDepartmentIds);
            }
        }
        
        // For academic, clear departments if no faculties selected
        if (isAcademic && !facultySelected && data.department_ids && data.department_ids.length > 0) {
            setData('department_ids', []);
        }
    }, [data.organization_type, data.faculty_ids, filteredDepartments, isAcademic, facultySelected]);

    // Clear invalid positions when departments or faculties change
    useEffect(() => {
        if (data.position_ids && data.position_ids.length > 0) {
            const validPositionIds = filteredPositions.map((pos: any) => String(pos.id));
            const invalidPositions = data.position_ids.filter((posId: string) => !validPositionIds.includes(posId));
            
            if (invalidPositions.length > 0) {
                const updatedPositionIds = data.position_ids.filter((posId: string) => validPositionIds.includes(posId));
                setData('position_ids', updatedPositionIds);
            }
        }

        // For academic: clear positions if no faculty selected
        if (isAcademic && !facultySelected && data.position_ids && data.position_ids.length > 0) {
            setData('position_ids', []);
        }
    }, [data.department_ids, data.faculty_ids, filteredPositions, isAcademic, facultySelected]);

    const formatDate = (date: string) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString(undefined, {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
        });
    };

    // No client-side sorting - backend handles it
    const tableData = trainings.data.map((training) => ({
        ...training,
        id: training.training_id ?? training.id,
        schedule: `${formatDate(training.date_from)} - ${formatDate(training.date_to)}`,
    }));

    // Pagination data - use root level properties (Laravel paginator structure)
    const from = trainings?.from ?? 0;
    const to = trainings?.to ?? 0;
    const total = trainings?.total ?? 0;
    const currentPage = trainings?.meta?.current_page || (from > 0 ? Math.floor((from - 1) / (parseInt(perPage) || 10)) + 1 : 1);
    const lastPage = trainings?.meta?.last_page || (total > 0 ? Math.ceil(total / (parseInt(perPage) || 10)) : 1);

    const handlePageChange = (page: number) => {
        // Ensure page is a valid positive number
        const validPage = Math.max(1, Math.min(page, lastPage || 1));
        triggerFetch({ page: validPage, search: searchTerm, perPage });
    };

    // Export to CSV function
    const exportToCSV = useCallback(() => {
        const columns = TrainingsTableConfig.columns.filter(col => !col.isAction && !col.alwaysVisible);
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
        link.setAttribute('download', `trainings_${new Date().toISOString().split('T')[0]}.csv`);
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

    const closeModal = () => {
        setMode('create');
        setSelectedTraining(null);
        reset();
        setModalOpen(false);
    };

    const handleModalToggle = (open: boolean) => {
        if (!open) {
            closeModal();
        } else {
            setModalOpen(true);
        }
    };

    // Handle view training
    const handleViewTraining = (row: any) => {
        setSelectedTrainingForView(normalizeTrainingForView(row));
        setDrawerOpen(true);
    };

    const openModal = (modalMode: 'create' | 'view' | 'edit', training?: Training) => {
        // If view mode, use drawer instead
        if (modalMode === 'view') {
            handleViewTraining(training);
            return;
        }

        setMode(modalMode);

        if (training) {
            setSelectedTraining(training);
            // Determine organization type from selected departments
            const selectedDeptIds = toStringArray(training.allowed_departments);
            const selectedDepts = (formOptions.departments || []).filter((dept: any) => 
                selectedDeptIds.includes(String(dept.id))
            );
            // If any department is administrative, set to administrative, otherwise academic
            const orgType = selectedDepts.some((dept: any) => dept.type === 'administrative') 
                ? 'administrative' 
                : 'academic';
            
            setData(() => ({
                training_title: training.training_title ?? '',
                date_from: toInputDate(training.date_from),
                date_to: toInputDate(training.date_to),
                hours: training.hours?.toString() ?? '',
                facilitator: training.facilitator ?? '',
                venue: training.venue ?? '',
                capacity: training.capacity?.toString() ?? '',
                remarks: training.remarks ?? '',
                organization_type: orgType,
                faculty_ids: toStringArray(training.allowed_faculties || []),
                department_ids: toStringArray(training.allowed_departments),
                position_ids: toStringArray(training.allowed_positions),
                requires_approval: training.requires_approval ?? false,
                request_type_id: training.request_type_id ? String(training.request_type_id) : null,
                _method: 'PUT',
            }));
        } else {
            reset();
        }

        setModalOpen(true);
    };

    const triggerFetch = (params: Record<string, any> = {}) => {
        const sortParams = getSortParams(sortKey);
        const fetchParams = {
            search: searchTerm,
            perPage,
            show_deleted: params.show_deleted !== undefined ? params.show_deleted : showDeleted,
            sort_by: params.sort_by !== undefined ? params.sort_by : sortParams.sort_by,
            sort_order: params.sort_order !== undefined ? params.sort_order : sortParams.sort_order,
            ...params,
        };
        router.get(route('trainings.index'), fetchParams, {
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
            triggerFetch({ search: value, perPage });
        }, 300);
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        if (typeof window !== 'undefined') {
            localStorage.setItem('trainings_perPage', value);
        }
        triggerFetch({ search: searchTerm, perPage: value });
    };

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
        
        const savedPerPage = typeof window !== 'undefined' ? localStorage.getItem('trainings_perPage') : null;
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
        
        // Store original overflow values
        const originalHtmlOverflow = html.style.overflow;
        const originalBodyOverflow = body.style.overflow;
        
        // Disable scrolling
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        
        return () => {
            // Restore original overflow values
            html.style.overflow = originalHtmlOverflow;
            body.style.overflow = originalBodyOverflow;
        };
    }, []);

    const handleDelete = (routePath: string) => {
        router.delete(routePath, {
            preserveScroll: true,
            onSuccess: (response: { props: { flash?: { success?: string } } }) => {
                const successMessage = response.props.flash?.success;
                if (successMessage) toast.success(successMessage);
                closeModal();
            },
            onError: (error: any) => {
                toast.error(error?.message || 'Unable to delete training.');
            },
        });
    };

    const handleRestore = (id: string | number) => {
        router.post(route('trainings.restore', id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                // Refresh with current filters, but switch to active view after restore
                triggerFetch({ search: searchTerm, perPage, show_deleted: false });
            },
            onError: (errors) => {
                console.error('Restore error:', errors);
                toast.error('Failed to restore training');
            },
        });
    };

    const handleForceDelete = (id: string | number) => {
        router.delete(route('trainings.force-delete', id), {
            preserveScroll: true,
            onSuccess: (response: { props: { flash?: { success?: string } } }) => {
                const successMessage = response.props.flash?.success;
                if (successMessage) toast.success(successMessage);
                // Keep current view (deleted) after force delete
                triggerFetch({ search: searchTerm, perPage, show_deleted: showDeleted });
            },
            onError: (errors) => {
                console.error('Force delete error:', errors);
                toast.error('Failed to permanently delete training');
            },
        });
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        // Prevent double submission - check if already processing
        if (processing) {
            return;
        }

        // Note: If requires_approval is true and request_type_id is empty,
        // the backend will auto-create a request type
        const isEdit = mode === 'edit' && !!selectedTraining;
        const routePath =
            isEdit && selectedTraining
                ? route('trainings.update', { training: selectedTraining.training_id })
                : route('trainings.store');

        setData('_method', isEdit ? 'PUT' : 'POST');

        post(routePath, {
            onSuccess: (response: { props: { flash?: { success?: string } } }) => {
                const successMessage = response.props.flash?.success;
                if (successMessage) toast.success(successMessage);
                closeModal();
            },
            onError: (error: any) => {
                toast.error(error?.message || 'Unable to save training.');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Trainings" />
            <CustomToast />

            <PageLayout
                title="Trainings"
                subtitle={showDeleted ? "Viewing deleted training programs. You can restore or permanently delete them." : "Manage training programs and track employee participation."}
                primaryAction={{
                    label: 'Add Training',
                    icon: <Plus className="h-4 w-4" />,
                    onClick: () => openModal('create'),
                    permission: hasPermission(permissions, 'create-training'),
                }}
                searchValue={searchTerm}
                onSearchChange={handleSearchChange}
                isSearching={isSearching}
                searchPlaceholder="Search trainings..."
                perPage={{
                    value: perPage,
                    onChange: handlePerPageChange,
                }}
                filtersSlot={null}
                actionsSlot={
                    <>
                        <div className="flex items-center gap-1">
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
                                    <DropdownMenuItem onClick={() => {
                                        const value = 'title-asc' as typeof sortKey;
                                        setSortKey(value);
                                        if (typeof window !== 'undefined') {
                                            localStorage.setItem('trainings_sortKey', value);
                                        }
                                        const sortParams = getSortParams(value);
                                        triggerFetch({ sort_by: sortParams.sort_by, sort_order: sortParams.sort_order, page: 1 });
                                    }}>A → Z</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                        const value = 'title-desc' as typeof sortKey;
                                        setSortKey(value);
                                        if (typeof window !== 'undefined') {
                                            localStorage.setItem('trainings_sortKey', value);
                                        }
                                        const sortParams = getSortParams(value);
                                        triggerFetch({ sort_by: sortParams.sort_by, sort_order: sortParams.sort_order, page: 1 });
                                    }}>Z → A</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                        const value = 'date-asc' as typeof sortKey;
                                        setSortKey(value);
                                        if (typeof window !== 'undefined') {
                                            localStorage.setItem('trainings_sortKey', value);
                                        }
                                        const sortParams = getSortParams(value);
                                        triggerFetch({ sort_by: sortParams.sort_by, sort_order: sortParams.sort_order, page: 1 });
                                    }}>Oldest First</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                        const value = 'date-desc' as typeof sortKey;
                                        setSortKey(value);
                                        if (typeof window !== 'undefined') {
                                            localStorage.setItem('trainings_sortKey', value);
                                        }
                                        const sortParams = getSortParams(value);
                                        triggerFetch({ sort_by: sortParams.sort_by, sort_order: sortParams.sort_order, page: 1 });
                                    }}>Newest First</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {(hasPermission(permissions, 'restore-training') || hasPermission(permissions, 'force-delete-training')) && (
                                <IconButton
                                    icon={showDeleted ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                    tooltip={showDeleted ? "Show Active" : "Show Deleted"}
                                    variant={showDeleted ? "default" : "outline"}
                                    onClick={() => {
                                        const newValue = !showDeleted;
                                        setShowDeleted(newValue);
                                        triggerFetch({ show_deleted: newValue, page: 1, perPage });
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
                            <span>Viewing deleted trainings</span>
                        </div>
                    </div>
                )}
                <EnterpriseEmployeeTable
                    columns={TrainingsTableConfig.columns}
                    actions={TrainingsTableConfig.actions}
                    data={tableData}
                    from={trainings.from}
                    onDelete={handleDelete}
                    onView={handleViewTraining}
                    onEdit={(training) => openModal('edit', training)}
                    onRestore={handleRestore}
                    onForceDelete={handleForceDelete}
                    resourceType="training"
                    enableExpand={false}
                    viewMode="table"
                />
            </PageLayout>

            {/* Training Modal */}
            <CustomModalForm
                addButtonWrapperClassName="hidden"
                addButton={TrainingsModalFormConfig.addButton}
                title={mode === 'view' ? 'View Training' : mode === 'edit' ? 'Update Training' : TrainingsModalFormConfig.title}
                description={TrainingsModalFormConfig.description}
                fields={TrainingsModalFormConfig.fields}
                buttons={TrainingsModalFormConfig.buttons}
                data={data}
                setData={(name: string, value: any) => {
                    if (name === 'organization_type') {
                        handleOrganizationTypeChange(value);
                    } else {
                        setData(name, value);
                    }
                }}
                errors={errors}
                processing={processing}
                handleSubmit={handleSubmit}
                open={modalOpen}
                onOpenChange={handleModalToggle}
                mode={mode}
                extraData={{
                    faculties: formOptions.faculties || [],
                    departments: filteredDepartments,
                    positions: filteredPositions,
                }}
            />

            {/* Training Detail Drawer */}
            {selectedTrainingForView && (
                <DetailDrawer
                    item={selectedTrainingForView}
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    fields={TrainingsModalFormConfig.fields}
                    titleKey="training_title"
                    subtitleKey="id"
                    subtitleLabel="Training ID"
                    extraData={{
                        faculties: formOptions.faculties?.map((f: any) => ({ id: f.id, name: f.name, label: f.name, value: f.id.toString() })) || [],
                        departments: formOptions.departments?.map((d: any) => ({ id: d.id, name: d.name, label: d.name, value: d.id.toString() })) || [],
                        positions: formOptions.positions?.map((p: any) => ({ id: p.id, name: p.name || p.pos_name, label: p.name || p.pos_name, value: p.id.toString() })) || [],
                        requestTypes: formOptions.requestTypes?.map((rt: any) => ({ id: rt.id, name: rt.name, label: rt.name, value: rt.id.toString() })) || []
                    }}
                />
            )}
        </AppLayout>
    );
}

