<?php

namespace App\Console\Commands;

use App\Models\RequestSubmission;
use App\Services\CertificateService;
use Illuminate\Console\Command;

class GenerateCertificate extends Command
{
    protected $signature = 'certificate:generate {submission_id}';
    protected $description = 'Manually generate a certificate for a submission';

    public function handle(CertificateService $certificateService)
    {
        $submissionId = $this->argument('submission_id');
        
        $submission = RequestSubmission::with('requestType.certificateTemplate.textLayers')->find($submissionId);
        
        if (!$submission) {
            $this->error("Submission {$submissionId} not found");
            return 1;
        }

        $this->info("Generating certificate for submission #{$submissionId}...");
        $this->line("Status: {$submission->status}");
        $this->line("Request Type: {$submission->requestType->name}");
        
        if (!$submission->requestType->hasCertificateGeneration()) {
            $this->error("Request type does not have certificate generation configured!");
            return 1;
        }

        try {
            $certificatePath = $certificateService->generateCertificate($submission);
            
            if ($certificatePath) {
                $submission->update(['certificate_path' => $certificatePath]);
                $this->info("✅ Certificate generated successfully!");
                $this->line("Path: {$certificatePath}");
            } else {
                $this->error("❌ Certificate generation returned null. Check logs for details.");
                return 1;
            }
        } catch (\Exception $e) {
            $this->error("❌ Error: " . $e->getMessage());
            $this->line("Trace: " . $e->getTraceAsString());
            return 1;
        }

        return 0;
    }
}

