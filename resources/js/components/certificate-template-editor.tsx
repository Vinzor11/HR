import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomTextarea } from '@/components/ui/custom-textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Upload, Move, Type, Palette, AlignLeft, AlignCenter, AlignRight, X } from 'lucide-react';
import { DndContext, DragEndEvent, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { toast } from '@/components/custom-toast';
import InputError from '@/components/input-error';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface TextLayer {
    id: string;
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

interface CertificateTemplateEditorProps {
    name: string;
    description: string;
    backgroundImage: File | null;
    existingBackgroundImagePath?: string | null;
    width: number;
    height: number;
    isActive: boolean;
    textLayers: TextLayer[];
    onNameChange: (name: string) => void;
    onDescriptionChange: (description: string) => void;
    onBackgroundImageChange: (file: File | null) => void;
    onWidthChange: (width: number) => void;
    onHeightChange: (height: number) => void;
    onIsActiveChange: (isActive: boolean) => void;
    onTextLayersChange: (layers: TextLayer[]) => void;
    availableFieldKeys?: string[];
    errors?: Record<string, string>;
}

// Available field keys that can be dragged
const DEFAULT_FIELD_KEYS = [
    'user_name',
    'user_email',
    'employee_full_name',
    'employee_first_name',
    'employee_last_name',
    'employee_position',
    'employee_department',
    'reference_code',
    'submitted_date',
    'completed_date',
    'current_date',
    'current_year',
];

// Draggable Field Key Component
function DraggableFieldKey({ fieldKey }: { fieldKey: string }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `field-${fieldKey}`,
        data: { fieldKey },
    });

    const style = transform
        ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="cursor-move bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        >
            {fieldKey}
        </div>
    );
}

// Text Layer on Canvas Component
function TextLayerMarker({
    layer,
    onSelect,
    onDelete,
    isSelected,
    scale,
}: {
    layer: TextLayer;
    onSelect: () => void;
    onDelete: () => void;
    isSelected: boolean;
    scale: number;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: layer.id,
        data: {
            type: 'layer',
            layer,
        },
    });

    const style = {
        left: `${layer.x_position * scale}px`,
        top: `${layer.y_position * scale}px`,
        transform: transform
            ? `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px))`
            : 'translate(-50%, -50%)',
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : isSelected ? 10 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            className={`absolute cursor-move group ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''} ${isDragging ? 'z-50' : ''}`}
            style={style}
            {...listeners}
            {...attributes}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
        >
            <div className="bg-primary/80 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap shadow-lg">
                {layer.name || layer.field_key || 'Unnamed'}
                {isSelected && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="ml-2 hover:bg-primary rounded p-0.5"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>
        </div>
    );
}

