<?php

namespace Database\Seeders;

use App\Models\CertificateTemplate;
use App\Models\CertificateTextLayer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;

class CertificateTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $sourcePath = storage_path('tmp/Cert.jpg');
        
        if (!File::exists($sourcePath)) {
            $this->command->error('Certificate image not found at: ' . $sourcePath);
            $this->command->info('Please ensure Cert.jpg exists in storage/tmp/ directory');
            return;
        }

        // Get image dimensions
        $imageInfo = getimagesize($sourcePath);
        if (!$imageInfo) {
            $this->command->error('Could not read image dimensions. Invalid image file.');
            return;
        }

        $width = $imageInfo[0];
        $height = $imageInfo[1];

        $this->command->info("Image dimensions: {$width} × {$height} pixels");

        // Move image to storage
        $destinationPath = 'certificate-templates/backgrounds/cert.jpg';
        Storage::disk('public')->put($destinationPath, File::get($sourcePath));
        
        $this->command->info("Image moved to: storage/app/public/{$destinationPath}");

        // Create certificate template
        $template = CertificateTemplate::updateOrCreate(
            ['name' => 'Default Certificate Template'],
            [
                'description' => 'Default certificate template based on Cert.jpg. Suitable for training certificates, completion certificates, and similar documents.',
                'background_image_path' => $destinationPath,
                'width' => $width,
                'height' => $height,
                'is_active' => true,
            ]
        );

        $this->command->info("Template created/updated: {$template->name} (ID: {$template->id})");

        // Delete existing text layers for this template
        $template->textLayers()->delete();

        // Create common text layers
        // These positions are estimates - you may need to adjust based on your actual certificate design
        
        $textLayers = [
            // Recipient Name - typically centered, upper-middle area
            [
                'name' => 'recipient_name',
                'field_key' => 'full_name', // Maps to request field 'full_name'
                'default_text' => null,
                'x_position' => (int) ($width / 2), // Center horizontally
                'y_position' => (int) ($height * 0.35), // About 35% from top
                'font_family' => 'Arial',
                'font_size' => 48,
                'font_color' => '#000000',
                'font_weight' => 'bold',
                'text_align' => 'center',
                'max_width' => (int) ($width * 0.8), // 80% of width for text wrapping
                'sort_order' => 1,
            ],
            // Title/Course Name - centered, middle area
            [
                'name' => 'course_title',
                'field_key' => 'training_title', // Maps to request field 'training_title'
                'default_text' => null,
                'x_position' => (int) ($width / 2),
                'y_position' => (int) ($height * 0.50), // About 50% from top
                'font_family' => 'Arial',
                'font_size' => 32,
                'font_color' => '#000000',
                'font_weight' => 'normal',
                'text_align' => 'center',
                'max_width' => (int) ($width * 0.75),
                'sort_order' => 2,
            ],
            // Completion Date - bottom area, left side
            [
                'name' => 'completion_date',
                'field_key' => null,
                'default_text' => 'Completed on {current_date}',
                'x_position' => (int) ($width * 0.15), // 15% from left
                'y_position' => (int) ($height * 0.80), // About 80% from top
                'font_family' => 'Arial',
                'font_size' => 18,
                'font_color' => '#000000',
                'font_weight' => 'normal',
                'text_align' => 'left',
                'max_width' => (int) ($width * 0.35),
                'sort_order' => 3,
            ],
            // Reference Code - bottom area, right side
            [
                'name' => 'reference_code',
                'field_key' => null,
                'default_text' => 'Reference: {reference_code}',
                'x_position' => (int) ($width * 0.65), // 65% from left
                'y_position' => (int) ($height * 0.80),
                'font_family' => 'Arial',
                'font_size' => 14,
                'font_color' => '#666666',
                'font_weight' => 'normal',
                'text_align' => 'right',
                'max_width' => (int) ($width * 0.30),
                'sort_order' => 4,
            ],
            // Year - bottom center
            [
                'name' => 'year',
                'field_key' => null,
                'default_text' => '{current_year}',
                'x_position' => (int) ($width / 2),
                'y_position' => (int) ($height * 0.90), // About 90% from top
                'font_family' => 'Arial',
                'font_size' => 20,
                'font_color' => '#000000',
                'font_weight' => 'normal',
                'text_align' => 'center',
                'max_width' => null,
                'sort_order' => 5,
            ],
        ];

        foreach ($textLayers as $layerData) {
            CertificateTextLayer::create([
                'certificate_template_id' => $template->id,
                ...$layerData,
            ]);
        }

        $this->command->info("Created " . count($textLayers) . " text layers");
        $this->command->info("Template setup complete!");
        $this->command->info("");
        $this->command->info("Next steps:");
        $this->command->info("1. Go to Requests → Certificate Templates");
        $this->command->info("2. Edit the template to adjust text layer positions if needed");
        $this->command->info("3. Configure a Request Type to use this template");
        $this->command->info("4. Map request fields to the text layers (e.g., 'full_name' → 'recipient_name')");
    }
}
