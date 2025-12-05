import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableToolbar } from '@/components/table-toolbar';
import { CustomToast, toast } from '@/components/custom-toast';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { router, Head, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Plus, FileText, Edit, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CertificateTextLayer {
    id: number;
    name: string;
    field_key?: string | null;
    default_text?: string | null;
    x_position: number;
    y_position: number;
    font_size: number;
}

interface CertificateTemplate {
    id: number;
    name: string;
    description?: string | null;
    background_image_path?: string | null;
    width: number;
    height: number;
    is_active: boolean;
    text_layers?: CertificateTextLayer[];
    created_at: string;
    updated_at: string;
}

interface Paginated<T> {
    data: T[];
    links: Array<{ label: string; url: string | null; active: boolean }>;
    from: number;
    to: number;
    total: number;
}

interface CertificateTemplateIndexProps {
    templates: Paginated<CertificateTemplate>;
    filters: {
        search?: string;
        perPage?: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Certificate Templates',
        href: '/certificate-templates',
    },
];

export default function CertificateTemplateIndex({ templates, filters }: CertificateTemplateIndexProps) {
    const { flash } = usePage().props as any;
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [perPage, setPerPage] = useState(String(filters?.perPage || 10));
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    useEffect(() => {
        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, []);

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

    const triggerFetch = (params: Record<string, any> = {}) => {
        router.get('/certificate-templates', {
            search: searchTerm,
            perPage,
            ...params,
        }, {
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
        triggerFetch({ perPage: value });
    };

    const handleDelete = (template: CertificateTemplate) => {
        if (confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
            router.delete(`/certificate-templates/${template.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    triggerFetch({});
                },
                onError: () => {
                    toast.error('Failed to delete certificate template.');
                },
            });
        }
    };

    const from = templates?.from || 0;
    const to = templates?.to || 0;
    const total = templates?.total || 0;
    const currentPage = templates.links?.findIndex(link => link.active) !== -1 
        ? templates.links.findIndex(link => link.active) + 1 
        : 1;
    const lastPage = templates.links?.length > 0 
        ? templates.links.filter(link => link.url !== null).length 
        : 1;

    const handlePageChange = (page: number) => {
        const link = templates.links?.[page - 1];
        if (link?.url) {
            router.visit(link.url, {
                preserveState: true,
                preserveScroll: false,
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Certificate Templates" />
            <CustomToast />

            <div className="flex flex-col overflow-hidden bg-background rounded-xl" style={{ height: 'calc(100vh - 80px)' }}>
                <div className="flex-shrink-0 border-b border-border bg-card px-4 py-2 shadow-sm">
                    <TableToolbar
                        searchValue={searchTerm}
                        onSearchChange={handleSearchChange}
                        placeholder="Search templates..."
                        perPage={perPage}
                        onPerPageChange={handlePerPageChange}
                        isSearching={isSearching}
                        actionSlot={
                            <div className="flex flex-row flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
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

                                <Button onClick={() => router.visit('/certificate-templates/create')} size="sm" className="h-9">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Template
                                </Button>
                            </div>
                        }
                    />
                </div>

                <div className="flex-1 min-h-0 bg-background p-4 overflow-y-auto">
                    {templates.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No templates found</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Get started by creating a new certificate template.
                            </p>
                            <Button
                                className="mt-4"
                                onClick={() => router.visit('/certificate-templates/create')}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create Template
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Dimensions</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Text Layers</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.data.map((template) => (
                                        <tr key={template.id} className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{template.name}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {template.description || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {template.width} × {template.height}px
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {template.text_layers?.length || 0} layers
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                                    {template.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => router.visit(`/certificate-templates/${template.id}`)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => router.visit(`/certificate-templates/${template.id}/edit`)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(template)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {templates.data.length > 0 && templates.links && templates.links.length > 0 && (
                    <div className="flex-shrink-0 bg-card border-t border-border shadow-sm z-30">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3">
                            <div className="text-sm text-muted-foreground">
                                Showing <span className="font-semibold text-foreground">{from || 0}</span> to{' '}
                                <span className="font-semibold text-foreground">{to || 0}</span> of{' '}
                                <span className="font-semibold text-foreground">{total || 0}</span> templates
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const prevLink = templates.links?.find((link, index) => 
                                            index < currentPage - 1 && link.url !== null
                                        );
                                        if (prevLink?.url) {
                                            router.visit(prevLink.url, { preserveState: true, preserveScroll: false });
                                        }
                                    }}
                                    disabled={currentPage === 1}
                                    className="h-9 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <div className="flex items-center gap-1">
                                    {templates.links?.map((link, index) => {
                                        if (link.label === '...' || !link.url) {
                                            return <span key={index} className="px-1 text-muted-foreground">...</span>;
                                        }
                                        const pageNum = index + 1;
                                        return (
                                            <Button
                                                key={index}
                                                variant={link.active ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => link.url && router.visit(link.url, { preserveState: true, preserveScroll: false })}
                                                className="h-9 px-3"
                                            >
                                                {link.label}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const nextLink = templates.links?.find((link, index) => 
                                            index > currentPage - 1 && link.url !== null
                                        );
                                        if (nextLink?.url) {
                                            router.visit(nextLink.url, { preserveState: true, preserveScroll: false });
                                        }
                                    }}
                                    disabled={currentPage >= lastPage}
                                    className="h-9 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

