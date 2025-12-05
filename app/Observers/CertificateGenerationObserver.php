<?php

namespace App\Observers;

use App\Models\RequestSubmission;
use App\Services\CertificateService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class CertificateGenerationObserver
{
    protected CertificateService $certificateService;

    public function __construct(CertificateService $certificateService)
    {
        $this->certificateService = $certificateService;
    }

    /**
     * Handle the RequestSubmission "updated" event.
     * Generate certificate when request is completed
     */
    public function updated(RequestSubmission $submission): void
    {
        // Get original status BEFORE any refresh (needed to detect status changes)
        $originalStatus = $submission->getOriginal('status');
        $newStatus = $submission->status;
        
        // Ensure requestType relationship is loaded with certificate template
        if (!$submission->relationLoaded('requestType')) {
            $submission->load('requestType.certificateTemplate');
        } elseif ($submission->requestType && !$submission->requestType->relationLoaded('certificateTemplate')) {
            $submission->requestType->load('certificateTemplate');
        }

        // Log for debugging
        Log::info('CertificateGenerationObserver: RequestSubmission updated', [
            'submission_id' => $submission->id,
            'status' => $newStatus,
            'original_status' => $originalStatus,
            'request_type_id' => $submission->request_type_id,
            'has_request_type' => $submission->requestType !== null,
        ]);

        // Only process if request type has certificate generation configured
        if (!$submission->requestType) {
            Log::warning('CertificateGenerationObserver: No requestType found', [
                'submission_id' => $submission->id,
                'request_type_id' => $submission->request_type_id,
            ]);
            return;
        }

        if (!$submission->requestType->hasCertificateGeneration()) {
            Log::debug('CertificateGenerationObserver: RequestType does not have certificate generation', [
                'submission_id' => $submission->id,
                'request_type_id' => $submission->requestType->id,
                'certificate_template_id' => $submission->requestType->certificate_template_id,
                'certificate_config' => $submission->requestType->certificate_config,
            ]);
            return;
        }

        // Generate certificate when request is completed or approved
        // This happens when:
        // 1. Request is approved and doesn't require fulfillment (status: approved)
        // 2. All approvals complete but fulfillment is required (status: fulfillment) - generate certificate now
        // 3. Request fulfillment is completed (status: completed) - regenerate if needed
        $shouldGenerate = false;
        if ($newStatus === RequestSubmission::STATUS_COMPLETED) {
            $shouldGenerate = true;
        } elseif ($newStatus === RequestSubmission::STATUS_APPROVED) {
            $shouldGenerate = true;
        } elseif ($newStatus === RequestSubmission::STATUS_FULFILLMENT) {
            $shouldGenerate = true;
        }

        Log::debug('CertificateGenerationObserver: Status check', [
            'submission_id' => $submission->id,
            'original_status' => $originalStatus,
            'new_status' => $newStatus,
            'should_generate' => $shouldGenerate,
            'has_certificate' => $submission->hasCertificate(),
        ]);

        if ($shouldGenerate) {
            // Only generate if certificate doesn't already exist
            if (!$submission->hasCertificate()) {
                Log::info('CertificateGenerationObserver: Attempting to generate certificate', [
                    'submission_id' => $submission->id,
                ]);
                $this->generateCertificate($submission);
            } else {
                Log::debug('CertificateGenerationObserver: Certificate already exists, skipping', [
                    'submission_id' => $submission->id,
                    'certificate_path' => $submission->certificate_path,
                ]);
            }
        }
    }

    /**
     * Generate certificate for submission
     */
    protected function generateCertificate(RequestSubmission $submission): void
    {
        try {
            DB::transaction(function () use ($submission) {
                $certificatePath = $this->certificateService->generateCertificate($submission);
                
                if ($certificatePath) {
                    $submission->update(['certificate_path' => $certificatePath]);
                    
                    Log::info('Certificate generated successfully', [
                        'submission_id' => $submission->id,
                        'certificate_path' => $certificatePath,
                    ]);
                } else {
                    Log::warning('Certificate generation returned null', [
                        'submission_id' => $submission->id,
                    ]);
                }
            });
        } catch (\Exception $e) {
            Log::error('Failed to generate certificate in observer', [
                'submission_id' => $submission->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
