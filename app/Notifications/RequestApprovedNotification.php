<?php

namespace App\Notifications;

use App\Models\RequestSubmission;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class RequestApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public RequestSubmission $submission,
        public ?User $approver = null,
        public ?string $notes = null,
        public bool $isFinalApproval = false
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => $this->isFinalApproval ? 'request_fully_approved' : 'request_step_approved',
            'submission_id' => $this->submission->id,
            'reference_code' => $this->submission->reference_code,
            'request_type' => $this->submission->requestType?->name ?? 'Request',
            'approver_name' => $this->approver?->name,
            'notes' => $this->notes,
            'is_final' => $this->isFinalApproval,
            'message' => $this->isFinalApproval
                ? "Your request {$this->submission->reference_code} has been fully approved."
                : "Your request {$this->submission->reference_code} has been approved and moved to the next step.",
            'url' => route('requests.show', $this->submission->id),
        ];
    }
}
