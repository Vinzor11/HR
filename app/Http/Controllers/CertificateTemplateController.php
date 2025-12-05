<?php

namespace App\Http\Controllers;

use App\Models\CertificateTemplate;
use App\Models\CertificateTextLayer;
use App\Services\CertificateTemplateConverter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CertificateTemplateController extends Controller
{
    /**
     * Display a listing of certificate templates.
     */
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('access-request-types-module'), 403, 'Unauthorized action.');

        $perPage = $request->integer('perPage', 10);
        $search = (string) $request->input('search', '');

        $templates = CertificateTemplate::with('textLayers')
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('certificate-templates/index', [
            'templates' => $templates,
            'filters' => [
                'search' => $search,
                'perPage' => $perPage,
            ],
        ]);
    }

    /**
     * Show the form for creating a new certificate template.
     */
    public function create(): Response
    {
        return Inertia::render('certificate-templates/create');
    }

    /**
     * Convert uploaded file to preview image (for PDF/DOCX files)
     */
    public function preview(Request $request)
    {
        abort_unless($request->user()->can('access-request-types-module'), 403, 'Unauthorized action.');

        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,docx', 'max:10240'],
        ]);

        try {
            $converter = new CertificateTemplateConverter();
            $file = $request->file('file');
            $result = $converter->convertToImage($file);

            if (!$result) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to convert file. Please ensure Imagick, Ghostscript, or LibreOffice is installed.',
                ], 422);
            }

            // Return the preview image URL and dimensions
            // Use relative URL - the frontend will handle it correctly
            $previewUrl = Storage::disk('public')->url($result['path']);
            
            return response()->json([
                'success' => true,
                'preview_url' => $previewUrl,
                'width' => $result['width'],
                'height' => $result['height'],
                'path' => $result['path'],
            ]);
        } catch (\Exception $e) {
            \Log::error('Preview conversion failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Conversion failed: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Store a newly created certificate template.
     */
    public function store(Request $request)
    {
        abort_unless($request->user()->can('access-request-types-module'), 403, 'Unauthorized action.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'background_image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf,docx', 'max:10240'], // 10MB max, support PDF/DOCX
            'width' => ['required', 'integer', 'min:100', 'max:5000'],
            'height' => ['required', 'integer', 'min:100', 'max:5000'],
            'is_active' => ['boolean'],
            'text_layers' => ['nullable', 'array'],
            'text_layers.*.name' => ['required', 'string'],
            'text_layers.*.field_key' => ['nullable', 'string'],
            'text_layers.*.default_text' => ['nullable', 'string'],
            'text_layers.*.x_position' => ['required', 'integer'],
            'text_layers.*.y_position' => ['required', 'integer'],
            'text_layers.*.font_family' => ['nullable', 'string'],
            'text_layers.*.font_size' => ['required', 'integer', 'min:8', 'max:200'],
            'text_layers.*.font_color' => ['nullable', 'string'],
            'text_layers.*.font_weight' => ['nullable', 'string'],
            'text_layers.*.text_align' => ['nullable', 'string', 'in:left,center,right'],
            'text_layers.*.max_width' => ['nullable', 'integer'],
            'text_layers.*.sort_order' => ['nullable', 'integer'],
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $converter = new CertificateTemplateConverter();
            
            // Handle template file upload and conversion
            $backgroundImagePath = null;
            $width = $validated['width'];
            $height = $validated['height'];
            
            if ($request->hasFile('background_image')) {
                $file = $request->file('background_image');
                $converted = $converter->convertToImage($file);
                
                if ($converted) {
                    $backgroundImagePath = $converted['path'];
                    // Use converted dimensions if available
                    if ($converted['width'] > 0 && $converted['height'] > 0) {
                        $width = $converted['width'];
                        $height = $converted['height'];
                    }
                } else {
                    // Fallback: store original file
                    $backgroundImagePath = $file->store('certificate-templates/backgrounds', 'public');
                }
            }

            // Create template
            $template = CertificateTemplate::create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'background_image_path' => $backgroundImagePath,
                'width' => $width,
                'height' => $height,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            // Create text layers
            if (!empty($validated['text_layers'])) {
                foreach ($validated['text_layers'] as $index => $layerData) {
                    CertificateTextLayer::create([
                        'certificate_template_id' => $template->id,
                        'name' => $layerData['name'],
                        'field_key' => $layerData['field_key'] ?? null,
                        'default_text' => $layerData['default_text'] ?? null,
                        'x_position' => $layerData['x_position'],
                        'y_position' => $layerData['y_position'],
                        'font_family' => $layerData['font_family'] ?? 'Arial',
                        'font_size' => $layerData['font_size'],
                        'font_color' => $layerData['font_color'] ?? '#000000',
                        'font_weight' => $layerData['font_weight'] ?? 'normal',
                        'text_align' => $layerData['text_align'] ?? 'left',
                        'max_width' => $layerData['max_width'] ?? null,
                        'sort_order' => $layerData['sort_order'] ?? $index,
                    ]);
                }
            }

            return redirect()
                ->route('certificate-templates.index')
                ->with('success', 'Certificate template created successfully.');
        });
    }

    /**
     * Display the specified certificate template.
     */
    public function show(CertificateTemplate $certificateTemplate): Response
    {
        $certificateTemplate->load('textLayers');

        return Inertia::render('certificate-templates/show', [
            'template' => $certificateTemplate,
        ]);
    }

    /**
     * Show the form for editing the specified certificate template.
     */
    public function edit(CertificateTemplate $certificateTemplate): Response
    {
        $certificateTemplate->load('textLayers');

        return Inertia::render('certificate-templates/edit', [
            'template' => $certificateTemplate,
        ]);
    }

    /**
     * Update the specified certificate template.
     */
    public function update(Request $request, CertificateTemplate $certificateTemplate)
    {
        abort_unless($request->user()->can('access-request-types-module'), 403, 'Unauthorized action.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'background_image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf,docx', 'max:10240'],
            'width' => ['required', 'integer', 'min:100', 'max:5000'],
            'height' => ['required', 'integer', 'min:100', 'max:5000'],
            'is_active' => ['boolean'],
            'text_layers' => ['nullable', 'array'],
            'text_layers.*.id' => ['nullable', 'integer'],
            'text_layers.*.name' => ['required', 'string'],
            'text_layers.*.field_key' => ['nullable', 'string'],
            'text_layers.*.default_text' => ['nullable', 'string'],
            'text_layers.*.x_position' => ['required', 'integer'],
            'text_layers.*.y_position' => ['required', 'integer'],
            'text_layers.*.font_family' => ['nullable', 'string'],
            'text_layers.*.font_size' => ['required', 'integer', 'min:8', 'max:200'],
            'text_layers.*.font_color' => ['nullable', 'string'],
            'text_layers.*.font_weight' => ['nullable', 'string'],
            'text_layers.*.text_align' => ['nullable', 'string', 'in:left,center,right'],
            'text_layers.*.max_width' => ['nullable', 'integer'],
            'text_layers.*.sort_order' => ['nullable', 'integer'],
        ]);

        return DB::transaction(function () use ($validated, $request, $certificateTemplate) {
            $converter = new CertificateTemplateConverter();
            
            // Handle background image upload and conversion
            if ($request->hasFile('background_image')) {
                // Delete old image if exists
                if ($certificateTemplate->background_image_path && Storage::disk('public')->exists($certificateTemplate->background_image_path)) {
                    Storage::disk('public')->delete($certificateTemplate->background_image_path);
                }
                
                $file = $request->file('background_image');
                $converted = $converter->convertToImage($file);
                
                if ($converted) {
                    $validated['background_image_path'] = $converted['path'];
                    // Update dimensions if converted
                    if ($converted['width'] > 0 && $converted['height'] > 0) {
                        $validated['width'] = $converted['width'];
                        $validated['height'] = $converted['height'];
                    }
                } else {
                    // Fallback: store original file
                    $validated['background_image_path'] = $file->store('certificate-templates/backgrounds', 'public');
                }
            }

            // Update template
            $certificateTemplate->update([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'background_image_path' => $validated['background_image_path'] ?? $certificateTemplate->background_image_path,
                'width' => $validated['width'],
                'height' => $validated['height'],
                'is_active' => $validated['is_active'] ?? true,
            ]);

            // Sync text layers
            $existingLayerIds = collect($validated['text_layers'] ?? [])
                ->pluck('id')
                ->filter()
                ->toArray();

            // Delete layers that are not in the update
            $certificateTemplate->textLayers()
                ->whereNotIn('id', $existingLayerIds)
                ->delete();

            // Update or create layers
            if (!empty($validated['text_layers'])) {
                foreach ($validated['text_layers'] as $index => $layerData) {
                    if (isset($layerData['id'])) {
                        // Update existing layer
                        CertificateTextLayer::where('id', $layerData['id'])
                            ->where('certificate_template_id', $certificateTemplate->id)
                            ->update([
                                'name' => $layerData['name'],
                                'field_key' => $layerData['field_key'] ?? null,
                                'default_text' => $layerData['default_text'] ?? null,
                                'x_position' => $layerData['x_position'],
                                'y_position' => $layerData['y_position'],
                                'font_family' => $layerData['font_family'] ?? 'Arial',
                                'font_size' => $layerData['font_size'],
                                'font_color' => $layerData['font_color'] ?? '#000000',
                                'font_weight' => $layerData['font_weight'] ?? 'normal',
                                'text_align' => $layerData['text_align'] ?? 'left',
                                'max_width' => $layerData['max_width'] ?? null,
                                'sort_order' => $layerData['sort_order'] ?? $index,
                            ]);
                    } else {
                        // Create new layer
                        CertificateTextLayer::create([
                            'certificate_template_id' => $certificateTemplate->id,
                            'name' => $layerData['name'],
                            'field_key' => $layerData['field_key'] ?? null,
                            'default_text' => $layerData['default_text'] ?? null,
                            'x_position' => $layerData['x_position'],
                            'y_position' => $layerData['y_position'],
                            'font_family' => $layerData['font_family'] ?? 'Arial',
                            'font_size' => $layerData['font_size'],
                            'font_color' => $layerData['font_color'] ?? '#000000',
                            'font_weight' => $layerData['font_weight'] ?? 'normal',
                            'text_align' => $layerData['text_align'] ?? 'left',
                            'max_width' => $layerData['max_width'] ?? null,
                            'sort_order' => $layerData['sort_order'] ?? $index,
                        ]);
                    }
                }
            }

            return redirect()
                ->route('certificate-templates.index')
                ->with('success', 'Certificate template updated successfully.');
        });
    }

    /**
     * Remove the specified certificate template.
     */
    public function destroy(CertificateTemplate $certificateTemplate)
    {
        abort_unless(request()->user()->can('access-request-types-module'), 403, 'Unauthorized action.');

        // Check if template is being used by any request types
        $inUse = \App\Models\RequestType::where('certificate_template_id', $certificateTemplate->id)->exists();
        
        if ($inUse) {
            return redirect()
                ->route('certificate-templates.index')
                ->with('error', 'Cannot delete template that is in use by request types.');
        }

        DB::transaction(function () use ($certificateTemplate) {
            // Delete background image if exists
            if ($certificateTemplate->background_image_path && Storage::exists($certificateTemplate->background_image_path)) {
                Storage::delete($certificateTemplate->background_image_path);
            }

            // Delete text layers (cascade should handle this, but being explicit)
            $certificateTemplate->textLayers()->delete();

            // Delete template
            $certificateTemplate->delete();
        });

        return redirect()
            ->route('certificate-templates.index')
            ->with('success', 'Certificate template deleted successfully.');
    }
}
