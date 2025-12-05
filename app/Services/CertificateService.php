<?php

namespace App\Services;

use App\Models\CertificateTemplate;
use App\Models\RequestSubmission;
use App\Models\RequestAnswer;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use TCPDF;

class CertificateService
{
    // Conversion factor: pixels to points (assuming 96 DPI, 1 point = 1/72 inch)
    // 1 pixel at 96 DPI = 0.75 points
    const PIXEL_TO_POINT = 0.75;

    /**
     * Generate certificate for a request submission
     */
    public function generateCertificate(RequestSubmission $submission): ?string
    {
        $requestType = $submission->requestType;
        
        if (!$requestType->hasCertificateGeneration()) {
            Log::warning('Request type does not have certificate generation configured', [
                'submission_id' => $submission->id,
                'request_type_id' => $requestType->id,
            ]);
            return null;
        }

        $template = $requestType->certificateTemplate;
        if (!$template || !$template->is_active) {
            Log::warning('Certificate template not found or inactive', [
                'submission_id' => $submission->id,
                'template_id' => $requestType->certificate_template_id,
            ]);
            return null;
        }

        // Get all answers from the submission
        $answers = $this->getSubmissionAnswers($submission);
        
        // Get field mappings from certificate config
        $config = $requestType->certificate_config ?? [];
        $fieldMappings = $config['field_mappings'] ?? [];

        try {
            // Generate PDF certificate
            $path = $this->generatePdfCertificate($template, $answers, $fieldMappings, $submission);
            
            return $path;
        } catch (\Exception $e) {
            Log::error('Failed to generate certificate', [
                'submission_id' => $submission->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /**
     * Get all answers from submission keyed by field_key
     */
    protected function getSubmissionAnswers(RequestSubmission $submission): array
    {
        $answers = RequestAnswer::where('submission_id', $submission->id)
            ->with('field')
            ->get()
            ->keyBy(function ($answer) {
                return $answer->field->field_key ?? null;
            })
            ->map(function ($answer) {
                return $answer->value;
            })
            ->filter()
            ->toArray();

        // Add user information
        $user = $submission->user;
        if ($user) {
            $answers['user_name'] = $user->name;
            $answers['user_email'] = $user->email;
            
            // Add employee information if available
            if ($user->employee) {
                $employee = $user->employee;
                $answers['employee_full_name'] = $employee->first_name . ' ' . $employee->last_name;
                $answers['employee_first_name'] = $employee->first_name;
                $answers['employee_last_name'] = $employee->last_name;
                $answers['employee_middle_name'] = $employee->middle_name ?? '';
                $answers['employee_position'] = $employee->position->name ?? '';
                $answers['employee_department'] = $employee->department->name ?? '';
            }
        }

        // Add request information
        $answers['reference_code'] = $submission->reference_code;
        $answers['submitted_date'] = $submission->submitted_at?->format('F d, Y');
        $answers['completed_date'] = $submission->fulfilled_at?->format('F d, Y') ?? now()->format('F d, Y');
        $answers['current_date'] = now()->format('F d, Y');
        $answers['current_year'] = now()->year;

        return $answers;
    }

    /**
     * Generate PDF certificate with background image and text layers
     */
    protected function generatePdfCertificate(CertificateTemplate $template, array $answers, array $fieldMappings, RequestSubmission $submission): string
    {
        // Convert dimensions from pixels to points
        $widthInPoints = $template->width * self::PIXEL_TO_POINT;
        $heightInPoints = $template->height * self::PIXEL_TO_POINT;

        // Determine orientation based on dimensions
        $orientation = $template->width > $template->height ? 'L' : 'P';

        // Create PDF
        $pdf = new TCPDF($orientation, 'pt', [$widthInPoints, $heightInPoints], true, 'UTF-8', false);
        
        // Remove default header/footer
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        
        // Set margins to 0
        $pdf->setMargins(0, 0, 0);
        $pdf->setAutoPageBreak(false, 0);
        
        // Add background image if exists (before adding page)
        $backgroundImagePath = null;
        if ($template->background_image_path) {
            $exists = Storage::disk('public')->exists($template->background_image_path);
            $imagePath = Storage::disk('public')->path($template->background_image_path);
            
            Log::info('Checking background image', [
                'template_id' => $template->id,
                'background_image_path' => $template->background_image_path,
                'exists' => $exists,
                'full_path' => $imagePath,
                'file_exists' => file_exists($imagePath),
                'is_readable' => is_readable($imagePath),
            ]);
            
            if ($exists && file_exists($imagePath) && is_readable($imagePath)) {
                $imageInfo = @getimagesize($imagePath);
                if ($imageInfo) {
                    $backgroundImagePath = $imagePath;
                    Log::info('Background image found and valid', [
                        'width' => $imageInfo[0],
                        'height' => $imageInfo[1],
                        'mime' => $imageInfo['mime'],
                    ]);
                } else {
                    Log::warning('Invalid image file - getimagesize failed', [
                        'path' => $imagePath,
                    ]);
                }
            } else {
                Log::warning('Background image file not accessible', [
                    'path' => $template->background_image_path,
                    'full_path' => $imagePath,
                ]);
            }
        }
        
        // Add a page
        $pdf->AddPage();
        
        // Add background image as first layer (if exists)
        if ($backgroundImagePath) {
            try {
                // Determine image type from file
                $imageInfo = getimagesize($backgroundImagePath);
                $imageType = '';
                if ($imageInfo) {
                    switch ($imageInfo[2]) {
                        case IMAGETYPE_JPEG:
                            $imageType = 'JPEG';
                            break;
                        case IMAGETYPE_PNG:
                            $imageType = 'PNG';
                            break;
                        case IMAGETYPE_GIF:
                            $imageType = 'GIF';
                            break;
                    }
                }
                
                if ($imageType) {
                    // Calculate proper image dimensions
                    // Use the template dimensions converted to points
                    $imgWidth = $imageInfo[0];
                    $imgHeight = $imageInfo[1];
                    
                    // Scale image to fit the PDF page exactly
                    // Convert image pixels to points (assuming 96 DPI for the image)
                    $imgWidthInPoints = $imgWidth * self::PIXEL_TO_POINT;
                    $imgHeightInPoints = $imgHeight * self::PIXEL_TO_POINT;
                    
                    // If image dimensions don't match template, scale to fit
                    if ($imgWidthInPoints != $widthInPoints || $imgHeightInPoints != $heightInPoints) {
                        // Calculate scale to fit
                        $scaleX = $widthInPoints / $imgWidthInPoints;
                        $scaleY = $heightInPoints / $imgHeightInPoints;
                        $scale = min($scaleX, $scaleY);
                        
                        $finalWidth = $imgWidthInPoints * $scale;
                        $finalHeight = $imgHeightInPoints * $scale;
                        
                        // Center if needed
                        $x = ($widthInPoints - $finalWidth) / 2;
                        $y = ($heightInPoints - $finalHeight) / 2;
                    } else {
                        $finalWidth = $widthInPoints;
                        $finalHeight = $heightInPoints;
                        $x = 0;
                        $y = 0;
                    }
                    
                    // Add image to cover entire page
                    $pdf->Image(
                        $backgroundImagePath,  // file
                        $x,                    // x
                        $y,                    // y
                        $finalWidth,           // w
                        $finalHeight,          // h
                        $imageType,            // type
                        '',                    // link
                        '',                    // align
                        false,                 // resize
                        300,                   // dpi
                        '',                    // palign
                        false,                 // ismask
                        false,                 // imgmask
                        0,                     // border
                        false,                 // fitbox
                        false,                 // hidden
                        false                  // fitonpage
                    );
                    
                    Log::info('Background image added to PDF', [
                        'image_type' => $imageType,
                        'pdf_dimensions' => "{$widthInPoints}x{$heightInPoints}",
                        'template_dimensions' => "{$template->width}x{$template->height}",
                        'image_dimensions' => "{$imgWidth}x{$imgHeight}",
                        'final_dimensions' => "{$finalWidth}x{$finalHeight}",
                        'position' => "{$x},{$y}",
                    ]);
                } else {
                    Log::warning('Could not determine image type', [
                        'path' => $backgroundImagePath,
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Failed to add background image to PDF', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'path' => $backgroundImagePath,
                ]);
            }
        } else {
            // Fill with white if no background
            $pdf->SetFillColor(255, 255, 255);
            $pdf->Rect(0, 0, $widthInPoints, $heightInPoints, 'F');
            Log::info('No background image - filled with white');
        }

        // Render all text layers
        $textLayers = $template->textLayers;
        foreach ($textLayers as $layer) {
            $text = $this->resolveLayerText($layer, $answers, $fieldMappings, $submission);
            if ($text !== null && $text !== '') {
                $this->renderTextLayerOnPdf($pdf, $layer, $text);
            }
        }

        // Save PDF
        $directory = "certificates/{$submission->id}";
        $filename = "certificate-{$submission->reference_code}.pdf";
        $path = "{$directory}/{$filename}";

        // Ensure directory exists
        Storage::makeDirectory($directory);

        // Save PDF
        $pdfPath = Storage::path($path);
        $pdf->Output($pdfPath, 'F');

        return $path;
    }

    /**
     * Resolve text for a layer based on field mappings and answers
     */
    protected function resolveLayerText($layer, array $answers, array $fieldMappings, RequestSubmission $submission): ?string
    {
        // If layer has a field_key mapping, use it
        if ($layer->field_key) {
            // Check if there's a custom mapping in config
            $mappedKey = $fieldMappings[$layer->name] ?? $layer->field_key;
            
            if (isset($answers[$mappedKey])) {
                return (string) $answers[$mappedKey];
            }
        }

        // If layer has default_text, use it with placeholder replacement
        if ($layer->default_text) {
            $text = $layer->default_text;
            
            // Replace placeholders like {user_name}, {date}, etc.
            foreach ($answers as $key => $value) {
                $text = str_replace('{' . $key . '}', (string) $value, $text);
            }
            
            // Replace common placeholders
            $text = str_replace('{date}', $answers['current_date'] ?? now()->format('F d, Y'), $text);
            $text = str_replace('{year}', (string) ($answers['current_year'] ?? now()->year), $text);
            
            return $text;
        }

        return null;
    }

    /**
     * Render text layer on PDF
     */
    protected function renderTextLayerOnPdf(TCPDF $pdf, $layer, string $text): void
    {
        // Convert hex color to RGB
        $color = $this->hexToRgb($layer->font_color);
        
        // Convert positions from pixels to points
        $x = $layer->x_position * self::PIXEL_TO_POINT;
        $y = $layer->y_position * self::PIXEL_TO_POINT;
        $fontSize = $layer->font_size * self::PIXEL_TO_POINT;
        
        // Set font
        $fontFamily = $layer->font_family ?? 'helvetica';
        $fontWeight = $layer->font_weight ?? 'normal';
        
        // Map font families to TCPDF fonts
        $fontMap = [
            'Arial' => 'helvetica',
            'Helvetica' => 'helvetica',
            'Times' => 'times',
            'Times New Roman' => 'times',
            'Courier' => 'courier',
            'Courier New' => 'courier',
        ];
        
        $tcpdfFont = $fontMap[$fontFamily] ?? 'helvetica';
        $fontStyle = ($fontWeight === 'bold' || $fontWeight === 'b') ? 'B' : '';
        
        $pdf->SetFont($tcpdfFont, $fontStyle, $fontSize);
        $pdf->SetTextColor($color['r'], $color['g'], $color['b']);
        
        // Handle text alignment
        $align = $layer->text_align ?? 'left';
        $tcpdfAlign = $align === 'center' ? 'C' : ($align === 'right' ? 'R' : 'L');
        
        // Handle text wrapping if max_width is set
        if ($layer->max_width && $layer->max_width > 0) {
            $maxWidthInPoints = $layer->max_width * self::PIXEL_TO_POINT;
            
            // Calculate cell height for multi-line text
            $pdf->setCellHeightRatio(1.2);
            $pdf->MultiCell($maxWidthInPoints, $fontSize * 1.2, $text, 0, $tcpdfAlign, false, 1, $x, $y, true, 0, false, true, 0, 'T', false);
        } else {
            // Single line text
            $pdf->SetXY($x, $y);
            $pdf->Cell(0, $fontSize, $text, 0, 0, $tcpdfAlign, false, '', 0, false, 'T', 'M');
        }
    }

    /**
     * Convert hex color to RGB
     */
    protected function hexToRgb(string $hex): array
    {
        $hex = ltrim($hex, '#');
        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));
        
        return ['r' => $r, 'g' => $g, 'b' => $b];
    }

}