export function CertificateTemplateEditor({
    name,
    description,
    backgroundImage,
    existingBackgroundImagePath,
    width,
    height,
    isActive,
    textLayers,
    onNameChange,
    onDescriptionChange,
    onBackgroundImageChange,
    onWidthChange,
    onHeightChange,
    onIsActiveChange,
    onTextLayersChange,
    availableFieldKeys = DEFAULT_FIELD_KEYS,
    errors = {},
}: CertificateTemplateEditorProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [canvasScale, setCanvasScale] = useState(1);
    const [isConverting, setIsConverting] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [dragStartPos, setDragStartPos] = useState<{ layerId: string; x: number; y: number; mouseX: number; mouseY: number } | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Configure sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 3, // Require 3px of movement before activating drag
            },
        })
    );

    /**
     * Convert PDF to image using PDF.js (client-side)
     */
    const convertPdfToImage = async (file: File): Promise<{ url: string; width: number; height: number } | null> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1); // Get first page
            
            // Scale to get good quality (2x for retina)
            const scale = 2;
            const viewport = page.getViewport({ scale });
            
            // Create canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) return null;
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Render page
            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;
            
            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/png');
            
            return {
                url: dataUrl,
                width: Math.round(viewport.width / scale),
                height: Math.round(viewport.height / scale),
            };
        } catch (error) {
            console.error('PDF conversion error:', error);
            return null;
        }
    };

    /**
     * Convert DOCX to image using mammoth.js (client-side)
     * Renders DOCX as HTML then converts to canvas
     */
    const convertDocxToImage = async (file: File): Promise<{ url: string; width: number; height: number } | null> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            const html = result.value;
            
            // Create a temporary container to render the HTML
            const container = document.createElement('div');
            container.style.cssText = `
                position: absolute;
                left: -9999px;
                top: 0;
                width: 794px;
                min-height: 1123px;
                padding: 72px;
                background: white;
                font-family: 'Times New Roman', serif;
                font-size: 12pt;
                line-height: 1.5;
                box-sizing: border-box;
            `;
            container.innerHTML = html;
            document.body.appendChild(container);
            
            // Wait for images to load
            const images = container.querySelectorAll('img');
            await Promise.all(Array.from(images).map(img => 
                img.complete ? Promise.resolve() : new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                })
            ));
            
            // Use html2canvas if available, otherwise create a simple preview
            // For now, we'll create a canvas with the rendered content
            const width = container.offsetWidth || 794;
            const height = Math.max(container.offsetHeight, 1123);
            
            // Create canvas and draw white background
            const canvas = document.createElement('canvas');
            const scale = 2; // For better quality
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                document.body.removeChild(container);
                return null;
            }
            
            ctx.scale(scale, scale);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, width, height);
            
            // Draw text content (simplified rendering)
            ctx.fillStyle = 'black';
            ctx.font = '12pt Times New Roman';
            
            // Get text content and draw it
            const textContent = container.innerText;
            const lines = textContent.split('\n');
            let y = 100;
            const lineHeight = 20;
            const maxWidth = width - 144; // Account for padding
            
            for (const line of lines) {
                if (y > height - 72) break;
                
                // Word wrap
                const words = line.split(' ');
                let currentLine = '';
                
                for (const word of words) {
                    const testLine = currentLine + (currentLine ? ' ' : '') + word;
                    const metrics = ctx.measureText(testLine);
                    
                    if (metrics.width > maxWidth && currentLine) {
                        ctx.fillText(currentLine, 72, y);
                        currentLine = word;
                        y += lineHeight;
                    } else {
                        currentLine = testLine;
                    }
                }
                
                if (currentLine) {
                    ctx.fillText(currentLine, 72, y);
                    y += lineHeight;
                }
            }
            
            document.body.removeChild(container);
            
            const dataUrl = canvas.toDataURL('image/png');
            
            return {
                url: dataUrl,
                width: width,
                height: height,
            };
        } catch (error) {
            console.error('DOCX conversion error:', error);
            return null;
        }
    };

    // Generate preview URL from uploaded file or existing image
    useEffect(() => {
        if (backgroundImage) {
            const isImage = backgroundImage.type.startsWith('image/');
            const isPdf = backgroundImage.type === 'application/pdf' || backgroundImage.name.toLowerCase().endsWith('.pdf');
            const isDocx = 
                backgroundImage.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                backgroundImage.name.toLowerCase().endsWith('.docx');

            if (isImage) {
                // For images, create object URL and detect dimensions
                const url = URL.createObjectURL(backgroundImage);
                setPreviewUrl(url);

                const img = new Image();
                img.onload = () => {
                    onWidthChange(img.width);
                    onHeightChange(img.height);
                };
                img.src = url;

                return () => URL.revokeObjectURL(url);
            } else if (isPdf) {
                // Convert PDF using PDF.js (client-side)
                setIsConverting(true);
                convertPdfToImage(backgroundImage)
                    .then((result) => {
                        setIsConverting(false);
                        if (result) {
                            setPreviewUrl(result.url);
                            onWidthChange(result.width);
                            onHeightChange(result.height);
                            toast.success('PDF preview generated successfully!');
                        } else {
                            toast.error('Failed to generate PDF preview');
                            setPreviewUrl(null);
                        }
                    })
                    .catch((error) => {
                        setIsConverting(false);
                        console.error('PDF conversion error:', error);
                        toast.error('Failed to convert PDF: ' + error.message);
                        setPreviewUrl(null);
                    });
            } else if (isDocx) {
                // Convert DOCX using mammoth.js (client-side)
                setIsConverting(true);
                convertDocxToImage(backgroundImage)
                    .then((result) => {
                        setIsConverting(false);
                        if (result) {
                            setPreviewUrl(result.url);
                            onWidthChange(result.width);
                            onHeightChange(result.height);
                            toast.success('DOCX preview generated successfully!');
                        } else {
                            toast.error('Failed to generate DOCX preview');
                            setPreviewUrl(null);
                        }
                    })
                    .catch((error) => {
                        setIsConverting(false);
                        console.error('DOCX conversion error:', error);
                        toast.error('Failed to convert DOCX: ' + error.message);
                        setPreviewUrl(null);
                    });
            } else {
                setPreviewUrl(null);
            }
        } else if (existingBackgroundImagePath) {
            // Use existing background image if no new file is uploaded
            const imageUrl = existingBackgroundImagePath.startsWith('/')
                ? existingBackgroundImagePath
                : `/storage/${existingBackgroundImagePath}`;
            setPreviewUrl(imageUrl);
        } else {
            setPreviewUrl(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backgroundImage, existingBackgroundImagePath]);

    // Calculate canvas scale to fit container
    useEffect(() => {
        if (canvasRef.current && width && height) {
            const container = canvasRef.current;
            const containerWidth = container.clientWidth - 40; // padding
            const containerHeight = 600; // max height
            const scaleX = containerWidth / width;
            const scaleY = containerHeight / height;
            setCanvasScale(Math.min(scaleX, scaleY, 1)); // Don't scale up
        }
    }, [width, height]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Accept images, PDF, and DOCX files
            const isImage = file.type.startsWith('image/');
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            const isDocx = 
                file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                file.name.toLowerCase().endsWith('.docx');
            
            if (isImage || isPdf || isDocx) {
                onBackgroundImageChange(file);
            } else {
                // Show error for unsupported file types
                alert('Please upload an image (JPG, PNG), PDF, or DOCX file.');
            }
        }
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / canvasScale;
        const y = (e.clientY - rect.top) / canvasScale;

        // If clicking on empty space, deselect
        setSelectedLayerId(null);
    };

    const getImageContainerBounds = (): { left: number; top: number; width: number; height: number } | null => {
        if (!canvasRef.current || !previewUrl) return null;
        
        // Get the image container element (not the image itself)
        // Layers are positioned relative to this container
        const imageContainer = canvasRef.current.querySelector('[data-image-container="true"]') as HTMLElement;
        if (!imageContainer) return null;
        
        const containerRect = imageContainer.getBoundingClientRect();
        return {
            left: containerRect.left,
            top: containerRect.top,
            width: containerRect.width,
            height: containerRect.height,
        };
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        // Don't track drag start position - we'll use the mouse position directly on drop
        setDragStartPos(null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || !canvasRef.current) return;

        const activeData = active.data.current as { type?: string; fieldKey?: string; layer?: TextLayer };

        // Handle dragging existing layers
        if (activeData.type === 'layer' && activeData.layer) {
            const layer = activeData.layer;
            const containerBounds = getImageContainerBounds();
            
            if (!containerBounds) {
                return;
            }
            
            // Get the final drop position from the mouse event
            if (event.activatorEvent && 'clientX' in event.activatorEvent) {
                const mouseX = event.activatorEvent.clientX;
                const mouseY = event.activatorEvent.clientY;
                
                // Calculate mouse position relative to the image container
                // This matches how layers are positioned (relative to container, not image)
                const relativeX = mouseX - containerBounds.left;
                const relativeY = mouseY - containerBounds.top;
                
                // Validate that mouse is within container bounds
                // If outside, clamp to container edges first
                const clampedRelativeX = Math.max(0, Math.min(relativeX, containerBounds.width));
                const clampedRelativeY = Math.max(0, Math.min(relativeY, containerBounds.height));
                
                // Convert to canvas coordinates using canvasScale
                // The container is exactly width * canvasScale by height * canvasScale
                let canvasX = clampedRelativeX / canvasScale;
                let canvasY = clampedRelativeY / canvasScale;
                
                // Final clamp to ensure it stays within certificate dimensions
                // This should be redundant but ensures safety
                canvasX = Math.max(0, Math.min(canvasX, width));
                canvasY = Math.max(0, Math.min(canvasY, height));
                
                updateLayer(layer.id, {
                    x_position: canvasX,
                    y_position: canvasY,
                });
            } else {
                // Fallback: keep current position if no mouse event
                updateLayer(layer.id, {
                    x_position: Math.max(0, Math.min(layer.x_position, width)),
                    y_position: Math.max(0, Math.min(layer.y_position, height)),
                });
            }
            return;
        }

        // Handle dropping new fields from sidebar
        if (over.id === 'canvas-drop-zone') {
            const containerBounds = getImageContainerBounds();
            let x = width / 2;
            let y = height / 2;
            
            if (containerBounds && event.activatorEvent && 'clientX' in event.activatorEvent) {
                // Calculate position relative to the image container
                const relativeX = event.activatorEvent.clientX - containerBounds.left;
                const relativeY = event.activatorEvent.clientY - containerBounds.top;
                
                // Convert to canvas coordinates using canvasScale
                x = relativeX / canvasScale;
                y = relativeY / canvasScale;
                
                // Clamp to valid bounds
                x = Math.max(0, Math.min(x, width));
                y = Math.max(0, Math.min(y, height));
            }

            const fieldKey = activeData.fieldKey;
            if (fieldKey) {
                const newLayer: TextLayer = {
                    id: `layer-${Date.now()}`,
                    name: fieldKey,
                    field_key: fieldKey,
                    x_position: Math.max(0, Math.min(x, width)),
                    y_position: Math.max(0, Math.min(y, height)),
                    font_family: 'Arial',
                    font_size: 24,
                    font_color: '#000000',
                    font_weight: 'normal',
                    text_align: 'left',
                    sort_order: textLayers.length,
                };
                onTextLayersChange([...textLayers, newLayer]);
            }
        }
    };

    const selectedLayer = textLayers.find((l) => l.id === selectedLayerId);

    const updateLayer = (layerId: string, updates: Partial<TextLayer>) => {
        onTextLayersChange(
            textLayers.map((layer) => (layer.id === layerId ? { ...layer, ...updates } : layer)),
        );
    };

    const deleteLayer = (layerId: string) => {
        onTextLayersChange(textLayers.filter((layer) => layer.id !== layerId));
        if (selectedLayerId === layerId) {
            setSelectedLayerId(null);
        }
    };

    const moveLayer = (layerId: string, deltaX: number, deltaY: number) => {
        const layer = textLayers.find((l) => l.id === layerId);
        if (layer) {
            updateLayer(layerId, {
                x_position: Math.max(0, Math.min(layer.x_position + deltaX, width)),
                y_position: Math.max(0, Math.min(layer.y_position + deltaY, height)),
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Template Info */}
            <Card className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">Template Information</h2>

                <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        placeholder="e.g., Training Certificate"
                        className={errors.name ? 'border-red-500' : ''}
                    />
                    <InputError message={errors.name} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <CustomTextarea
                        id="description"
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        placeholder="Describe what this certificate template is for..."
                        rows={3}
                        className={errors.description ? 'border-red-500' : ''}
                    />
                    <InputError message={errors.description} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="background_image">Template File</Label>
                    <div className="flex items-center gap-4">
                        <Input
                            ref={fileInputRef}
                            id="background_image"
                            type="file"
                            accept="image/*,.pdf,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Template
                        </Button>
                        {backgroundImage && (
                            <span className="text-sm text-muted-foreground">
                                {backgroundImage.name}
                            </span>
                        )}
                    </div>
                    <InputError message={errors.background_image} />
                    <p className="text-xs text-muted-foreground">
                        Upload a PDF, DOCX, or image file. Dimensions will be auto-detected.
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox id="is_active" checked={isActive} onCheckedChange={onIsActiveChange} />
                    <Label htmlFor="is_active" className="cursor-pointer">
                        Template is active
                    </Label>
                </div>
            </Card>

            {/* Visual Editor */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Visual Editor</h2>

                <DndContext 
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="grid grid-cols-4 gap-6">
                        {/* Field Keys Sidebar */}
                        <div className="col-span-1 space-y-4">
                            <div>
                                <Label className="text-sm font-medium mb-2 block">
                                    Available Fields
                                </Label>
                                <div className="space-y-2">
                                    {availableFieldKeys.map((fieldKey) => (
                                        <DraggableFieldKey key={fieldKey} fieldKey={fieldKey} />
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Drag fields onto the template
                                </p>
                            </div>
                        </div>

                        {/* Canvas */}
                        <div className="col-span-3">
                            <Label className="text-sm font-medium mb-2 block">Template Preview</Label>
                            <div
                                ref={canvasRef}
                                className="relative border-2 border-dashed rounded-lg bg-gray-50 overflow-auto"
                                style={{ minHeight: '600px', maxHeight: '600px' }}
                                onClick={handleCanvasClick}
                            >
                                <CanvasDropZone>
                                    {previewUrl ? (
                                        <div 
                                            className="relative" 
                                            style={{ width: width * canvasScale, height: height * canvasScale }}
                                            data-image-container="true"
                                        >
                                            <img
                                                src={previewUrl}
                                                alt="Template preview"
                                                className="w-full h-full object-contain"
                                                style={{
                                                    width: width * canvasScale,
                                                    height: height * canvasScale,
                                                }}
                                            />
                                            {textLayers.map((layer) => (
                                                <TextLayerMarker
                                                    key={layer.id}
                                                    layer={layer}
                                                    onSelect={() => setSelectedLayerId(layer.id)}
                                                    onDelete={() => deleteLayer(layer.id)}
                                                    isSelected={selectedLayerId === layer.id}
                                                    scale={canvasScale}
                                                />
                                            ))}
                                        </div>
                                    ) : isConverting ? (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            <div className="text-center">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-2"></div>
                                                <p className="font-medium">Converting file...</p>
                                                <p className="text-sm mt-2">Please wait while we convert your PDF/DOCX to preview</p>
                                            </div>
                                        </div>
                                    ) : backgroundImage ? (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            <div className="text-center max-w-md px-4">
                                                <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                                <p className="font-medium mb-2">{backgroundImage.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Preview is unavailable because conversion tools are not installed.
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    The file will be saved and can be used for certificate generation. 
                                                    To enable preview, install LibreOffice (for DOCX) or Imagick/Ghostscript (for PDF).
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            <div className="text-center">
                                                <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                                <p>Upload a template file to start</p>
                                            </div>
                                        </div>
                                    )}
                                </CanvasDropZone>
                            </div>
                            {previewUrl && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Dimensions: {width} × {height}px | Scale: {(canvasScale * 100).toFixed(0)}%
                                </p>
                            )}
                        </div>
                    </div>
                </DndContext>
            </Card>

            {/* Layer Properties Panel */}
            {selectedLayer && (
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Edit Field: {selectedLayer.name}</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Layer Name</Label>
                            <Input
                                value={selectedLayer.name}
                                onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Field Key</Label>
                            <Input
                                value={selectedLayer.field_key || ''}
                                onChange={(e) => updateLayer(selectedLayer.id, { field_key: e.target.value })}
                                placeholder="Auto-filled from drag"
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label>Default Text (optional)</Label>
                            <CustomTextarea
                                value={selectedLayer.default_text || ''}
                                onChange={(e) => updateLayer(selectedLayer.id, { default_text: e.target.value })}
                                placeholder="e.g., Completed on {current_date}"
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Font Size</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="8"
                                    max="200"
                                    value={selectedLayer.font_size}
                                    onChange={(e) =>
                                        updateLayer(selectedLayer.id, {
                                            font_size: parseInt(e.target.value) || 24,
                                        })
                                    }
                                    className="flex-1"
                                />
                                <span className="text-sm text-muted-foreground">px</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Font Color</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="color"
                                    value={selectedLayer.font_color}
                                    onChange={(e) =>
                                        updateLayer(selectedLayer.id, { font_color: e.target.value })
                                    }
                                    className="w-20 h-10"
                                />
                                <Input
                                    value={selectedLayer.font_color}
                                    onChange={(e) =>
                                        updateLayer(selectedLayer.id, { font_color: e.target.value })
                                    }
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Font Family</Label>
                            <Select
                                value={selectedLayer.font_family}
                                onValueChange={(value) =>
                                    updateLayer(selectedLayer.id, { font_family: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Arial">Arial</SelectItem>
                                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                    <SelectItem value="Courier New">Courier New</SelectItem>
                                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Text Alignment</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={selectedLayer.text_align === 'left' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => updateLayer(selectedLayer.id, { text_align: 'left' })}
                                >
                                    <AlignLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant={selectedLayer.text_align === 'center' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => updateLayer(selectedLayer.id, { text_align: 'center' })}
                                >
                                    <AlignCenter className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant={selectedLayer.text_align === 'right' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => updateLayer(selectedLayer.id, { text_align: 'right' })}
                                >
                                    <AlignRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label>Position</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs">X:</Label>
                                    <Input
                                        type="number"
                                        value={selectedLayer.x_position}
                                        onChange={(e) =>
                                            updateLayer(selectedLayer.id, {
                                                x_position: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs">Y:</Label>
                                    <Input
                                        type="number"
                                        value={selectedLayer.y_position}
                                        onChange={(e) =>
                                            updateLayer(selectedLayer.id, {
                                                y_position: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => moveLayer(selectedLayer.id, -10, 0)}
                                >
                                    <Move className="h-4 w-4 rotate-180" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => moveLayer(selectedLayer.id, 10, 0)}
                                >
                                    <Move className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => moveLayer(selectedLayer.id, 0, -10)}
                                >
                                    <Move className="h-4 w-4 rotate-90" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => moveLayer(selectedLayer.id, 0, 10)}
                                >
                                    <Move className="h-4 w-4 -rotate-90" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Layers List */}
            {textLayers.length > 0 && (
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Text Layers ({textLayers.length})</h2>
                    {errors.text_layers && (
                        <InputError message={errors.text_layers} className="mb-4" />
                    )}
                    <div className="space-y-2">
                        {textLayers.map((layer) => (
                            <div
                                key={layer.id}
                                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                                    selectedLayerId === layer.id ? 'bg-primary/10 border-primary' : ''
                                }`}
                                onClick={() => setSelectedLayerId(layer.id)}
                            >
                                <div>
                                    <p className="font-medium">{layer.name || 'Unnamed'}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {layer.field_key || 'No field key'} • {layer.font_size}px •{' '}
                                        {layer.text_align}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteLayer(layer.id);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}

// Drop Zone Component
function CanvasDropZone({ children }: { children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
        id: 'canvas-drop-zone',
    });

    return (
        <div
            ref={setNodeRef}
            className={`w-full h-full min-h-[600px] flex items-center justify-center p-5 ${
                isOver ? 'bg-primary/5' : ''
            }`}
        >
            {children}
        </div>
    );
}

