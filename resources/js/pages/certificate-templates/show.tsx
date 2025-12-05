import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CustomToast, toast } from '@/components/custom-toast';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { FileText, Layers, Settings } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';

interface CertificateTextLayer {
    id: number;
    name: string;
    field_key?: string | null;
    default_text?: string | null;
    x_position: number;
    y_position: number;
    font_family: string;
    font_size: number;
    font_color: string;
    font_weight: string;
    text_align: string;
    max_width?: number | null;
    sort_order: number;
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

interface CertificateTemplateShowProps {
    template: CertificateTemplate;
}

const breadcrumbs = (template: CertificateTemplate): BreadcrumbItem[] => [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Certificate Templates',
        href: '/certificate-templates',
    },
    {
        title: template.name,
        href: `/certificate-templates/${template.id}`,
    },
];

export default function CertificateTemplateShow({ template }: CertificateTemplateShowProps) {
    const { flash } = usePage().props as any;

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const backgroundImageUrl = template.background_image_path
        ? `/storage/${template.background_image_path}`
        : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs(template)}>
            <Head title={template.name} />
            <CustomToast />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="space-y-6">
                    <Card className="p-5 space-y-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground">{template.name}</h1>
                            <p className="text-sm text-muted-foreground">
                                Certificate Template Details
                            </p>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Template Information */}
                        <Card className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <FileText className="h-5 w-5" />
                                <h2 className="text-xl font-semibold">Template Information</h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                                    <p className="text-base font-medium">{template.name}</p>
                                </div>

                                {template.description && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                                        <p className="text-base">{template.description}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Dimensions</label>
                                        <p className="text-base">
                                            {template.width} × {template.height}px
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                                        <div className="mt-1">
                                            <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                                {template.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {backgroundImageUrl && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                            Background Image
                                        </label>
                                        <div className="border rounded-lg overflow-hidden">
                                            <img
                                                src={backgroundImageUrl}
                                                alt="Certificate template background"
                                                className="w-full h-auto"
                                                style={{ maxHeight: '400px', objectFit: 'contain' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Text Layers */}
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-5 w-5" />
                                    <h2 className="text-xl font-semibold">Text Layers</h2>
                                </div>
                                <Badge variant="outline">{template.text_layers?.length || 0} layers</Badge>
                            </div>

                            {!template.text_layers || template.text_layers.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Layers className="mx-auto h-12 w-12 mb-2 opacity-50" />
                                    <p>No text layers configured</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {template.text_layers
                                        .sort((a, b) => a.sort_order - b.sort_order)
                                        .map((layer, index) => (
                                            <Card key={layer.id} className="p-4 border">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h3 className="font-medium">{layer.name}</h3>
                                                        {layer.field_key && (
                                                            <p className="text-sm text-muted-foreground">
                                                                Maps to: <code className="text-xs bg-muted px-1 py-0.5 rounded">{layer.field_key}</code>
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Badge variant="outline">Layer {index + 1}</Badge>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Position: </span>
                                                        <span className="font-mono">
                                                            ({layer.x_position}, {layer.y_position})
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Font: </span>
                                                        <span>
                                                            {layer.font_family} {layer.font_size}px
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Color: </span>
                                                        <span
                                                            className="inline-block w-4 h-4 rounded border border-border align-middle mr-1"
                                                            style={{ backgroundColor: layer.font_color }}
                                                        />
                                                        <span className="font-mono text-xs">{layer.font_color}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Align: </span>
                                                        <span className="capitalize">{layer.text_align}</span>
                                                    </div>
                                                </div>

                                                {layer.default_text && (
                                                    <div className="mt-3 pt-3 border-t">
                                                        <span className="text-sm text-muted-foreground">Default Text: </span>
                                                        <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                                                            {layer.default_text}
                                                        </p>
                                                    </div>
                                                )}
                                            </Card>
                                        ))}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Info */}
                        <Card className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Settings className="h-5 w-5" />
                                <h2 className="text-xl font-semibold">Quick Info</h2>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Template ID</span>
                                    <p className="font-mono text-xs">{template.id}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Created</span>
                                    <p>{new Date(template.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Last Updated</span>
                                    <p>{new Date(template.updated_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Text Layers</span>
                                    <p>{template.text_layers?.length || 0}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Background Image</span>
                                    <p>{template.background_image_path ? 'Yes' : 'No'}</p>
                                </div>
                            </div>
                        </Card>

                        {/* Usage Instructions */}
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4">How to Use</h2>
                            <div className="space-y-3 text-sm text-muted-foreground">
                                <p>
                                    1. Go to <strong>Requests → Dynamic Builder</strong>
                                </p>
                                <p>
                                    2. Create or edit a Request Type
                                </p>
                                <p>
                                    3. Select this template in the certificate configuration
                                </p>
                                <p>
                                    4. Map request fields to text layers using field keys
                                </p>
                                <p>
                                    5. When requests are completed, certificates will be auto-generated
                                </p>
                            </div>
                        </Card>
                    </div>
                </div>
                </div>
            </div>
        </AppLayout>
    );
}

