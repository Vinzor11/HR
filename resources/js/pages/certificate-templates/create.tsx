import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CustomToast, toast } from '@/components/custom-toast';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { CertificateTemplateEditor } from '@/components/certificate-template-editor';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMemo, useState } from 'react';

interface RequestTypeOption {
    id: number;
    name: string;
    fields: Array<{ field_key: string; label: string }>;
}

interface CertificateTemplateCreateProps {
    requestTypes?: RequestTypeOption[];
    systemFieldKeys?: string[];
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

export default function CertificateTemplateCreate({ requestTypes = [], systemFieldKeys = [] }: CertificateTemplateCreateProps) {
    const [selectedRequestTypeId, setSelectedRequestTypeId] = useState<number | ''>('');

    const availableFieldKeys = useMemo(() => {
        const system = systemFieldKeys.length > 0 ? systemFieldKeys : [
            'user_name', 'user_email', 'employee_full_name', 'employee_first_name', 'employee_last_name',
            'employee_position', 'employee_unit', 'employee_department', 'reference_code',
            'submitted_date', 'completed_date', 'current_date', 'current_year',
        ];
        if (!selectedRequestTypeId) return system;
        const rt = requestTypes.find((r) => r.id === selectedRequestTypeId);
        if (!rt) return system;
        const requestKeys = rt.fields.map((f) => f.field_key).filter(Boolean);
        return [...system, ...requestKeys];
    }, [systemFieldKeys, selectedRequestTypeId, requestTypes]);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        background_image: null as File | null,
        width: 1200,
        height: 800,
        is_active: true,
        text_layers: [] as TextLayer[],
        request_type_id: null as number | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Prevent double submission - check if already processing
        if (processing) {
            return;
        }
        
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
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Show fields for request type (optional)</Label>
                            <Select
                                value={selectedRequestTypeId === '' ? 'none' : String(selectedRequestTypeId)}
                                onValueChange={(v) => {
                                    const id = v === 'none' ? '' : Number(v);
                                    setSelectedRequestTypeId(id);
                                    setData('request_type_id', id === '' ? null : id);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a request type to see its form fields" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">— System fields only —</SelectItem>
                                    {requestTypes.map((rt) => (
                                        <SelectItem key={rt.id} value={String(rt.id)}>
                                            {rt.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Choosing a request type adds its form field keys below. When you create this template, that request type will be set to require fulfillment and will use this certificate for generation.
                            </p>
                        </div>
                    </Card>

                    <Card className="p-5 space-y-6">
                        <CertificateTemplateEditor
                            availableFieldKeys={availableFieldKeys}
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

