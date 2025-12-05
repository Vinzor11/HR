import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CustomToast, toast } from '@/components/custom-toast';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { CertificateTemplateEditor } from '@/components/certificate-template-editor';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Certificate Templates',
        href: '/certificate-templates',
    },
    {
        title: 'Create Template',
        href: '/certificate-templates/create',
    },
];

interface TextLayer {
    name: string;
    field_key?: string;
    default_text?: string;
    x_position: number;
    y_position: number;
    font_family: string;
    font_size: number;
    font_color: string;
    font_weight: string;
    text_align: string;
    max_width?: number;
    sort_order: number;
}

export default function CertificateTemplateCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        background_image: null as File | null,
        width: 1200,
        height: 800,
        is_active: true,
        text_layers: [] as TextLayer[],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/certificate-templates', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Certificate template created successfully.');
            },
            onError: () => {
                toast.error('Please fix the highlighted errors.');
            },
        });
    };

    // Ensure text layers have IDs for the editor
    const textLayersWithIds = data.text_layers.map((layer, index) => ({
        ...layer,
        id: (layer as any).id || `layer-${index}`,
    }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Certificate Template" />
            <CustomToast />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <Card className="p-5 space-y-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground">Create Certificate Template</h1>
                            <p className="text-sm text-muted-foreground">
                                Design a certificate template that can be reused for multiple request types
                            </p>
                        </div>
                    </Card>

                    <Card className="p-5 space-y-6">
                        <CertificateTemplateEditor
                            name={data.name}
                            description={data.description}
                            backgroundImage={data.background_image}
                            width={data.width}
                            height={data.height}
                            isActive={data.is_active}
                            textLayers={textLayersWithIds}
                            onNameChange={(name) => setData('name', name)}
                            onDescriptionChange={(description) => setData('description', description)}
                            onBackgroundImageChange={(file) => setData('background_image', file)}
                            onWidthChange={(width) => setData('width', width)}
                            onHeightChange={(height) => setData('height', height)}
                            onIsActiveChange={(isActive) => setData('is_active', isActive)}
                            onTextLayersChange={(layers) => {
                                // Remove IDs before saving
                                const layersWithoutIds = layers.map(({ id, ...layer }) => ({
                                    ...layer,
                                    sort_order: layer.sort_order,
                                }));
                                setData('text_layers', layersWithoutIds);
                            }}
                            errors={errors}
                        />
                    </Card>

                    <div className="flex items-center justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => router.visit('/certificate-templates')}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create Template'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

