import { CustomModalForm } from '@/components/custom-modal-form';
import { EnterpriseEmployeeTable } from '@/components/EnterpriseEmployeeTable';
import { CustomToast, toast } from '@/components/custom-toast';
import { PageHeader } from '@/components/page-header';
import { IconButton } from '@/components/ui/icon-button';
import { UsersModalFormConfig } from '@/config/forms/users-modal-form';
import { UsersTableConfig } from '@/config/tables/users-table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Archive, ArchiveRestore, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { hasPermission } from '@/utils/authorization';
import { DetailDrawer } from '@/components/DetailDrawer';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manage Users',
        href: '/users',
    },
];

interface LinkProps {
    active: boolean;
    label: string;
    url: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    employee_id?: string;
    roles: { id: number; name: string }[];
}

interface UserPagination {
    data: User[];
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
    show_deleted?: boolean;
}

interface FlashProps extends Record<string, any> {
    flash?: {
        success?: string;
        error?: string;
    };
}

interface IndexProps {
    users: UserPagination;
    filters: FilterProps;
    totalCount: number;
    filteredCount: number;
    roles?: { id: number; name: string }[];
    employees?: { id: string; label: string; value: string }[];
}

export default function Index({ users, filters }: IndexProps) {
    const { flash, roles = [], auth } = usePage<{
        flash?: { success?: string; error?: string };
        roles?: { id: number; name: string }[];
        auth?: { permissions?: string[] };
    }>().props;
    const permissions = auth?.permissions || [];
    const flashMessage = flash?.success || flash?.error;
    const [modalOpen, setModalOpen] = useState(false);
    const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create');
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [sortKey, setSortKey] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('users_sortKey');
            if (saved && ['name-asc', 'name-desc', 'date-asc', 'date-desc'].includes(saved)) {
                return saved as typeof sortKey;
            }
        }
        return 'name-asc';
    });
    const [searchTerm, setSearchTerm] = useState(filters?.search ?? '');
    const [perPage, setPerPage] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('users_perPage');
            if (saved && ['5', '10', '25', '50', '100'].includes(saved)) {
                return saved;
            }
        }
        return String(filters?.perPage ?? 10);
    });
    const [showDeleted, setShowDeleted] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('users_filter_show_deleted');
            if (saved === 'true') return true;
            if (saved === 'false') return false;
        }
        return filters?.show_deleted || false;
    });
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const hasSyncedRef = useRef(false);
    const { data, setData, errors, processing, reset, post } = useForm<{
        name: string;
        email: string;
        employee_id: string;
        password: string;
        confirm_password: string;
        roles: string[];
        _method: string;
    }>({
        name: '',
        email: '',
        employee_id: '',
        password: '',
        confirm_password: '',
        roles: [],
        _method: 'POST',
    });

    // Handle Delete/Deactivate
    const handleDelete = (route: string) => {
        // Confirmation is handled in EnterpriseEmployeeTable component
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

        // Prevent double submission - check if already processing
        if (processing) {
            return;
        }

        // Debug: Log form data before submission
        console.log('Submitting user form:', {
            mode,
            data,
            roles: data.roles,
            rolesType: typeof data.roles,
            rolesIsArray: Array.isArray(data.roles),
        });

        // Edit mode
        if (mode === 'edit' && selectedCategory) {
            data._method = 'PUT';

            post(route('users.update', selectedCategory.id), {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: (response: { props: FlashProps }) => {
                    const successMessage = response.props.flash?.success;
                    successMessage && toast.success(successMessage);
                    // Re-fetch with current pagination/filter settings to keep row count
                    triggerFetch({ perPage });
                    closeModal();
                    // Restore pointer events - let React/Radix handle DOM cleanup
                    setTimeout(() => {
                        document.body.style.pointerEvents = '';
                        document.documentElement.style.pointerEvents = '';
                        document.body.style.overflow = '';
                    }, 100);
                },
                onError: (errors: Record<string, string | string[]>) => {
                    // Keep modal open on error so user can fix issues
                    // Show first validation error or generic message
                    const firstError = Object.values(errors)[0];
                    if (firstError) {
                        const errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
                        toast.error(errorMessage);
                    } else if (errors?.message) {
                        toast.error(errors.message);
                    } else {
                        toast.error('Please check the form for errors.');
                    }
                },
            });
        } else {
            // Create mode
            post(route('users.store'), {
                preserveScroll: true,
                onSuccess: (response: { props: FlashProps }) => {
                    const successMessage = response.props.flash?.success;
                    successMessage && toast.success(successMessage);
                    closeModal();
                    // Restore pointer events - let React/Radix handle DOM cleanup
                    setTimeout(() => {
                        document.body.style.pointerEvents = '';
                        document.documentElement.style.pointerEvents = '';
                        document.body.style.overflow = '';
                    }, 100);
                },
                onError: (errors: Record<string, string | string[]>) => {
                    // Keep modal open on error so user can fix issues
                    // Show first validation error or generic message
                    const firstError = Object.values(errors)[0];
                    if (firstError) {
                        const errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
                        toast.error(errorMessage);
                    } else if (errors?.message) {
                        toast.error(errors.message);
                    } else {
                        toast.error('Please check the form for errors.');
                    }
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
        
        // Restore pointer events - let React/Radix handle DOM cleanup
        setTimeout(() => {
            document.body.style.pointerEvents = '';
            document.documentElement.style.pointerEvents = '';
            document.body.style.overflow = '';
        }, 100);
    };
    
    // Cleanup effect when modal closes
    useEffect(() => {
        if (!modalOpen) {
            // Restore pointer events when modal closes - let React/Radix handle DOM cleanup
            const cleanup = setTimeout(() => {
                document.body.style.pointerEvents = '';
                document.documentElement.style.pointerEvents = '';
                document.body.style.overflow = '';
            }, 200);
            
            return () => clearTimeout(cleanup);
        }
    }, [modalOpen]);

    // Handle Modal Toggle
    const handleModalToggle = (open: boolean) => {
        if (open) {
            // When opening, initialize form for create mode
            openModal('create');
        } else {
            // When closing, clean up
            closeModal();
        }
    };

    // Handle view user
    const handleViewUser = (row: any) => {
        setSelectedUser(row);
        setDrawerOpen(true);
    };

    // Open Modal (only for create/edit, not view)
    const openModal = (mode: 'create' | 'view' | 'edit', category?: any) => {
        // If view mode, use drawer instead
        if (mode === 'view') {
            handleViewUser(category);
            return;
        }

        setMode(mode);

        if (category) {
            // Edit mode - populate form with existing data
            Object.entries(category).forEach(([key, value]) => {
                if (key === 'roles' && Array.isArray(value)) {
                    setData('roles', value.map((r) => r.id.toString())); // ✅ fix: use r.id not r.name
                } else if (key === 'employee_id') {
                    setData('employee_id', (value as string | null) ?? '');
                } else {
                    setData(key as keyof typeof data, (value as string | null) ?? '');
                }
            });

            // Setting image preview
            setSelectedCategory(category);
        } else {
            // Create mode - reset form and set defaults
            reset();
            setData({
                name: '',
                email: '',
                employee_id: '',
                password: '',
                confirm_password: '',
                roles: [],
                _method: 'POST',
            });
            setSelectedCategory(null);
        }

        setModalOpen(true);
    };

    const sortedData = [...users.data].sort((a, b) => {
        if (sortKey === 'name-asc') {
            return a.name.localeCompare(b.name);
        }
        if (sortKey === 'name-desc') {
            return b.name.localeCompare(a.name);
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

    const triggerFetch = (params: Record<string, any> = {}) => {
        const allParams = {
            search: searchTerm,
            perPage,
            show_deleted: showDeleted,
            ...params,
        };
        router.get(route('users.index'), allParams, {
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
            localStorage.setItem('users_perPage', value);
        }
        triggerFetch({ perPage: value });
    };

    const updateShowDeleted = (value: boolean) => {
        setShowDeleted(value);
        if (typeof window !== 'undefined') {
            localStorage.setItem('users_filter_show_deleted', String(value));
        }
    };

    const handleRestore = (id: string | number) => {
        router.post(route('users.restore', id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                triggerFetch({});
            },
            onError: () => toast.error('Failed to restore user'),
        });
    };

    const handleForceDelete = (id: string | number) => {
        router.delete(route('users.force-delete', id), {
            preserveScroll: true,
            onSuccess: (response: { props: { flash?: { success?: string } } }) => {
                // Show toast from flash message if available
                const successMessage = response.props.flash?.success;
                if (successMessage) {
                    toast.success(successMessage);
                }
                triggerFetch({});
            },
            onError: () => toast.error('Failed to permanently delete user'),
        });
    };

    const handleSortKeyChange = (value: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc') => {
        setSortKey(value);
        if (typeof window !== 'undefined') {
            localStorage.setItem('users_sortKey', value);
        }
    };

    // Pagination data - use root level properties (Laravel paginator structure)
    const from = users?.from ?? 0;
    const to = users?.to ?? 0;
    const total = users?.total ?? 0;
    const currentPage = users?.meta?.current_page || (from > 0 ? Math.floor((from - 1) / (parseInt(perPage) || 10)) + 1 : 1);
    const lastPage = users?.meta?.last_page || (total > 0 ? Math.ceil(total / (parseInt(perPage) || 10)) : 1);

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
        
        const savedPerPage = typeof window !== 'undefined' ? localStorage.getItem('users_perPage') : null;
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
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users" />

            <CustomToast />

            <div className="flex flex-col overflow-hidden bg-background rounded-xl" style={{ height: 'calc(100vh - 80px)' }}>
                <PageHeader
                    title="Users"
                    subtitle="Manage user accounts and assign roles."
                    searchValue={searchTerm}
                    onSearchChange={handleSearchChange}
                    isSearching={isSearching}
                    searchPlaceholder="Search users..."
                    filtersSlot={
                        <>
                            {/* Per Page */}
                            <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                                <span className="whitespace-nowrap">Rows:</span>
                                <Select value={perPage} onValueChange={handlePerPageChange}>
                                    <SelectTrigger className="h-9 w-[70px]">
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
                        </>
                    }
                    actionsSlot={
                        <>
                            {/* Sort Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <IconButton
                                        icon={<ArrowUpDown className="h-4 w-4" />}
                                        tooltip="Sort"
                                        variant="outline"
                                        aria-label="Sort"
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
                            {(hasPermission(permissions, 'restore-user') || hasPermission(permissions, 'force-delete-user')) && (
                                <IconButton
                                    icon={showDeleted ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                    tooltip={showDeleted ? "Show Active" : "Show Deleted"}
                                    variant={showDeleted ? "default" : "outline"}
                                    onClick={() => {
                                        const newValue = !showDeleted;
                                        updateShowDeleted(newValue);
                                        triggerFetch({ show_deleted: newValue, page: 1, perPage });
                                    }}
                                    aria-label={showDeleted ? "Show Active" : "Show Deleted"}
                                />
                            )}

                            {/* Add Button */}
                            <CustomModalForm
                                addButtonWrapperClassName="flex mb-0"
                                addButton={{
                                    ...UsersModalFormConfig.addButton,
                                    label: '',
                                    className: 'h-9 w-9 p-0',
                                }}
                                    title={mode === 'view' ? 'View User' : mode === 'edit' ? 'Update User' : UsersModalFormConfig.title}
                                    description={UsersModalFormConfig.description}
                                    fields={UsersModalFormConfig.fields}
                                    buttons={UsersModalFormConfig.buttons}
                                    data={data}
                                    setData={setData}
                                    errors={errors}
                                    processing={processing}
                                    handleSubmit={handleSubmit}
                                    open={modalOpen}
                                    onOpenChange={handleModalToggle}
                                    mode={mode}
                                    extraData={{
                                        roles: roles?.map((role) => ({
                                            label: role.name,
                                            value: role.id.toString(),
                                            key: role.id.toString(),
                                        })),
                                    }}
                                />
                        </>
                    }
                />

                <div className="flex-1 min-h-0 bg-background p-2 sm:p-4 overflow-y-auto">
                    <EnterpriseEmployeeTable
                        columns={UsersTableConfig.columns}
                        actions={UsersTableConfig.actions}
                        data={tableData}
                        from={users.from}
                        onDelete={handleDelete}
                        onView={handleViewUser}
                        onEdit={(category) => openModal('edit', category)}
                        onRestore={handleRestore}
                        onForceDelete={handleForceDelete}
                        resourceType="user"
                        enableExpand={false}
                        viewMode="table"
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
                            <span className="font-semibold text-foreground">{total || 0}</span> users
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

            {/* User Detail Drawer */}
            {selectedUser && (
                <DetailDrawer
                    item={selectedUser}
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    fields={UsersModalFormConfig.fields}
                    titleKey="name"
                    subtitleKey="id"
                    subtitleLabel="User ID"
                    extraData={{ roles: roles.map((r) => ({ id: r.id, name: r.name, label: r.name, value: r.id.toString() })) }}
                />
            )}
        </AppLayout>
    );
}
