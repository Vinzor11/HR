import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CustomToast, toast } from '@/components/custom-toast';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { CertificateTemplateEditor } from '@/components/certificate-template-editor';

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

interface CertificateTemplateEditProps {
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
    {
        title: 'Edit',
        href: `/certificate-templates/${template.id}/edit`,
    },
];

interface TextLayer {
    id?: number;
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

export default function CertificateTemplateEdit({ template }: CertificateTemplateEditProps) {
    const form = useForm({
        _method: 'PUT',
        name: template.name || '',
        description: template.description || '',
        background_image: null as File | null,
        width: template.width,
        height: template.height,
        is_active: template.is_active,
        text_layers: (template.text_layers || []) as TextLayer[],
    });
    const { data, setData, processing, errors, clearErrors } = form;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Ensure name is always included and not empty
        if (!data.name || data.name.trim() === '') {
            toast.error('Template name is required.');
            return;
        }

        form.transform((formData) => ({
            ...formData,
            name: formData.name?.trim() ?? '',
            text_layers: (formData.text_layers || []).map((layer, index) => ({
                ...layer,
                id: typeof layer.id === 'number' ? layer.id : null,
                sort_order: layer.sort_order ?? index,
            })),
        }));

        form.post(`/certificate-templates/${template.id}`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Certificate template updated successfully.');
            },
            onError: (formErrors) => {
                const firstError = formErrors?.name || Object.values(formErrors)[0];
                toast.error(firstError || 'Please fix the highlighted errors.');
            },
        });
    };

    // Ensure text layers have IDs for the editor
    const textLayersWithIds = data.text_layers.map((layer, index) => ({
        ...layer,
        id: layer.id || `layer-${index}`,
    }));

    return (
        <AppLayout breadcrumbs={breadcrumbs(template)}>
            <Head title={`Edit ${template.name}`} />
            <CustomToast />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <Card className="p-5 space-y-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground">Edit Certificate Template</h1>
                            <p className="text-sm text-muted-foreground">
                                Update the certificate template design and configuration
                            </p>
                        </div>
                    </Card>

                    <Card className="p-5 space-y-6">
                        <CertificateTemplateEditor
                            name={data.name}
                            description={data.description}
                            backgroundImage={data.background_image}
                            existingBackgroundImagePath={template.background_image_path}
                            width={data.width}
                            height={data.height}
                            isActive={data.is_active}
                            textLayers={textLayersWithIds}
                            onNameChange={(name) => {
                                setData('name', name);
                                if (errors.name) {
                                    clearErrors('name');
                                }
                            }}
                            onDescriptionChange={(description) => setData('description', description)}
                            onBackgroundImageChange={(file) => setData('background_image', file)}
                            onWidthChange={(width) => setData('width', width)}
                            onHeightChange={(height) => setData('height', height)}
                            onIsActiveChange={(isActive) => setData('is_active', isActive)}
                            onTextLayersChange={(layers) => {
                                // Preserve IDs for existing layers
                                const layersWithIds = layers.map((layer) => {
                                    const existingLayer = template.text_layers?.find(
                                        (tl) => tl.id === (layer as any).id
                                    );
                                    return {
                                        ...layer,
                                        id: existingLayer?.id || (layer as any).id,
                                    };
                                });
                                setData('text_layers', layersWithIds);
                            }}
                            errors={errors}
                        />
                    </Card>

                    <div className="flex items-center justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => router.visit(`/certificate-templates/${template.id}`)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Updating...' : 'Update Template'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

