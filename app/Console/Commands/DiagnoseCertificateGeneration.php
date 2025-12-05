<?php

namespace App\Console\Commands;

use App\Models\RequestSubmission;
use App\Models\RequestType;
use Illuminate\Console\Command;

class DiagnoseCertificateGeneration extends Command
{
    protected $signature = 'certificate:diagnose {submission_id?}';
    protected $description = 'Diagnose why certificate generation is not working';

    public function handle()
    {
        $submissionId = $this->argument('submission_id');
        
        if ($submissionId) {
            $this->diagnoseSubmission($submissionId);
        } else {
            $this->diagnoseAll();
        }
    }

    protected function diagnoseSubmission($submissionId)
    {
        $submission = RequestSubmission::with('requestType.certificateTemplate.textLayers')->find($submissionId);
        
        if (!$submission) {
            $this->error("Submission {$submissionId} not found");
            return;
        }

        $this->info("=== Diagnosing Submission #{$submissionId} ===");
        $this->line("Status: {$submission->status}");
        $this->line("Reference Code: {$submission->reference_code}");
        $this->line("Certificate Path: " . ($submission->certificate_path ?? 'NULL'));
        $this->line("");

        $requestType = $submission->requestType;
        if (!$requestType) {
            $this->error("❌ Request Type not found!");
            return;
        }

        $this->info("Request Type: {$requestType->name} (ID: {$requestType->id})");
        $this->line("Certificate Template ID: " . ($requestType->certificate_template_id ?? 'NULL'));
        $this->line("Certificate Config: " . json_encode($requestType->certificate_config, JSON_PRETTY_PRINT));
        $this->line("");

        // Check hasCertificateGeneration
        $hasGeneration = $requestType->hasCertificateGeneration();
        $this->line("hasCertificateGeneration(): " . ($hasGeneration ? '✅ TRUE' : '❌ FALSE'));
        $this->line("");

        if (!$requestType->certificate_template_id) {
            $this->error("❌ certificate_template_id is NULL - Certificate generation not configured!");
            return;
        }

        $template = $requestType->certificateTemplate;
        if (!$template) {
            $this->error("❌ Certificate Template (ID: {$requestType->certificate_template_id}) not found!");
            return;
        }

        $this->info("Certificate Template: {$template->name} (ID: {$template->id})");
        $this->line("Is Active: " . ($template->is_active ? '✅ YES' : '❌ NO'));
        $this->line("Dimensions: {$template->width} × {$template->height}");
        $this->line("Background Image: " . ($template->background_image_path ?? 'NULL'));
        $this->line("Text Layers: " . $template->textLayers->count());
        $this->line("");

        // Check status
        $shouldGenerate = false;
        if ($submission->status === RequestSubmission::STATUS_COMPLETED) {
            $shouldGenerate = true;
            $this->info("✅ Status is COMPLETED - Certificate should generate");
        } elseif ($submission->status === RequestSubmission::STATUS_APPROVED) {
            $shouldGenerate = true;
            $this->info("✅ Status is APPROVED - Certificate should generate");
        } elseif ($submission->status === RequestSubmission::STATUS_FULFILLMENT) {
            $shouldGenerate = true;
            $this->info("✅ Status is FULFILLMENT - Certificate should generate");
        } else {
            $this->warn("⚠️  Status is {$submission->status} - Certificate will NOT generate");
            $this->line("Certificate only generates when status is: approved, fulfillment, or completed");
        }
        $this->line("");

        // Check if already has certificate
        if ($submission->hasCertificate()) {
            $this->info("✅ Certificate already exists: {$submission->certificate_path}");
        } else {
            $this->warn("⚠️  No certificate found");
        }
    }

    protected function diagnoseAll()
    {
        $this->info("=== Diagnosing All Request Types ===");
        
        $requestTypes = RequestType::with('certificateTemplate')->get();
        
        foreach ($requestTypes as $type) {
            $this->line("");
            $this->info("Request Type: {$type->name} (ID: {$type->id})");
            $this->line("  Certificate Template ID: " . ($type->certificate_template_id ?? 'NULL'));
            $this->line("  Certificate Config: " . ($type->certificate_config ? 'SET' : 'NULL'));
            $this->line("  hasCertificateGeneration(): " . ($type->hasCertificateGeneration() ? '✅ YES' : '❌ NO'));
            
            if ($type->certificate_template_id) {
                $template = $type->certificateTemplate;
                if ($template) {
                    $this->line("  Template: {$template->name} (Active: " . ($template->is_active ? 'YES' : 'NO') . ")");
                } else {
                    $this->error("  ❌ Template not found!");
                }
            }
        }

        $this->line("");
        $this->info("=== Recent Submissions with Certificate Generation ===");
        
        $submissions = RequestSubmission::with('requestType')
            ->whereHas('requestType', function($q) {
                $q->whereNotNull('certificate_template_id');
            })
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        foreach ($submissions as $submission) {
            $this->line("Submission #{$submission->id} - {$submission->reference_code}");
            $this->line("  Status: {$submission->status}");
            $this->line("  Request Type: {$submission->requestType->name}");
            $this->line("  Certificate: " . ($submission->certificate_path ?? 'NOT GENERATED'));
            $this->line("");
        }
    }
}

