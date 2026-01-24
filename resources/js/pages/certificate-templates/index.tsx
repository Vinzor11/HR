import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageLayout } from '@/components/page-layout';
import { CustomToast, toast } from '@/components/custom-toast';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { router, Head, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Plus, FileText, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
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

            <PageLayout
                title="Certificate Templates"
                subtitle="Create and manage certificate templates with customizable layouts."
                primaryAction={{
                    label: 'Create Template',
                    icon: <Plus className="h-4 w-4" />,
                    onClick: () => router.visit('/certificate-templates/create'),
                    permission: true,
                }}
                searchValue={searchTerm}
                onSearchChange={handleSearchChange}
                isSearching={isSearching}
                searchPlaceholder="Search templates..."
                perPage={{
                    value: perPage,
                    onChange: handlePerPageChange,
                }}
                filtersSlot={null}
                actionsSlot={null}
                pagination={
                    templates.data.length > 0 && templates.links && templates.links.length > 0 ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3">
                            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                                <span className="hidden sm:inline">
                                    Showing <span className="font-semibold text-foreground">{from || 0}</span> to{' '}
                                    <span className="font-semibold text-foreground">{to || 0}</span> of{' '}
                                    <span className="font-semibold text-foreground">{total || 0}</span> templates
                                </span>
                                <span className="sm:hidden">
                                    <span className="font-semibold text-foreground">{from || 0}</span>-
                                    <span className="font-semibold text-foreground">{to || 0}</span> of{' '}
                                    <span className="font-semibold text-foreground">{total || 0}</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
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
                                    className="h-8 sm:h-9 px-2 sm:px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    <span className="hidden sm:inline ml-1">Previous</span>
                                </Button>
                                <div className="hidden sm:flex items-center gap-1">
                                    {templates.links?.map((link, index) => {
                                        if (link.label === '...' || !link.url) {
                                            return <span key={index} className="px-2 text-muted-foreground">...</span>;
                                        }
                                        return (
                                            <Button
                                                key={index}
                                                variant={link.active ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => link.url && router.visit(link.url, { preserveState: true, preserveScroll: false })}
                                                className="h-9 min-w-[40px]"
                                            >
                                                {link.label}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <div className="flex sm:hidden items-center gap-1 px-2 text-sm">
                                    <span className="font-semibold text-foreground">{currentPage}</span>
                                    <span className="text-muted-foreground">/</span>
                                    <span className="text-muted-foreground">{lastPage || 1}</span>
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
                                    className="h-8 sm:h-9 px-2 sm:px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="hidden sm:inline mr-1">Next</span>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ) : null
                }
            >
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.data.map((template) => {
                                const imageUrl = template.background_image_path
                                    ? (template.background_image_path.startsWith('/')
                                        ? template.background_image_path
                                        : `/storage/${template.background_image_path}`)
                                    : null;
                                
                                return (
                                    <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
                                        {/* Preview Image */}
                                        <div className="relative bg-muted aspect-[4/3] overflow-hidden">
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={template.name}
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                                    <FileText className="h-16 w-16 opacity-50" />
                                                </div>
                                            )}
                                            {/* Status Badge Overlay */}
                                            <div className="absolute top-2 right-2">
                                                <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                                    {template.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </div>
                                        </div>
                                        
                                        {/* Card Content */}
                                        <div className="p-4 space-y-3">
                                            <div>
                                                <h3 className="font-semibold text-lg line-clamp-1">{template.name}</h3>
                                                {template.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                        {template.description}
                                                    </p>
                                                )}
                                            </div>
                                            
                                            {/* Template Info */}
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Layers className="h-3 w-3" />
                                                    <span>{template.text_layers?.length || 0} layers</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span>{template.width} × {template.height}px</span>
                                                </div>
                                            </div>
                                            
                                            {/* Actions */}
                                            <div className="flex items-center gap-2 pt-2 border-t">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                    className="flex-1"
                                                        onClick={() => router.visit(`/certificate-templates/${template.id}`)}
                                                    >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                    className="flex-1"
                                                        onClick={() => router.visit(`/certificate-templates/${template.id}/edit`)}
                                                    >
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(template)}
                                                    className="text-destructive hover:text-destructive"
                                                    >
                                                    <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
            </PageLayout>
        </AppLayout>
    );
}

