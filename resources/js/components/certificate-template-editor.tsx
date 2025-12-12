import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomTextarea } from '@/components/ui/custom-textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Upload, Move, Type, Palette, AlignLeft, AlignCenter, AlignRight, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { DndContext, DragEndEvent, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { toast } from '@/components/custom-toast';
import InputError from '@/components/input-error';
import * as pdfjsLib from 'pdfjs-dist';
import { renderAsync } from 'docx-preview';

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
    const [userZoom, setUserZoom] = useState(1); // User-controlled zoom multiplier
    const [isConverting, setIsConverting] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [dragStartPos, setDragStartPos] = useState<{ layerId: string; x: number; y: number; mouseX: number; mouseY: number } | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Ref to always have the latest textLayers (avoids stale closure issues)
    const textLayersRef = useRef(textLayers);
    textLayersRef.current = textLayers;
    
    // Ref to always have the latest effectiveScale
    const effectiveScaleRef = useRef(1);

    // Configure sensors for drag and drop - lower distance for better accuracy
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 1, // Require only 1px of movement - more responsive
            },
        })
    );

    // Keyboard controls for fine-tuning selected layer position
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedLayerId) return;
            
            const layer = textLayers.find(l => l.id === selectedLayerId);
            if (!layer) return;
            
            // Arrow keys for moving, with Shift for larger steps
            const step = e.shiftKey ? 10 : 1;
            let deltaX = 0;
            let deltaY = 0;
            
            switch (e.key) {
                case 'ArrowLeft':
                    deltaX = -step;
                    break;
                case 'ArrowRight':
                    deltaX = step;
                    break;
                case 'ArrowUp':
                    deltaY = -step;
                    break;
                case 'ArrowDown':
                    deltaY = step;
                    break;
                case 'Delete':
                case 'Backspace':
                    // Delete selected layer
                    if (document.activeElement?.tagName !== 'INPUT' && 
                        document.activeElement?.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        deleteLayer(selectedLayerId);
                    }
                    return;
                default:
                    return;
            }
            
            if (deltaX !== 0 || deltaY !== 0) {
                e.preventDefault();
                moveLayer(selectedLayerId, deltaX, deltaY);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedLayerId, textLayers]);

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
     * Convert DOCX to image using docx-preview (client-side)
     * Renders DOCX with original structure preserved
     */
    const convertDocxToImage = async (file: File): Promise<{ url: string; width: number; height: number } | null> => {
        let container: HTMLDivElement | null = null;
        
        try {
            console.log('Starting DOCX conversion for:', file.name);
            const arrayBuffer = await file.arrayBuffer();
            console.log('File loaded, size:', arrayBuffer.byteLength);
            
            // Create a temporary container for docx-preview to render into
            // Use iframe to isolate from app's CSS (which uses oklch colors that html2canvas doesn't support)
            const iframe = document.createElement('iframe');
            iframe.style.cssText = `
                position: fixed;
                left: -9999px;
                top: 0;
                width: 900px;
                height: 1200px;
                border: none;
                visibility: hidden;
            `;
            document.body.appendChild(iframe);
            
            // Wait for iframe to be ready
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) {
                document.body.removeChild(iframe);
                throw new Error('Could not access iframe document');
            }
            
            // Write basic HTML to iframe with safe CSS (no oklch)
            iframeDoc.open();
            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        * { box-sizing: border-box; }
                        body { 
                            margin: 0; 
                            padding: 0; 
                            background: #ffffff !important;
                            font-family: 'Times New Roman', Times, serif;
                        }
                        .docx-wrapper { background: #ffffff !important; }
                        section { background: #ffffff !important; }
                    </style>
                </head>
                <body>
                    <div id="docx-container"></div>
                </body>
                </html>
            `);
            iframeDoc.close();
            
            container = iframeDoc.getElementById('docx-container') as HTMLDivElement;
            if (!container) {
                document.body.removeChild(iframe);
                throw new Error('Could not find container in iframe');
            }
            
            // Render DOCX using docx-preview (preserves original structure)
            console.log('Rendering DOCX with docx-preview...');
            await renderAsync(arrayBuffer, container, undefined, {
                className: 'docx-preview',
                inWrapper: true,
                ignoreWidth: false,
                ignoreHeight: false,
                ignoreFonts: false,
                breakPages: true,
                useBase64URL: true,
            });
            console.log('DOCX rendered successfully');
            
            // Wait for images to load
            const images = container.querySelectorAll('img');
            console.log('Found', images.length, 'images in document');
            await Promise.all(Array.from(images).map(img => 
                img.complete ? Promise.resolve() : new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                })
            ));
            
            // Longer delay to ensure rendering is complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Make container visible temporarily for rendering
            container.style.visibility = 'visible';
            container.style.left = '-9999px';
            
            // Try different selectors to find the rendered content
            let targetElement: HTMLElement | null = null;
            
            // Try to find the docx-wrapper first
            const docWrapper = container.querySelector('.docx-wrapper') as HTMLElement;
            console.log('docx-wrapper found:', !!docWrapper);
            
            if (docWrapper) {
                // Try to find section.docx
                const sections = docWrapper.querySelectorAll('section.docx, section, article, .docx');
                console.log('Found sections:', sections.length);
                
                if (sections.length > 0) {
                    targetElement = sections[0] as HTMLElement;
                } else {
                    // Use the wrapper itself
                    targetElement = docWrapper;
                }
            } else {
                // Try other selectors
                const anyContent = container.querySelector('article, section, .docx, div > div') as HTMLElement;
                console.log('Alternative content found:', !!anyContent);
                targetElement = anyContent || container;
            }
            
            if (!targetElement || targetElement.offsetWidth === 0) {
                console.error('No valid target element found or element has no width');
                // Try using the container itself
                targetElement = container;
            }
            
            // Get dimensions from the rendered document
            const width = targetElement.offsetWidth || 794; // Default A4 width at 96 DPI
            const height = targetElement.offsetHeight || 1123; // Default A4 height at 96 DPI
            console.log('Element dimensions:', width, 'x', height);
            
            // Use html2canvas to capture the rendered document as an image
            console.log('Loading html2canvas...');
            const { default: html2canvas } = await import('html2canvas');
            console.log('html2canvas loaded, capturing...');
            
            const canvas = await html2canvas(targetElement, {
                scale: 2, // Higher quality
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: true, // Enable logging for debugging
                width: width,
                height: height,
                windowWidth: 900,
                windowHeight: 1200,
            });
            console.log('Canvas captured:', canvas.width, 'x', canvas.height);
            
            // Clean up iframe
            const iframeToRemove = document.querySelector('iframe[style*="-9999px"]');
            if (iframeToRemove) {
                document.body.removeChild(iframeToRemove);
            }
            container = null;
            
            const dataUrl = canvas.toDataURL('image/png');
            console.log('Data URL generated, length:', dataUrl.length);
            
            return {
                url: dataUrl,
                width: width,
                height: height,
            };
        } catch (error) {
            console.error('DOCX conversion error:', error);
            console.error('Error details:', error instanceof Error ? error.message : String(error));
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
            
            // Clean up iframe if it exists
            const iframeCleanup = document.querySelector('iframe[style*="-9999px"]');
            if (iframeCleanup) {
                document.body.removeChild(iframeCleanup);
            }
            
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
                    .then(async (result) => {
                        setIsConverting(false);
                        if (result) {
                            setPreviewUrl(result.url);
                            onWidthChange(result.width);
                            onHeightChange(result.height);
                            
                            // Convert the data URL to a File object for upload
                            try {
                                const response = await fetch(result.url);
                                const blob = await response.blob();
                                const convertedFile = new File(
                                    [blob], 
                                    backgroundImage.name.replace(/\.pdf$/i, '.png'),
                                    { type: 'image/png' }
                                );
                                // Replace the original PDF with the converted image
                                onBackgroundImageChange(convertedFile);
                                toast.success('PDF converted to image successfully!');
                            } catch (conversionError) {
                                console.error('Failed to create image file:', conversionError);
                                toast.success('PDF preview generated (upload may use original file)');
                            }
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
                // Convert DOCX using docx-preview (client-side) - preserves original structure
                setIsConverting(true);
                convertDocxToImage(backgroundImage)
                    .then(async (result) => {
                        setIsConverting(false);
                        if (result) {
                            setPreviewUrl(result.url);
                            onWidthChange(result.width);
                            onHeightChange(result.height);
                            
                            // Convert the data URL to a File object for upload
                            // This ensures the server gets the exact rendered image
                            try {
                                const response = await fetch(result.url);
                                const blob = await response.blob();
                                const convertedFile = new File(
                                    [blob], 
                                    backgroundImage.name.replace(/\.docx$/i, '.png'),
                                    { type: 'image/png' }
                                );
                                // Replace the original DOCX with the converted image
                                onBackgroundImageChange(convertedFile);
                                toast.success('DOCX converted to image successfully! Original structure preserved.');
                            } catch (conversionError) {
                                console.error('Failed to create image file:', conversionError);
                                toast.success('DOCX preview generated (upload may use original file)');
                            }
                        } else {
                            toast.error('Failed to generate DOCX preview');
                            setPreviewUrl(null);
                        }
                    })
                    .catch((error) => {
                        setIsConverting(false);
                        console.error('DOCX conversion error:', error);
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        toast.error('Failed to convert DOCX: ' + errorMsg);
                        // Open browser console for more details
                        console.error('Full error:', error);
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

    // Zoom control functions
    const zoomIn = () => {
        setUserZoom(prev => Math.min(prev + 0.25, 3)); // Max 300% zoom
    };

    const zoomOut = () => {
        setUserZoom(prev => Math.max(prev - 0.25, 0.25)); // Min 25% zoom
    };

    const resetZoom = () => {
        setUserZoom(1);
    };

    // Effective scale combines auto-fit scale with user zoom
    const effectiveScale = canvasScale * userZoom;
    effectiveScaleRef.current = effectiveScale;

    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / effectiveScale;
        const y = (e.clientY - rect.top) / effectiveScale;

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
        
        // Track the starting position in canvas coordinates for accurate calculation
        const activeData = event.active.data.current as { type?: string; layer?: TextLayer };
        if (activeData.type === 'layer' && activeData.layer) {
            // Get the CURRENT layer state from textLayersRef (always up-to-date)
            const currentLayer = textLayersRef.current.find(l => l.id === activeData.layer?.id);
            if (currentLayer) {
                setDragStartPos({
                    layerId: currentLayer.id,
                    x: currentLayer.x_position,
                    y: currentLayer.y_position,
                    mouseX: 0,
                    mouseY: 0,
                });
            }
        } else {
        setDragStartPos(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over, delta } = event;
        setActiveId(null);

        if (!over || !canvasRef.current) return;

        const activeData = active.data.current as { type?: string; fieldKey?: string; layer?: TextLayer };

        // Handle dragging existing layers
        if (activeData.type === 'layer' && activeData.layer) {
            const layerId = activeData.layer.id;
            
            // Get the starting position we tracked at drag start
            // This is critical for accurate positioning at any zoom level
            const startPos = dragStartPos?.layerId === layerId 
                ? { x: dragStartPos.x, y: dragStartPos.y }
                : { x: activeData.layer.x_position, y: activeData.layer.y_position };
            
            // Use effectiveScaleRef to get the current scale (avoids stale closure)
            const currentScale = effectiveScaleRef.current;
            
            // Delta is in screen pixels, convert to canvas coordinates
            // At 200% zoom, moving 100 screen pixels = 50 canvas pixels
            const deltaInCanvasX = delta.x / currentScale;
            const deltaInCanvasY = delta.y / currentScale;
            
            // New position = starting canvas position + delta in canvas coordinates
            let newX = startPos.x + deltaInCanvasX;
            let newY = startPos.y + deltaInCanvasY;
            
            // Clamp to canvas bounds
            newX = Math.max(0, Math.min(newX, width));
            newY = Math.max(0, Math.min(newY, height));
            
            updateLayer(layerId, {
                x_position: Math.round(newX),
                y_position: Math.round(newY),
            });
            
            setDragStartPos(null);
            return;
        }

        // Handle dropping new fields from sidebar
        if (over.id === 'canvas-drop-zone') {
            const containerBounds = getImageContainerBounds();
            let x = width / 2;
            let y = height / 2;
            
            // Get the over element's bounding rect for accurate drop position
            if (containerBounds) {
                // Use the activator event position + delta to get final drop position
                if (event.activatorEvent && 'clientX' in event.activatorEvent) {
                    const startX = (event.activatorEvent as MouseEvent).clientX;
                    const startY = (event.activatorEvent as MouseEvent).clientY;
                    
                    // Final mouse position = start position + delta
                    const finalMouseX = startX + delta.x;
                    const finalMouseY = startY + delta.y;
                    
                    // Calculate position relative to the canvas container
                    const relativeX = finalMouseX - containerBounds.left;
                    const relativeY = finalMouseY - containerBounds.top;
                    
                    // Convert to canvas coordinates using current scale
                    const currentScale = effectiveScaleRef.current;
                    x = relativeX / currentScale;
                    y = relativeY / currentScale;
                    
                    // Clamp to valid bounds
                    x = Math.max(0, Math.min(x, width));
                    y = Math.max(0, Math.min(y, height));
                }
            }

            const fieldKey = activeData.fieldKey;
            if (fieldKey) {
                const newLayer: TextLayer = {
                    id: `layer-${Date.now()}`,
                    name: fieldKey,
                    field_key: fieldKey,
                    x_position: Math.round(Math.max(0, Math.min(x, width))),
                    y_position: Math.round(Math.max(0, Math.min(y, height))),
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
        
        setDragStartPos(null);
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
                                            style={{ width: width * effectiveScale, height: height * effectiveScale }}
                                            data-image-container="true"
                                        >
                                            <img
                                                src={previewUrl}
                                                alt="Template preview"
                                                className="w-full h-full object-contain"
                                                style={{
                                                    width: width * effectiveScale,
                                                    height: height * effectiveScale,
                                                }}
                                            />
                                            {textLayers.map((layer) => (
                                                <TextLayerMarker
                                                    key={layer.id}
                                                    layer={layer}
                                                    onSelect={() => setSelectedLayerId(layer.id)}
                                                    onDelete={() => deleteLayer(layer.id)}
                                                    isSelected={selectedLayerId === layer.id}
                                                    scale={effectiveScale}
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
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-xs text-muted-foreground">
                                        Dimensions: {width} × {height}px | Zoom: {(effectiveScale * 100).toFixed(0)}%
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={zoomOut}
                                            disabled={userZoom <= 0.25}
                                            className="h-7 w-7 p-0"
                                            title="Zoom Out"
                                        >
                                            <ZoomOut className="h-4 w-4" />
                                        </Button>
                                        <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                                            {(userZoom * 100).toFixed(0)}%
                                        </span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={zoomIn}
                                            disabled={userZoom >= 3}
                                            className="h-7 w-7 p-0"
                                            title="Zoom In"
                                        >
                                            <ZoomIn className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={resetZoom}
                                            disabled={userZoom === 1}
                                            className="h-7 w-7 p-0 ml-1"
                                            title="Reset Zoom"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
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

                        <div className="space-y-2">
                            <Label>X Position</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    max={width}
                                    value={Math.round(selectedLayer.x_position)}
                                    onChange={(e) =>
                                        updateLayer(selectedLayer.id, {
                                            x_position: Math.max(0, Math.min(parseInt(e.target.value) || 0, width)),
                                        })
                                    }
                                    className="flex-1"
                                />
                                <span className="text-sm text-muted-foreground">px</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Y Position</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="0"
                                    max={height}
                                    value={Math.round(selectedLayer.y_position)}
                                    onChange={(e) =>
                                        updateLayer(selectedLayer.id, {
                                            y_position: Math.max(0, Math.min(parseInt(e.target.value) || 0, height)),
                                        })
                                    }
                                    className="flex-1"
                                />
                                <span className="text-sm text-muted-foreground">px</span>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground col-span-2">
                            💡 Tip: Use arrow keys to move selected field (hold Shift for 10px steps)
                        </p>

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

