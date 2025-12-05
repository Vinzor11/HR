import { CustomModalForm } from '@/components/custom-modal-form';
import { EnterpriseEmployeeTable } from '@/components/EnterpriseEmployeeTable';
import { CustomToast, toast } from '@/components/custom-toast';
import { TableToolbar } from '@/components/table-toolbar';
import { PermissionModalFormConfig } from '@/config/forms/permission-modal-form';
import { PermissionsTableConfig } from '@/config/tables/permissions-table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DetailDrawer } from '@/components/DetailDrawer';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manage Permissions',
        href: '/permissions',
    },
];

interface LinkProps {
    active: boolean;
    label: string;
    url: string;
}

interface Permission {
    id: number;
    name: string;
    label: string;
    description: string;
    module: string;
}

interface PermissionPagination {
    data: Permission[];
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
    permissions: PermissionPagination;
    filters?: FilterProps;
    totalCount: number;
    filteredCount: number;
}

export default function Index({ permissions, filters }: IndexProps) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const flashMessage = flash?.success || flash?.error;
    const [modalOpen, setModalOpen] = useState(false);
    const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create');
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedPermission, setSelectedPermission] = useState<any>(null);
    const [sortKey, setSortKey] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('permissions_sortKey');
            if (saved && ['name-asc', 'name-desc', 'date-asc', 'date-desc'].includes(saved)) {
                return saved as typeof sortKey;
            }
        }
        return 'name-asc';
    });
    const [searchTerm, setSearchTerm] = useState(filters?.search ?? '');
    const [perPage, setPerPage] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('permissions_perPage');
            if (saved && ['5', '10', '25', '50', '100'].includes(saved)) {
                return saved;
            }
        }
        return String(filters?.perPage ?? 10);
    });
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const hasSyncedRef = useRef(false);

    const { data, setData, errors, processing, reset, post } = useForm({
        module: '',
        label: '',
        description: '',
        _method: 'POST',
    });

    // Handle Delete
    const handleDelete = (route: string) => {
        router.delete(route, {
            preserveScroll: true,
            onSuccess: (response: { props: FlashProps }) => {
                const successMessage = response.props.flash?.success;
                successMessage && toast.success(successMessage);
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

        // Edit mode
        if (mode === 'edit' && selectedCategory) {
            data._method = 'PUT';

            post(route('permissions.update', selectedCategory.id), {
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
            post(route('permissions.store'), {
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

    // Handle view permission
    const handleViewPermission = (row: any) => {
        setSelectedPermission(row);
        setDrawerOpen(true);
    };

    // Open Modal (only for create/edit, not view)
    const openModal = (mode: 'create' | 'view' | 'edit', category?: any) => {
        // If view mode, use drawer instead
        if (mode === 'view') {
            handleViewPermission(category);
            return;
        }

        setMode(mode);

        if (category) {
            Object.entries(category).forEach(([key, value]) => {
                if (key !== 'image') {
                    setData(key as keyof typeof data, value as string | null);
                }
            });

            // Setting image preview
            setSelectedCategory(category);
        } else {
            reset();
        }

        setModalOpen(true);
    };

    const sortedData = [...permissions.data].sort((a, b) => {
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
        router.get(route('permissions.index'), params, {
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
            localStorage.setItem('permissions_perPage', value);
        }
        triggerFetch({ search: searchTerm, perPage: value });
    };

    const handleSortKeyChange = (value: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc') => {
        setSortKey(value);
        if (typeof window !== 'undefined') {
            localStorage.setItem('permissions_sortKey', value);
        }
    };

    // Pagination data - use root level properties (Laravel paginator structure)
    const from = permissions?.from ?? 0;
    const to = permissions?.to ?? 0;
    const total = permissions?.total ?? 0;
    const currentPage = permissions?.meta?.current_page || (from > 0 ? Math.floor((from - 1) / (parseInt(perPage) || 10)) + 1 : 1);
    const lastPage = permissions?.meta?.last_page || (total > 0 ? Math.ceil(total / (parseInt(perPage) || 10)) : 1);

    const handlePageChange = (page: number) => {
        // Ensure page is a valid positive number
        const validPage = Math.max(1, Math.min(page, lastPage || 1));
        triggerFetch({ page: validPage, search: searchTerm, perPage });
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
        
        const savedPerPage = typeof window !== 'undefined' ? localStorage.getItem('permissions_perPage') : null;
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
            <Head title="Permissions" />

            <CustomToast />

            <div className="flex flex-col overflow-hidden bg-background rounded-xl" style={{ height: 'calc(100vh - 80px)' }}>
                <div className="flex-shrink-0 border-b border-border bg-card px-4 py-2 shadow-sm">
                    <TableToolbar
                        searchValue={searchTerm}
                        onSearchChange={handleSearchChange}
                        perPage={perPage}
                        onPerPageChange={handlePerPageChange}
                        isSearching={isSearching}
                        actionSlot={
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
                                <div className="flex items-center gap-2">
                                    {/* Sort by icon button */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-9 gap-2">
                                                <ArrowUpDown className="h-4 w-4" />
                                                <span className="hidden sm:inline">Sort</span>
                                            </Button>
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

                                    {/* Rows selector */}
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <span className="whitespace-nowrap">Rows:</span>
                                        <Select value={perPage} onValueChange={handlePerPageChange}>
                                            <SelectTrigger className="h-9 w-[80px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {['5', '10', '25', '50', '100'].map((option) => (
                                                    <SelectItem key={option} value={option}>
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <CustomModalForm
                                    addButton={PermissionModalFormConfig.addButton}
                                    title={mode === 'view' ? 'View Permission' : mode === 'edit' ? 'Update Permission' : PermissionModalFormConfig.title}
                                    description={PermissionModalFormConfig.description}
                                    fields={PermissionModalFormConfig.fields}
                                    buttons={PermissionModalFormConfig.buttons}
                                    data={data}
                                    setData={setData}
                                    errors={errors}
                                    processing={processing}
                                    handleSubmit={handleSubmit}
                                    open={modalOpen}
                                    onOpenChange={handleModalToggle}
                                    mode={mode}
                                />
                            </div>
                        }
                    />
                </div>

                <div className="flex-1 min-h-0 bg-background p-4 overflow-y-auto">
                    <EnterpriseEmployeeTable
                        columns={PermissionsTableConfig.columns}
                        actions={PermissionsTableConfig.actions}
                        data={tableData}
                        from={permissions.from}
                        onDelete={handleDelete}
                        onView={handleViewPermission}
                        onEdit={(category) => openModal('edit', category)}
                        resourceType="permission"
                        enableExpand={false}
                        viewMode="table"
                    />
                </div>

                {/* Pagination - Fixed at bottom of viewport */}
                <div className="flex-shrink-0 bg-card border-t border-border shadow-sm z-30">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3">
                        {/* Results Info */}
                        <div className="text-sm text-muted-foreground">
                            Showing <span className="font-semibold text-foreground">{from || 0}</span> to{' '}
                            <span className="font-semibold text-foreground">{to || 0}</span> of{' '}
                            <span className="font-semibold text-foreground">{total || 0}</span> permissions
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="h-9 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                            </Button>

                            <div className="flex items-center gap-1">
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

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === lastPage || lastPage === 0}
                                className="h-9 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Permission Detail Drawer */}
            {selectedPermission && (
                <DetailDrawer
                    item={selectedPermission}
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    fields={PermissionModalFormConfig.fields}
                    titleKey="label"
                    subtitleKey="id"
                    subtitleLabel="Permission ID"
                />
            )}
        </AppLayout>
    );
}
