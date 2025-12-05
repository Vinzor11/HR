import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TablePagination } from '@/components/ui/pagination';
import { TableToolbar } from '@/components/table-toolbar';
import { CustomToast, toast } from '@/components/custom-toast';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { router, Head, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { hasPermission } from '@/utils/authorization';
import { ListChecks, Plus, Settings2 } from 'lucide-react';

interface RequestTypeItem {
    id: number;
    name: string;
    description?: string | null;
    has_fulfillment: boolean;
    is_published: boolean;
    approval_steps?: Array<Record<string, unknown>>;
    fields_count: number;
    pending_submissions_count: number;
    updated_at: string;
    created_at: string;
}

interface Paginated<T> {
    data: T[];
    links: Array<{ label: string; url: string | null; active: boolean }>;
    from: number;
    to: number;
    total: number;
}

interface RequestTypeIndexProps {
    requestTypes: Paginated<RequestTypeItem>;
    filters: {
        search?: string;
        status?: string;
        perPage?: number;
    };
    metrics: {
        total: number;
        published: number;
        drafts: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dynamic Request Builder',
        href: '/request-types',
    },
];

const statusOptions = [
    { value: 'all', label: 'All types' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Drafts' },
];

export default function RequestTypesIndex({ requestTypes, filters, metrics }: RequestTypeIndexProps) {
    const { auth } = usePage<{ auth?: { permissions?: string[] } }>().props;
    const permissions = auth?.permissions || [];
    
    const [searchTerm, setSearchTerm] = useState(filters?.search ?? '');
    const [perPage, setPerPage] = useState(String(filters?.perPage ?? 10));
    const [status, setStatus] = useState(filters?.status ?? 'all');
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    const triggerFetch = (params: Record<string, unknown>) => {
        router.get(
            route('request-types.index'),
            {
                search: searchTerm,
                status,
                perPage,
                ...params,
            },
            {
                preserveState: true,
                replace: true,
                preserveScroll: true,
                onStart: () => setIsSearching(true),
                onFinish: () => setIsSearching(false),
            },
        );
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
        triggerFetch({ perPage: value });
    };

    const handleStatusChange = (value: string) => {
        setStatus(value);
        triggerFetch({ status: value });
    };

    const handleTogglePublish = (type: RequestTypeItem) => {
        router.post(
            route('request-types.publish', type.id),
            { is_published: !type.is_published },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Request type ${!type.is_published ? 'published' : 'unpublished'} successfully.`);
                },
                onError: () => toast.error('Unable to update publish status.'),
            },
        );
    };

    const handleDelete = (type: RequestTypeItem) => {
        if (!confirm(`Delete ${type.name}? This cannot be undone.`)) {
            return;
        }

        router.delete(route('request-types.destroy', type.id), {
            preserveScroll: true,
            onSuccess: () => toast.success('Request type deleted.'),
            onError: () => toast.error('Unable to delete request type.'),
        });
    };

    useEffect(() => {
        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, []);

    const approvalsCount = (type: RequestTypeItem) => (Array.isArray(type.approval_steps) ? type.approval_steps.length : 0);

    const statusBadge = (type: RequestTypeItem) => {
        if (type.is_published) {
            return <Badge className="bg-emerald-100 text-emerald-700">Published</Badge>;
        }

        return <Badge variant="outline">Draft</Badge>;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dynamic Request Builder" />
            <CustomToast />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="space-y-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">Dynamic Request Builder</h1>
                        <p className="text-sm text-muted-foreground">
                            Create custom HR request types, approval workflows, and fulfillment phases without writing code.
                        </p>
                    </div>

                    {hasPermission(permissions, 'create-request-type') && (
                        <Button onClick={() => router.get(route('request-types.create'))}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Request Type
                        </Button>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Active Types</p>
                        <p className="mt-2 text-3xl font-semibold text-foreground">{metrics.total}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Published</p>
                        <p className="mt-2 text-3xl font-semibold text-emerald-600 dark:text-emerald-400">{metrics.published}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Drafts</p>
                        <p className="mt-2 text-3xl font-semibold text-amber-600 dark:text-amber-400">{metrics.drafts}</p>
                    </Card>
                </div>

                <Card className="p-4 space-y-4">
                    <TableToolbar
                        searchValue={searchTerm}
                        onSearchChange={handleSearchChange}
                        perPage={perPage}
                        onPerPageChange={handlePerPageChange}
                        isSearching={isSearching}
                        actionSlot={
                            <select
                                className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                                value={status}
                                onChange={(event) => handleStatusChange(event.target.value)}
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        }
                    />

                    <div className="space-y-4">
                        {requestTypes.data.length === 0 && (
                            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                                No request types found. Click &ldquo;New Request Type&rdquo; to start building your first one.
                            </div>
                        )}

                        {requestTypes.data.map((type) => (
                            <div key={type.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold text-foreground">{type.name}</h3>
                                            {statusBadge(type)}
                                        </div>
                                        {type.description && <p className="mt-1 text-sm text-muted-foreground">{type.description}</p>}
                                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                                            <span>{type.fields_count} fields</span>
                                            <span>{approvalsCount(type)} approval steps</span>
                                            <span>{type.has_fulfillment ? 'Includes fulfillment phase' : 'No fulfillment required'}</span>
                                        </div>
                                    </div>

                                    <div className="text-sm text-muted-foreground">
                                        <p>Updated {new Date(type.updated_at).toLocaleString()}</p>
                                        <p className="mt-1">Pending approvals: {type.pending_submissions_count}</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <ListChecks className="h-4 w-4" />
                                        <span>
                                            {type.is_published
                                                ? 'Published for employees/faculty'
                                                : 'Draft mode – not visible to employees yet'}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {hasPermission(permissions, 'edit-request-type') && (
                                            <Button variant="outline" size="sm" onClick={() => router.get(route('request-types.edit', type.id))}>
                                                <Settings2 className="mr-2 h-4 w-4" />
                                                Edit Builder
                                            </Button>
                                        )}
                                        {hasPermission(permissions, 'access-request-types-module') && (
                                            <Button
                                                variant={type.is_published ? 'secondary' : 'default'}
                                                size="sm"
                                                onClick={() => handleTogglePublish(type)}
                                            >
                                                {type.is_published ? 'Unpublish' : 'Publish'}
                                            </Button>
                                        )}
                                        {hasPermission(permissions, 'delete-request-type') && (
                                            <Button variant="destructive" size="sm" onClick={() => handleDelete(type)}>
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {requestTypes.links && requestTypes.links.length > 0 && (
                        <TablePagination meta={{ links: requestTypes.links, from: requestTypes.from, to: requestTypes.to, total: requestTypes.total }} />
                    )}
                </Card>
                </div>
            </div>
        </AppLayout>
    );
}

