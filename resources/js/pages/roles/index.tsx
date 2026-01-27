import { CustomModalForm } from '@/components/custom-modal-form';
import { EnterpriseEmployeeTable } from '@/components/EnterpriseEmployeeTable';
import { CustomToast, toast } from '@/components/custom-toast';
import { PageLayout } from '@/components/page-layout';
import { IconButton } from '@/components/ui/icon-button';
import { RolesModalFormConfig } from '@/config/forms/roles-modal-form';
import { RolesTableConfig } from '@/config/tables/roles-table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowUpDown, Plus, Download } from 'lucide-react';
import { CompactPagination } from '@/components/CompactPagination';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DetailDrawer } from '@/components/DetailDrawer';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manage Roles',
        href: '/roles',
    },
];

interface LinkProps {
    active: boolean;
    label: string;
    url: string;
}

interface Role {
    id: number;
    name: string;
    description: string;
}

interface RolePagination {
    data: Role[];
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

interface FilterProps {
    search: string;
    perPage: string;
}

interface FlashProps extends Record<string, any> {
    flash?: {
        success?: string;
        error?: string;
    };
}

interface IndexProps {
    roles: RolePagination;
    filters?: FilterProps;
    totalCount: number;
    filteredCount: number;
}

export default function Index({ roles, filters }: IndexProps) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const flashMessage = flash?.success || flash?.error;
    const [modalOpen, setModalOpen] = useState(false);
    const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create');
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<any>(null);
    const { permissions } = usePage().props;
    const [sortKey, setSortKey] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('roles_sortKey');
            if (saved && ['name-asc', 'name-desc', 'date-asc', 'date-desc'].includes(saved)) {
                return saved as typeof sortKey;
            }
        }
        return 'name-asc';
    });
    const [searchTerm, setSearchTerm] = useState(filters?.search ?? '');
    const [perPage, setPerPage] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('roles_perPage');
            if (saved && ['5', '10', '25', '50', '100'].includes(saved)) {
                return saved;
            }
        }
        return String(filters?.perPage ?? 10);
    });
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const hasSyncedRef = useRef(false);

    const { data, setData, errors, processing, reset, post } = useForm<{
        label: string;
        description: string;
        permissions: string[];
        _method: string;
    }>({
        label: '',
        description: '',
        permissions: [],
        _method: 'POST',
    });

    // Handle Delete
    const handleDelete = (route: string) => {
        router.delete(route, {
            preserveScroll: true,
            onSuccess: (response: { props: FlashProps }) => {
                const flashProps = response.props.flash;
                if (flashProps?.error) {
                    toast.error(flashProps.error);
                    return;
                }
                if (flashProps?.success) {
                    toast.success(flashProps.success);
                }
                closeModal();
            },
            onError: (error: Record<string, string>) => {
                const errorMessage = error?.message;
                errorMessage && toast.error(errorMessage);
                closeModal();
            },
        });
    };

    // Handle Submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent double submission - check if already processing
        if (processing) {
            return;
        }

        // Edit mode
        if (mode === 'edit' && selectedCategory) {
            data._method = 'PUT';

            post(route('roles.update', selectedCategory.id), {
                forceFormData: true,
                onSuccess: (response: { props: FlashProps }) => {
                    const successMessage = response.props.flash?.success;
                    successMessage && toast.success(successMessage);
                    closeModal();
                },
                onError: (error: Record<string, string>) => {
                    const errorMessage = error?.message;
                    errorMessage && toast.error(errorMessage);
                },
            });
        } else {
            post(route('roles.store'), {
                onSuccess: (response: { props: FlashProps }) => {
                    const successMessage = response.props.flash?.success;
                    successMessage && toast.success(successMessage);
                    closeModal();
                },
                onError: (error: Record<string, string>) => {
                    const errorMessage = error?.message;
                    errorMessage && toast.error(errorMessage);
                },
            });
        }
    };

    // Closing modal
    const closeModal = () => {
        setMode('create');
        setSelectedCategory(null);
        reset();
        setModalOpen(false);
    };

    // Handle Modal Toggle
    const handleModalToggle = (open: boolean) => {
        setModalOpen(open);

        if (!open) {
            setMode('create');
            setSelectedCategory(null);
            reset();
        }
    };

    // Handle view role
    const handleViewRole = (row: any) => {
        setSelectedRole(row);
        setDrawerOpen(true);
    };

    // Open Modal (only for create/edit, not view)
    const openModal = (mode: 'create' | 'view' | 'edit', category?: any) => {
        // If view mode, use drawer instead
        if (mode === 'view') {
            handleViewRole(category);
            return;
        }

        setMode(mode);

        if (category) {
            Object.entries(category).forEach(([key, value]) => {
                if (key === 'permissions' && Array.isArray(value)) {
                    setData(
                        'permissions',
                        value.map((permission: any) => permission.name),
                    );
                } else {
                    setData(key as keyof typeof data, (value as string | null) ?? '');
                }
            });

            // Setting image preview
            setSelectedCategory(category);
        } else {
            reset();
        }

        setModalOpen(true);
    };

    const sortedData = [...roles.data].sort((a, b) => {
        if (sortKey === 'name-asc') {
            return (a.label || a.name).localeCompare(b.label || b.name);
        }
        if (sortKey === 'name-desc') {
            return (b.label || b.name).localeCompare(a.label || a.name);
        }
        if (sortKey === 'date-asc') {
            const dateA = new Date((a as any).created_at || 0).getTime();
            const dateB = new Date((b as any).created_at || 0).getTime();
            return dateA - dateB;
        }
        const dateA = new Date((a as any).created_at || 0).getTime();
        const dateB = new Date((b as any).created_at || 0).getTime();
        return dateB - dateA;
    });

    const tableData = sortedData;

    const triggerFetch = (params: Record<string, any>) => {
        router.get(route('roles.index'), params, {
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
            localStorage.setItem('roles_perPage', value);
        }
        triggerFetch({ search: searchTerm, perPage: value });
    };

    const handleSortKeyChange = (value: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc') => {
        setSortKey(value);
        if (typeof window !== 'undefined') {
            localStorage.setItem('roles_sortKey', value);
        }
    };

    // Pagination data - use root level properties (Laravel paginator structure)
    const from = roles?.from ?? 0;
    const to = roles?.to ?? 0;
    const total = roles?.total ?? 0;
    const currentPage = roles?.meta?.current_page || (from > 0 ? Math.floor((from - 1) / (parseInt(perPage) || 10)) + 1 : 1);
    const lastPage = roles?.meta?.last_page || (total > 0 ? Math.ceil(total / (parseInt(perPage) || 10)) : 1);

    const handlePageChange = (page: number) => {
        // Ensure page is a valid positive number
        const validPage = Math.max(1, Math.min(page, lastPage || 1));
        triggerFetch({ page: validPage, search: searchTerm, perPage });
    };

    // Export to CSV function
    const exportToCSV = useCallback(() => {
        const columns = RolesTableConfig.columns.filter(col => !col.isAction && !col.alwaysVisible);
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
        link.setAttribute('download', `roles_${new Date().toISOString().split('T')[0]}.csv`);
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
        
        const savedPerPage = typeof window !== 'undefined' ? localStorage.getItem('roles_perPage') : null;
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
            <Head title="Roles" />

            <CustomToast />

            <PageLayout
                title="Roles"
                subtitle="Create and manage user roles with assigned permissions."
                primaryAction={{
                    label: 'Add Role',
                    icon: <Plus className="h-4 w-4" />,
                    onClick: () => openModal('create'),
                    permission: true,
                }}
                searchValue={searchTerm}
                onSearchChange={handleSearchChange}
                isSearching={isSearching}
                searchPlaceholder="Search roles..."
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
                                    <DropdownMenuItem onClick={() => handleSortKeyChange('name-asc')}>A → Z</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSortKeyChange('name-desc')}>Z → A</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSortKeyChange('date-asc')}>Oldest First</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSortKeyChange('date-desc')}>Newest First</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
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
                <EnterpriseEmployeeTable
                    columns={RolesTableConfig.columns}
                    actions={RolesTableConfig.actions}
                    data={tableData}
                    from={roles.from}
                    onDelete={handleDelete}
                    onView={handleViewRole}
                    onEdit={(category) => openModal('edit', category)}
                    resourceType="role"
                    enableExpand={false}
                    viewMode="table"
                />
            </PageLayout>

            {/* Role Modal */}
            <CustomModalForm
                addButtonWrapperClassName="hidden"
                addButton={{
                    ...RolesModalFormConfig.addButton,
                    label: '',
                    className: 'h-9 w-9 p-0',
                }}
                title={mode === 'view' ? 'View Role' : mode === 'edit' ? 'Update Role' : RolesModalFormConfig.title}
                description={RolesModalFormConfig.description}
                fields={RolesModalFormConfig.fields}
                buttons={RolesModalFormConfig.buttons}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                handleSubmit={handleSubmit}
                open={modalOpen}
                onOpenChange={handleModalToggle}
                mode={mode}
                extraData={permissions}
            />

            {/* Role Detail Drawer */}
            {selectedRole && (
                <DetailDrawer
                    item={selectedRole}
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    fields={RolesModalFormConfig.fields}
                    titleKey="label"
                    subtitleKey="id"
                    subtitleLabel="Role ID"
                    extraData={permissions}
                />
            )}
        </AppLayout>
    );
}
